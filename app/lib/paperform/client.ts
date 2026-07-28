/**
 * Paperform API client.
 *
 * Paperform signed file URLs expire 7 days after they are generated, so the
 * URLs captured at intake are usually stale by export time. The API mints a
 * fresh 7-day URL on every call, so we re-fetch each record's images at export.
 *
 * CRITICAL: this module never silently falls back to a stale URL. Every image
 * gets an explicit outcome, and anything that did not refresh is surfaced to
 * the caller so the export can be blocked. Silent per-record fallback is what
 * produced CSVs where some images were fresh and others were already dead.
 */

const PAPERFORM_API_BASE = "https://api.paperform.co/v1"
const MAX_ATTEMPTS = 3
const DEFAULT_RETRY_DELAY_MS = 2000

interface PaperformFile {
  url: string
  name: string
  type: string
  size: number
}

interface PaperformSubmissionData {
  [fieldKey: string]: unknown
}

interface PaperformSubmission {
  id: string
  form_id: string
  data: PaperformSubmissionData
}

export type RefreshStatus =
  | "refreshed"
  | "missing-submission-id"
  | "api-error"
  | "filename-not-matched"

export interface RefreshOutcome {
  /** The stale URL as stored in Airtable. */
  originalUrl: string
  /** Fresh signed URL, or null when the refresh failed. */
  freshUrl: string | null
  status: RefreshStatus
  /** Which record this image belongs to, for curator-facing messages. */
  recordLabel: string
  detail?: string
}

export interface RefreshInput {
  submissionId: string | null
  imageUrls: string[]
  /** Human-readable record identity, e.g. "Elise Wilson" or "Blue Morning". */
  label: string
}

function getApiKey(): string {
  const key = process.env.PAPERFORM_API_KEY
  if (!key) throw new Error("PAPERFORM_API_KEY environment variable is not set")
  return key
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Fetch a submission, retrying on rate limits and transient server errors.
 * Paperform returns 429 with a Retry-After header when throttled.
 */
async function getSubmission(submissionId: string): Promise<PaperformSubmission> {
  let lastError = ""

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response
    try {
      res = await fetch(`${PAPERFORM_API_BASE}/submissions/${submissionId}`, {
        headers: { Authorization: `Bearer ${getApiKey()}` },
        cache: "no-store",
      })
    } catch (error) {
      lastError = `network error: ${error instanceof Error ? error.message : String(error)}`
      if (attempt < MAX_ATTEMPTS) await sleep(DEFAULT_RETRY_DELAY_MS * attempt)
      continue
    }

    if (res.ok) {
      const json = await res.json()
      const submission = json?.results?.submission
      if (!submission) {
        throw new Error("Paperform API returned no submission payload")
      }
      return submission as PaperformSubmission
    }

    const retryable = res.status === 429 || res.status >= 500
    lastError = `HTTP ${res.status} ${res.statusText}`

    if (!retryable || attempt === MAX_ATTEMPTS) break

    const retryAfter = Number(res.headers.get("Retry-After"))
    const delay = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : DEFAULT_RETRY_DELAY_MS * attempt
    await sleep(delay)
  }

  throw new Error(`Paperform API error after ${MAX_ATTEMPTS} attempt(s): ${lastError}`)
}

export interface SubmissionFileIndex {
  /** Exact (decoded, lowercased) filename → URL. */
  strict: Map<string, string>
  /** Punctuation-stripped filename → URL. Empty value marks an ambiguous key. */
  loose: Map<string, string>
  /** Every filename Paperform reported, for error messages. */
  names: string[]
}

/**
 * Index every file in a submission for matching.
 * Handles both single file objects and arrays of file objects.
 */
function indexSubmissionFiles(data: PaperformSubmissionData): SubmissionFileIndex {
  const strict = new Map<string, string>()
  const loose = new Map<string, string>()
  const names: string[] = []

  const record = (file: PaperformFile) => {
    if (!file.name) return
    names.push(file.name)

    const strictKey = normalizeFilename(file.name)
    if (strictKey) strict.set(strictKey, file.url)

    const looseKey = looseFilenameKey(file.name)
    if (!looseKey) return
    // Two different files collapsing to the same loose key means we must not
    // guess between them — mark the key poisoned rather than pick one.
    loose.set(looseKey, loose.has(looseKey) ? "" : file.url)
  }

  for (const value of Object.values(data)) {
    if (value && typeof value === "object" && "url" in value && "name" in value) {
      record(value as PaperformFile)
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object" && "url" in item && "name" in item) {
          record(item as PaperformFile)
        }
      }
    }
  }

  return { strict, loose, names }
}

/**
 * Normalize a filename for matching: decode percent-escapes, drop any path,
 * and lowercase. Encoding differences between the stored URL and Paperform's
 * `name` field were a silent source of unrefreshed images.
 */
export function normalizeFilename(value: string): string {
  if (!value) return ""
  let name = value.trim()
  try {
    name = decodeURIComponent(name)
  } catch {
    // leave as-is if it isn't valid percent-encoding
  }
  const segments = name.split("/")
  return segments[segments.length - 1].toLowerCase()
}

/**
 * Punctuation-insensitive filename key.
 *
 * Paperform sanitizes the filename when it builds the file URL — `#`, `(` and
 * `)` are dropped — but the API returns the *original* filename in `name`.
 * So a file stored as "portrait#2.3.jpg" is served at ".../portrait2.3.jpg",
 * and an exact comparison never matches. That mismatch is what left images
 * un-refreshed and produced exports where only some links had been renewed.
 *
 * Collapsing both sides to alphanumerics makes the two representations meet
 * while still distinguishing genuinely different files.
 */
export function looseFilenameKey(value: string): string {
  const name = normalizeFilename(value)
  if (!name) return ""
  const dot = name.lastIndexOf(".")
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot + 1) : ""
  const squash = (s: string) => s.replace(/[^a-z0-9]/g, "")
  const squashedStem = squash(stem)
  if (!squashedStem) return ""
  return ext ? `${squashedStem}.${squash(ext)}` : squashedStem
}

/**
 * Extract the original filename from a Paperform URL.
 * URL format: https://paperform.co/file/.../filename.jpg?expires=...&signature=...
 */
export function extractFilenameFromUrl(url: string): string | null {
  try {
    const path = url.split("?")[0]
    const segments = path.split("/")
    const encoded = segments[segments.length - 1]
    if (!encoded) return null
    return decodeURIComponent(encoded)
  } catch {
    return null
  }
}

/**
 * Refresh every image URL, reporting an explicit outcome for each one.
 * Groups by submission ID so each submission costs a single API call.
 */
export async function refreshImageUrls(records: RefreshInput[]): Promise<RefreshOutcome[]> {
  const outcomes: RefreshOutcome[] = []

  // Images whose record carries no submission ID can never be refreshed.
  const bySubmission = new Map<string, Array<{ url: string; label: string }>>()

  for (const record of records) {
    const urls = record.imageUrls.filter(Boolean)
    if (urls.length === 0) continue

    if (!record.submissionId) {
      for (const url of urls) {
        outcomes.push({
          originalUrl: url,
          freshUrl: null,
          status: "missing-submission-id",
          recordLabel: record.label,
          detail: "Record has no Submission ID (Paperform), so no fresh URL can be minted.",
        })
      }
      continue
    }

    const existing = bySubmission.get(record.submissionId) ?? []
    existing.push(...urls.map((url) => ({ url, label: record.label })))
    bySubmission.set(record.submissionId, existing)
  }

  for (const [submissionId, entries] of bySubmission) {
    let index: SubmissionFileIndex
    try {
      const submission = await getSubmission(submissionId)
      index = indexSubmissionFiles(submission.data)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      for (const entry of entries) {
        outcomes.push({
          originalUrl: entry.url,
          freshUrl: null,
          status: "api-error",
          recordLabel: entry.label,
          detail: `Submission ${submissionId}: ${detail}`,
        })
      }
      continue
    }

    for (const entry of entries) {
      const filename = extractFilenameFromUrl(entry.url)

      // Exact match first, then the punctuation-insensitive fallback that
      // absorbs Paperform's URL sanitization of characters like '#' and '()'.
      let fresh: string | undefined
      if (filename) {
        fresh = index.strict.get(normalizeFilename(filename))
        if (!fresh) {
          const looseMatch = index.loose.get(looseFilenameKey(filename))
          // An empty string marks an ambiguous key — refuse to guess.
          if (looseMatch) fresh = looseMatch
        }
      }

      if (fresh) {
        outcomes.push({
          originalUrl: entry.url,
          freshUrl: fresh,
          status: "refreshed",
          recordLabel: entry.label,
        })
      } else {
        outcomes.push({
          originalUrl: entry.url,
          freshUrl: null,
          status: "filename-not-matched",
          recordLabel: entry.label,
          detail:
            `Submission ${submissionId} has no file matching "${filename ?? entry.url}". ` +
            `Files present: ${index.names.join(", ") || "none"}`,
        })
      }
    }
  }

  return outcomes
}

/** Convenience view: original URL → fresh URL, for successful refreshes only. */
export function toFreshUrlMap(outcomes: RefreshOutcome[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const outcome of outcomes) {
    if (outcome.status === "refreshed" && outcome.freshUrl) {
      map.set(outcome.originalUrl, outcome.freshUrl)
    }
  }
  return map
}

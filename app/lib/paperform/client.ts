/**
 * Paperform API client.
 * Used to retrieve fresh signed file URLs from submissions at export time.
 * Paperform signed URLs expire after 7 days, but the API returns fresh ones on every call.
 */

const PAPERFORM_API_BASE = "https://api.paperform.co/v1"

interface PaperformFile {
  url: string
  name: string
  type: string
  size: number
  width?: number
  height?: number
}

interface PaperformSubmissionData {
  [fieldKey: string]: unknown
}

interface PaperformSubmission {
  id: string
  form_id: string
  data: PaperformSubmissionData
}

function getApiKey(): string {
  const key = process.env.PAPERFORM_API_KEY
  if (!key) throw new Error("PAPERFORM_API_KEY environment variable is not set")
  return key
}

/**
 * Fetch a submission by ID from the Paperform API.
 */
async function getSubmission(submissionId: string): Promise<PaperformSubmission> {
  const res = await fetch(`${PAPERFORM_API_BASE}/submissions/${submissionId}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`Paperform API error: ${res.status} ${res.statusText}`)
  }
  const json = await res.json()
  return json.results.submission
}

/**
 * Extract all file URLs from a Paperform submission.
 * Returns a map of filename → fresh signed URL.
 * Handles both single file objects and arrays of file objects.
 */
function extractFileUrls(data: PaperformSubmissionData): Map<string, string> {
  const fileMap = new Map<string, string>()

  for (const value of Object.values(data)) {
    if (value && typeof value === "object" && "url" in value && "name" in value) {
      // Single file object
      const file = value as PaperformFile
      fileMap.set(file.name, file.url)
    } else if (Array.isArray(value)) {
      // Array of file objects
      for (const item of value) {
        if (item && typeof item === "object" && "url" in item && "name" in item) {
          const file = item as PaperformFile
          fileMap.set(file.name, file.url)
        }
      }
    }
  }

  return fileMap
}

/**
 * Extract the original filename from a Paperform URL.
 * URL format: https://paperform.co/file/s3.amazonaws.com/.../filename.jpg?expires=...
 */
export function extractFilenameFromUrl(url: string): string | null {
  try {
    const path = url.split("?")[0]
    const segments = path.split("/")
    const encoded = segments[segments.length - 1]
    return decodeURIComponent(encoded)
  } catch {
    return null
  }
}

/**
 * Given a submission ID and an existing (possibly expired) image URL,
 * return a fresh signed URL from the Paperform API.
 * Matches by filename extracted from the original URL.
 * Returns the original URL if no match is found or if submission ID is missing.
 */
export async function getFreshImageUrl(
  submissionId: string | null,
  originalUrl: string | null,
): Promise<string | null> {
  if (!originalUrl) return null
  if (!submissionId) return originalUrl

  const filename = extractFilenameFromUrl(originalUrl)
  if (!filename) return originalUrl

  const submission = await getSubmission(submissionId)
  const fileMap = extractFileUrls(submission.data)

  return fileMap.get(filename) ?? originalUrl
}

/**
 * Batch-refresh image URLs for multiple records using the Paperform API.
 * Groups records by submission ID to minimize API calls (one call per unique submission).
 * Returns a map of original URL → fresh URL.
 */
export async function batchRefreshImageUrls(
  records: Array<{ submissionId: string | null; imageUrls: string[] }>
): Promise<Map<string, string>> {
  const refreshed = new Map<string, string>()

  // Group by submission ID to avoid duplicate API calls
  const bySubmission = new Map<string, string[]>()
  for (const record of records) {
    if (!record.submissionId) continue
    const existing = bySubmission.get(record.submissionId) ?? []
    existing.push(...record.imageUrls.filter(Boolean))
    bySubmission.set(record.submissionId, existing)
  }

  // Fetch each unique submission and build the URL map
  const entries = Array.from(bySubmission.entries())
  for (const [submissionId, originalUrls] of entries) {
    try {
      const submission = await getSubmission(submissionId)
      const fileMap = extractFileUrls(submission.data)

      for (const originalUrl of originalUrls) {
        const filename = extractFilenameFromUrl(originalUrl)
        if (filename && fileMap.has(filename)) {
          refreshed.set(originalUrl, fileMap.get(filename)!)
        }
      }
    } catch (error) {
      console.error(`Failed to refresh URLs for submission ${submissionId}:`, error)
      // Silently fall back to original URLs
    }
  }

  return refreshed
}

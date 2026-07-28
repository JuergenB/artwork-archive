/**
 * Image URL expiry audit.
 *
 * Every image URL that goes into an AA export is checked before the files are
 * written. The export is blocked unless every image carries a freshly minted
 * signed URL, because a partially-refreshed export is exactly what produced
 * failed AA imports and manual image hunting for the curator.
 *
 * Two independent signals:
 *   1. Static — parse the expiry embedded in the signed URL.
 *   2. Liveness — ask the host whether the URL still resolves to the file.
 *
 * Paperform serves valid URLs as a redirect to a presigned S3 object and
 * expired ones as a redirect to its login page, so liveness is a cheap
 * redirect check with no body download.
 */

export type ImageAuditStatus =
  | "ok"
  | "expired"
  | "expires-too-soon"
  | "refresh-failed"
  | "unreachable"
  | "no-expiry"

export interface ImageAuditEntry {
  url: string
  recordLabel: string
  entityType: "artist" | "artwork"
  expiresAt: Date | null
  remainingMs: number | null
  status: ImageAuditStatus
  detail?: string
}

export interface ImageAuditReport {
  /** False when any image would ship stale — the export must not proceed. */
  ok: boolean
  checkedAt: Date
  totalImages: number
  entries: ImageAuditEntry[]
  failures: ImageAuditEntry[]
  earliestExpiry: Date | null
  latestExpiry: Date | null
  /** Gap between the earliest and latest expiry, in ms. */
  expirySpreadMs: number | null
  summary: string
}

export interface AuditInput {
  url: string
  recordLabel: string
  entityType: "artist" | "artwork"
  /** Set when the Paperform refresh already failed for this URL. */
  refreshFailure?: string
}

export interface AuditOptions {
  /**
   * Minimum lifetime an image must still have. Freshly minted Paperform URLs
   * carry 7 days; we require at least 6 so a partially-refreshed batch cannot
   * slip through.
   */
  minRemainingMs?: number
  /** Perform network liveness checks. Disabled in unit tests. */
  verifyLiveness?: boolean
  now?: Date
}

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
export const DEFAULT_MIN_REMAINING_MS = 6 * 24 * 60 * 60 * 1000

/**
 * Read the expiry out of a signed URL.
 * Handles Paperform's `expires` (unix seconds) and S3's
 * `X-Amz-Date` + `X-Amz-Expires` pair. Returns null for unsigned URLs.
 */
export function parseUrlExpiry(rawUrl: string): Date | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }

  const expires = url.searchParams.get("expires")
  if (expires) {
    const seconds = Number(expires)
    if (Number.isFinite(seconds) && seconds > 0) {
      return new Date(seconds * 1000)
    }
  }

  const amzDate = url.searchParams.get("X-Amz-Date")
  const amzExpires = url.searchParams.get("X-Amz-Expires")
  if (amzDate && amzExpires) {
    // Format: 20260319T120000Z
    const match = amzDate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/)
    const lifetime = Number(amzExpires)
    if (match && Number.isFinite(lifetime)) {
      const [, y, mo, d, h, mi, s] = match
      const signedAt = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)
      return new Date(signedAt + lifetime * 1000)
    }
  }

  return null
}

/** True when the URL is one we expect to be signed and therefore perishable. */
export function isSignedUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)
    if (url.searchParams.has("expires") || url.searchParams.has("X-Amz-Expires")) return true
    return url.hostname.endsWith("paperform.co")
  } catch {
    return false
  }
}

/**
 * Check whether a signed URL still resolves to a file.
 * Returns null when reachable, or a reason string when it is not.
 */
export async function checkLiveness(rawUrl: string): Promise<string | null> {
  let res: Response
  try {
    res = await fetch(rawUrl, { method: "GET", redirect: "manual", cache: "no-store" })
  } catch (error) {
    return `request failed: ${error instanceof Error ? error.message : String(error)}`
  }

  const location = res.headers.get("location") ?? ""

  if (location.includes("secure_file_access") || location.includes("/login")) {
    return "URL redirects to the Paperform login page — the signature has expired"
  }
  if (res.status >= 200 && res.status < 400) return null

  return `unexpected HTTP ${res.status} ${res.statusText}`
}

function classify(
  input: AuditInput,
  expiresAt: Date | null,
  now: Date,
  minRemainingMs: number,
): ImageAuditEntry {
  const base = {
    url: input.url,
    recordLabel: input.recordLabel,
    entityType: input.entityType,
    expiresAt,
    remainingMs: expiresAt ? expiresAt.getTime() - now.getTime() : null,
  }

  if (input.refreshFailure) {
    return { ...base, status: "refresh-failed", detail: input.refreshFailure }
  }

  if (!expiresAt) {
    if (isSignedUrl(input.url)) {
      return {
        ...base,
        status: "expired",
        detail: "Signed URL with no readable expiry — cannot prove it will survive the import",
      }
    }
    return { ...base, status: "no-expiry", detail: "Unsigned URL — no expiry to enforce" }
  }

  const remaining = expiresAt.getTime() - now.getTime()
  if (remaining <= 0) {
    return { ...base, status: "expired", detail: `Expired ${expiresAt.toISOString()}` }
  }
  if (remaining < minRemainingMs) {
    const days = (remaining / (24 * 60 * 60 * 1000)).toFixed(1)
    return {
      ...base,
      status: "expires-too-soon",
      detail: `Only ${days} day(s) left — this URL was not refreshed during this export`,
    }
  }

  return { ...base, status: "ok" }
}

function buildSummary(report: Omit<ImageAuditReport, "summary">): string {
  const { totalImages, failures, earliestExpiry, expirySpreadMs } = report

  if (totalImages === 0) return "No image URLs in this export."

  if (failures.length === 0) {
    const expiry = earliestExpiry
      ? earliestExpiry.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "unknown"
    const spreadMinutes = expirySpreadMs != null ? Math.round(expirySpreadMs / 60000) : 0
    return (
      `All ${totalImages} image URL(s) are freshly signed and expire ${expiry} ` +
      `(spread across the batch: ${spreadMinutes} minute(s)).`
    )
  }

  const byStatus = new Map<ImageAuditStatus, number>()
  for (const f of failures) byStatus.set(f.status, (byStatus.get(f.status) ?? 0) + 1)
  const breakdown = [...byStatus.entries()].map(([s, n]) => `${n} ${s}`).join(", ")

  return `${failures.length} of ${totalImages} image URL(s) would ship stale (${breakdown}).`
}

/**
 * Audit every image URL destined for an export.
 * `ok: false` means the export must be blocked and re-run.
 */
export async function auditImageUrls(
  inputs: AuditInput[],
  options: AuditOptions = {},
): Promise<ImageAuditReport> {
  const now = options.now ?? new Date()
  const minRemainingMs = options.minRemainingMs ?? DEFAULT_MIN_REMAINING_MS

  const entries: ImageAuditEntry[] = inputs.map((input) =>
    classify(input, parseUrlExpiry(input.url), now, minRemainingMs),
  )

  if (options.verifyLiveness) {
    await Promise.all(
      entries.map(async (entry) => {
        // Only worth a network call for URLs that look healthy so far.
        if (entry.status !== "ok") return
        const reason = await checkLiveness(entry.url)
        if (reason) {
          entry.status = "unreachable"
          entry.detail = reason
        }
      }),
    )
  }

  const failures = entries.filter((e) => e.status !== "ok" && e.status !== "no-expiry")
  const expiries = entries
    .map((e) => e.expiresAt)
    .filter((d): d is Date => d != null)
    .sort((a, b) => a.getTime() - b.getTime())

  const earliestExpiry = expiries[0] ?? null
  const latestExpiry = expiries[expiries.length - 1] ?? null
  const expirySpreadMs =
    earliestExpiry && latestExpiry ? latestExpiry.getTime() - earliestExpiry.getTime() : null

  const partial: Omit<ImageAuditReport, "summary"> = {
    ok: failures.length === 0,
    checkedAt: now,
    totalImages: entries.length,
    entries,
    failures,
    earliestExpiry,
    latestExpiry,
    expirySpreadMs,
  }

  return { ...partial, summary: buildSummary(partial) }
}

/** Curator-facing failure text, grouped by record. */
export function formatAuditFailures(report: ImageAuditReport, limit = 25): string {
  if (report.failures.length === 0) return ""

  const lines = [report.summary, ""]
  for (const failure of report.failures.slice(0, limit)) {
    lines.push(`• ${failure.recordLabel} (${failure.entityType}): ${failure.detail ?? failure.status}`)
  }
  if (report.failures.length > limit) {
    lines.push(`• …and ${report.failures.length - limit} more`)
  }
  return lines.join("\n")
}

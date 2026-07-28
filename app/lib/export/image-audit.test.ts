import { describe, it, expect } from "vitest"
import {
  auditImageUrls,
  parseUrlExpiry,
  isSignedUrl,
  formatAuditFailures,
  SEVEN_DAYS_MS,
  type AuditInput,
} from "./image-audit"

const NOW = new Date("2026-07-28T12:00:00Z")

function paperformUrl(name: string, expiresAt: Date): string {
  const seconds = Math.floor(expiresAt.getTime() / 1000)
  return `https://paperform.co/file/s3.amazonaws.com/uploads/${name}?expires=${seconds}&signature=abc123`
}

function input(overrides: Partial<AuditInput> & { url: string }): AuditInput {
  return {
    recordLabel: "Test Record",
    entityType: "artwork",
    ...overrides,
  }
}

describe("parseUrlExpiry", () => {
  it("reads Paperform's expires parameter", () => {
    const expiry = new Date("2026-08-04T12:00:00Z")
    expect(parseUrlExpiry(paperformUrl("a.jpg", expiry))?.toISOString()).toBe(expiry.toISOString())
  })

  it("reads the S3 X-Amz-Date + X-Amz-Expires pair", () => {
    const url = "https://s3.amazonaws.com/bucket/a.jpg?X-Amz-Date=20260728T120000Z&X-Amz-Expires=604800"
    expect(parseUrlExpiry(url)?.toISOString()).toBe("2026-08-04T12:00:00.000Z")
  })

  it("returns null for an unsigned URL", () => {
    expect(parseUrlExpiry("https://example.com/image.jpg")).toBeNull()
  })

  it("returns null for a malformed URL", () => {
    expect(parseUrlExpiry("not a url")).toBeNull()
  })
})

describe("isSignedUrl", () => {
  it("treats any paperform.co URL as perishable", () => {
    expect(isSignedUrl("https://paperform.co/file/x.jpg")).toBe(true)
  })

  it("treats a plain website image as permanent", () => {
    expect(isSignedUrl("https://example.com/image.jpg")).toBe(false)
  })
})

describe("auditImageUrls", () => {
  it("passes when every URL was freshly minted in this export", async () => {
    const fresh = new Date(NOW.getTime() + SEVEN_DAYS_MS)
    const report = await auditImageUrls(
      [
        input({ url: paperformUrl("a.jpg", fresh), recordLabel: "Artist A", entityType: "artist" }),
        input({ url: paperformUrl("b.jpg", fresh), recordLabel: "Piece B" }),
      ],
      { now: NOW },
    )

    expect(report.ok).toBe(true)
    expect(report.failures).toHaveLength(0)
    expect(report.totalImages).toBe(2)
    expect(report.expirySpreadMs).toBe(0)
    expect(report.summary).toContain("freshly signed")
  })

  it("blocks when one URL is already expired — the reported mixed-expiry symptom", async () => {
    const fresh = new Date(NOW.getTime() + SEVEN_DAYS_MS)
    const stale = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000)

    const report = await auditImageUrls(
      [
        input({ url: paperformUrl("fresh.jpg", fresh), recordLabel: "Piece A" }),
        input({ url: paperformUrl("stale.jpg", stale), recordLabel: "Piece B" }),
      ],
      { now: NOW },
    )

    expect(report.ok).toBe(false)
    expect(report.failures).toHaveLength(1)
    expect(report.failures[0].status).toBe("expired")
    expect(report.failures[0].recordLabel).toBe("Piece B")
  })

  it("blocks a URL that is still valid but was not refreshed this run", async () => {
    // Two days of life left: valid today, dead long before AA imports.
    const partiallyUsed = new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000)
    const report = await auditImageUrls(
      [input({ url: paperformUrl("old.jpg", partiallyUsed), recordLabel: "Piece C" })],
      { now: NOW },
    )

    expect(report.ok).toBe(false)
    expect(report.failures[0].status).toBe("expires-too-soon")
    expect(report.failures[0].detail).toContain("not refreshed")
  })

  it("blocks when the Paperform refresh itself failed", async () => {
    const fresh = new Date(NOW.getTime() + SEVEN_DAYS_MS)
    const report = await auditImageUrls(
      [
        input({
          url: paperformUrl("x.jpg", fresh),
          recordLabel: "Piece D",
          refreshFailure: "Record has no Submission ID (Paperform)",
        }),
      ],
      { now: NOW },
    )

    expect(report.ok).toBe(false)
    expect(report.failures[0].status).toBe("refresh-failed")
  })

  it("accepts unsigned URLs without an expiry", async () => {
    const report = await auditImageUrls(
      [input({ url: "https://example.com/permanent.jpg", recordLabel: "Piece E" })],
      { now: NOW },
    )

    expect(report.ok).toBe(true)
    expect(report.entries[0].status).toBe("no-expiry")
  })

  it("blocks a signed URL whose expiry cannot be read", async () => {
    const report = await auditImageUrls(
      [input({ url: "https://paperform.co/file/mystery.jpg", recordLabel: "Piece F" })],
      { now: NOW },
    )

    expect(report.ok).toBe(false)
    expect(report.failures[0].status).toBe("expired")
  })

  it("reports the spread so a mixed batch is visible at a glance", async () => {
    const a = new Date(NOW.getTime() + SEVEN_DAYS_MS)
    const b = new Date(NOW.getTime() + SEVEN_DAYS_MS + 90 * 60 * 1000)
    const report = await auditImageUrls(
      [
        input({ url: paperformUrl("a.jpg", a), recordLabel: "A" }),
        input({ url: paperformUrl("b.jpg", b), recordLabel: "B" }),
      ],
      { now: NOW },
    )

    expect(report.ok).toBe(true)
    expect(report.expirySpreadMs).toBe(90 * 60 * 1000)
    expect(report.summary).toContain("90 minute(s)")
  })

  it("handles an export with no images at all", async () => {
    const report = await auditImageUrls([], { now: NOW })
    expect(report.ok).toBe(true)
    expect(report.summary).toBe("No image URLs in this export.")
  })
})

describe("formatAuditFailures", () => {
  it("returns an empty string when nothing failed", async () => {
    const report = await auditImageUrls([], { now: NOW })
    expect(formatAuditFailures(report)).toBe("")
  })

  it("names each failing record so the curator knows what to fix", async () => {
    const stale = new Date(NOW.getTime() - 1000)
    const report = await auditImageUrls(
      [input({ url: paperformUrl("s.jpg", stale), recordLabel: "Elise Wilson", entityType: "artist" })],
      { now: NOW },
    )

    const text = formatAuditFailures(report)
    expect(text).toContain("Elise Wilson")
    expect(text).toContain("artist")
  })
})

/**
 * Filename matching between a stored Paperform URL and the filename the
 * Paperform API reports.
 *
 * The cases here are taken from a real blocked export run: Paperform strips
 * characters like '#', '(' and ')' when it builds the file URL but returns the
 * original filename from the API, so exact matching missed 42 of 62 images and
 * the old client silently shipped the stale URLs.
 */

import { describe, it, expect } from "vitest"
import {
  extractFilenameFromUrl,
  normalizeFilename,
  looseFilenameKey,
} from "./client"

describe("extractFilenameFromUrl", () => {
  it("pulls the filename out of a signed Paperform URL", () => {
    const url = "https://paperform.co/file/s3.amazonaws.com/uploads/image%201.jpg?expires=123&signature=x"
    expect(extractFilenameFromUrl(url)).toBe("image 1.jpg")
  })

  it("returns null for an empty trailing segment", () => {
    expect(extractFilenameFromUrl("https://paperform.co/file/")).toBeNull()
  })
})

describe("normalizeFilename", () => {
  it("decodes, drops the path and lowercases", () => {
    expect(normalizeFilename("uploads/My%20Photo.JPG")).toBe("my photo.jpg")
  })

  it("survives an invalid percent-escape", () => {
    expect(normalizeFilename("100%.jpg")).toBe("100%.jpg")
  })
})

describe("looseFilenameKey", () => {
  it("matches across the parentheses Paperform strips from URLs", () => {
    // URL says "image 1.jpg"; the API says "image (1).jpg"
    expect(looseFilenameKey("image 1.jpg")).toBe(looseFilenameKey("image (1).jpg"))
  })

  it("matches across a stripped '#' and differing case", () => {
    expect(looseFilenameKey("JOAS NEBE-PORTRAIT2.3. Kopie.jpeg")).toBe(
      looseFilenameKey("joas nebe-portrait#2.3. kopie.jpeg"),
    )
  })

  it("matches a numbered duplicate upload", () => {
    expect(looseFilenameKey("strawberry shortcake snatch 2.jpg")).toBe(
      looseFilenameKey("strawberry shortcake snatch (2).jpg"),
    )
  })

  it("still separates genuinely different files", () => {
    expect(looseFilenameKey("sunrise.jpg")).not.toBe(looseFilenameKey("sunset.jpg"))
  })

  it("keeps the extension significant", () => {
    expect(looseFilenameKey("piece.jpg")).not.toBe(looseFilenameKey("piece.png"))
  })

  it("does not collapse different numbers together", () => {
    expect(looseFilenameKey("piece (1).jpg")).not.toBe(looseFilenameKey("piece (2).jpg"))
  })

  it("returns an empty key when nothing alphanumeric survives", () => {
    expect(looseFilenameKey("---.jpg")).toBe("")
    expect(looseFilenameKey("")).toBe("")
  })
})

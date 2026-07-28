/**
 * Controlled-vocabulary handling.
 *
 * A real export shipped Type="FilmVideo" while AA's template requires
 * "Film/Video" — the kind of drift that makes AA reject records on import.
 */

import { describe, it, expect } from "vitest"
import { AA_ARTWORK_COLUMNS, AA_ARTWORK_TYPES, allowedValuesFor } from "@/lib/aa-columns"
import { aaEnumNormalize } from "./transforms"
import { validateArtworkRows, formatViolations } from "./template-validation"

function artworkRow(overrides: Record<number, string> = {}): string[] {
  const row = new Array<string>(AA_ARTWORK_COLUMNS.length).fill("")
  row[0] = "Test Piece"
  for (const [index, value] of Object.entries(overrides)) row[Number(index)] = value
  return row
}

describe("allowedValuesFor", () => {
  it("reads AA's Type vocabulary out of the helper row", () => {
    expect(AA_ARTWORK_TYPES).toContain("Film/Video")
    expect(AA_ARTWORK_TYPES).toContain("Work on Paper")
    expect(AA_ARTWORK_TYPES).toHaveLength(27)
  })

  it("returns null for a free-text column", () => {
    // Col 0 = Piece Name, no controlled vocabulary
    expect(allowedValuesFor(AA_ARTWORK_COLUMNS[0])).toBeNull()
  })
})

describe("aaEnumNormalize", () => {
  it("snaps the real-world 'FilmVideo' onto AA's 'Film/Video'", () => {
    expect(aaEnumNormalize("FilmVideo", AA_ARTWORK_TYPES)).toBe("Film/Video")
  })

  it("fixes case and spacing drift", () => {
    expect(aaEnumNormalize("work on paper", AA_ARTWORK_TYPES)).toBe("Work on Paper")
    expect(aaEnumNormalize("  MIXED MEDIA  ", AA_ARTWORK_TYPES)).toBe("Mixed Media")
  })

  it("leaves an already-correct value untouched", () => {
    expect(aaEnumNormalize("Painting", AA_ARTWORK_TYPES)).toBe("Painting")
  })

  it("passes an unrecognised value through rather than inventing a category", () => {
    expect(aaEnumNormalize("Interpretive Dance", AA_ARTWORK_TYPES)).toBe("Interpretive Dance")
  })

  it("handles empty input", () => {
    expect(aaEnumNormalize(null, AA_ARTWORK_TYPES)).toBe("")
    expect(aaEnumNormalize("   ", AA_ARTWORK_TYPES)).toBe("")
  })
})

describe("validateArtworkRows", () => {
  it("passes a row using AA's exact vocabulary", () => {
    expect(validateArtworkRows([artworkRow({ 5: "Painting" })])).toEqual([])
  })

  it("flags a value outside AA's list", () => {
    const violations = validateArtworkRows([artworkRow({ 5: "Interpretive Dance" })])
    expect(violations).toHaveLength(1)
    expect(violations[0].columnName).toBe("Type")
    expect(violations[0].recordLabel).toBe("Test Piece")
  })

  it("ignores empty values — a blank column is not a violation", () => {
    expect(validateArtworkRows([artworkRow({ 5: "" })])).toEqual([])
  })
})

describe("formatViolations", () => {
  it("returns null when everything conforms", () => {
    expect(formatViolations([])).toBeNull()
  })

  it("groups records sharing the same bad value", () => {
    const rows = [
      artworkRow({ 5: "Interpretive Dance" }),
      artworkRow({ 5: "Interpretive Dance" }),
    ]
    rows[1][0] = "Second Piece"

    const text = formatViolations(validateArtworkRows(rows))
    expect(text).toContain("2 value(s)")
    expect(text).toContain("Test Piece")
    expect(text).toContain("Second Piece")
    expect(text).toContain("AA allows:")
  })
})

/**
 * Locks the AA column registry to Artwork Archive's actual import templates.
 *
 * The fixtures are generated straight from the .xlsx files AA supplies:
 *   python3 scripts/extract-aa-template.py <template.xlsx> <artist|artwork> <out.json>
 *
 * If AA ships a revised template, re-run the extractor and this test will
 * report every header and helper-text change instead of the drift reaching
 * a CSV that Justin's team has to reject.
 */

import { describe, it, expect } from "vitest"
import { AA_ARTIST_COLUMNS, AA_ARTWORK_COLUMNS, type AAColumn } from "./aa-columns"
import artistTemplate from "./export/__fixtures__/aa-template-artist.json"
import artworkTemplate from "./export/__fixtures__/aa-template-artwork.json"

interface TemplateColumn {
  index: number
  name: string
  helperText: string
}

function compare(registry: AAColumn[], template: { columns: TemplateColumn[] }) {
  const nameMismatches: string[] = []
  const helperMismatches: string[] = []

  const max = Math.max(registry.length, template.columns.length)
  for (let i = 0; i < max; i++) {
    const ours = registry[i]
    const theirs = template.columns[i]
    if (!ours || !theirs) continue
    if (ours.name !== theirs.name) {
      nameMismatches.push(`col ${i}: ours=${JSON.stringify(ours.name)} template=${JSON.stringify(theirs.name)}`)
    }
    if (ours.helperText !== theirs.helperText) {
      helperMismatches.push(`col ${i} (${theirs.name}): ours=${JSON.stringify(ours.helperText)} template=${JSON.stringify(theirs.helperText)}`)
    }
  }

  return { nameMismatches, helperMismatches }
}

describe("AA artist column registry", () => {
  it("has the same column count as AA's Contacts template", () => {
    expect(AA_ARTIST_COLUMNS.length).toBe(artistTemplate.columnCount)
  })

  it("matches AA's Contacts template header row exactly", () => {
    expect(compare(AA_ARTIST_COLUMNS, artistTemplate).nameMismatches).toEqual([])
  })

  it("matches AA's Contacts template helper row exactly", () => {
    expect(compare(AA_ARTIST_COLUMNS, artistTemplate).helperMismatches).toEqual([])
  })
})

describe("AA artwork column registry", () => {
  it("has the same column count as AA's Pieces template", () => {
    expect(AA_ARTWORK_COLUMNS.length).toBe(artworkTemplate.columnCount)
  })

  it("matches AA's Pieces template header row exactly", () => {
    expect(compare(AA_ARTWORK_COLUMNS, artworkTemplate).nameMismatches).toEqual([])
  })

  it("matches AA's Pieces template helper row exactly", () => {
    expect(compare(AA_ARTWORK_COLUMNS, artworkTemplate).helperMismatches).toEqual([])
  })
})

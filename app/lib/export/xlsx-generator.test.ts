/**
 * Verifies that the Excel export really is AA's own template with our rows
 * appended — index row, header row and helper row intact, data starting at
 * row 4, and identical values to the CSV path.
 */

import { describe, it, expect } from "vitest"
import ExcelJS from "exceljs"
import { generateArtistXlsx, generateArtworkXlsx, cellToString } from "./xlsx-generator"
import { buildArtistCsvRow, buildArtworkCsvRow } from "./csv-generator"
import { AA_TEMPLATES } from "./aa-templates"
import type { EnrichedArtist, EnrichedArtwork } from "./enrichment"

const artist = {
  id: "recArtist1",
  firstName: "Elise",
  lastName: "Wilson",
  email: "elise@example.com",
  bio: "Painter based in Asheville.",
  website: "example.com",
  city: "asheville",
  state: "North Carolina",
  groups: "2026 : Rolling Submissions",
  contactImageUrl: "https://paperform.co/file/headshot.jpg?expires=1&signature=x",
  partnerOrgs: [],
  exhibitionHistory: "",
  aaGroups: null,
} as unknown as EnrichedArtist

const artwork = {
  id: "recArtwork1",
  pieceName: "Blue Morning",
  artistFirstName: "Elise",
  artistLastName: "Wilson",
  medium: "Oil on canvas",
  type: "Painting",
  description: "A quiet study, 24 x 36 inches.",
  collections: "2026 : Rolling Submissions",
  pieceImageUrls: "https://paperform.co/file/piece.jpg?expires=1&signature=x",
  partnerOrgs: [],
} as unknown as EnrichedArtwork

async function readBack(buffer: Buffer, sheetName: string) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as unknown as ArrayBuffer)
  const ws = wb.getWorksheet(sheetName) ?? wb.worksheets[0]
  if (!ws) throw new Error("no worksheet in generated workbook")
  return ws
}

function cellText(ws: ExcelJS.Worksheet, row: number, col: number): string {
  return cellToString(ws.getRow(row).getCell(col).value)
}

describe("artist Excel export", () => {
  it("preserves AA's header and helper rows and starts data at row 4", async () => {
    const template = AA_TEMPLATES.artist
    const ws = await readBack(await generateArtistXlsx([artist]), template.sheetName)

    expect(cellText(ws, template.headerRow, 1)).toBe("First Name / Company Name")
    expect(cellText(ws, template.headerRow, 40)).toBe("Pinterest URL")
    expect(cellText(ws, template.helperRow, 1)).toBe("Required")
    expect(template.firstDataRow).toBe(4)
    expect(cellText(ws, 4, 1)).toBe("Elise")
    expect(cellText(ws, 4, 2)).toBe("Wilson")
  })

  it("writes every column exactly as the CSV builder does", async () => {
    const template = AA_TEMPLATES.artist
    const ws = await readBack(await generateArtistXlsx([artist]), template.sheetName)
    const expected = buildArtistCsvRow(artist)

    for (let i = 0; i < expected.length; i++) {
      expect(cellText(ws, template.firstDataRow, i + 1)).toBe(expected[i])
    }
  })

  it("appends one row per record", async () => {
    const template = AA_TEMPLATES.artist
    const ws = await readBack(await generateArtistXlsx([artist, artist, artist]), template.sheetName)

    expect(cellText(ws, template.firstDataRow + 2, 1)).toBe("Elise")
    expect(cellText(ws, template.firstDataRow + 3, 1)).toBe("")
  })
})

describe("artwork Excel export", () => {
  it("preserves AA's header and helper rows", async () => {
    const template = AA_TEMPLATES.artwork
    const ws = await readBack(await generateArtworkXlsx([artwork]), template.sheetName)

    expect(cellText(ws, template.headerRow, 1)).toBe("Piece Name")
    expect(cellText(ws, template.headerRow, 69)).toBe("Additional File Filename or URL")
    expect(cellText(ws, template.helperRow, 1)).toBe("Name of artwork goes here")
    expect(cellText(ws, template.firstDataRow, 1)).toBe("Blue Morning")
  })

  it("writes every column exactly as the CSV builder does", async () => {
    const template = AA_TEMPLATES.artwork
    const ws = await readBack(
      await generateArtworkXlsx([artwork], { dimensionsInNotes: true }),
      template.sheetName,
    )
    const expected = buildArtworkCsvRow(artwork, { dimensionsInNotes: true })

    for (let i = 0; i < expected.length; i++) {
      expect(cellText(ws, template.firstDataRow, i + 1)).toBe(expected[i])
    }
  })

  it("keeps the image URL in the Piece Image column", async () => {
    const template = AA_TEMPLATES.artwork
    const ws = await readBack(await generateArtworkXlsx([artwork]), template.sheetName)
    expect(cellText(ws, template.firstDataRow, 68)).toContain("paperform.co/file/piece.jpg")
  })
})

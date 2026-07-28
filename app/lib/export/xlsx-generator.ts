/**
 * Excel (.xlsx) generation for Artwork Archive export.
 *
 * Rather than building a spreadsheet that imitates AA's template, we open the
 * actual template file AA supplied and append our data rows to it. The index
 * row, header row, helper/instruction row, column widths and cell formatting
 * are therefore AA's own, byte for byte — there is nothing for our code to get
 * out of step with.
 *
 * Template layout (see scripts/extract-aa-template.py):
 *   Row 1  numeric column index
 *   Row 2  column headers
 *   Row 3  helper / instruction text
 *   Row 4+ data  ← we write here
 *
 * Row data comes from the same builders the CSV path uses, so both formats
 * always carry identical values.
 */

import ExcelJS from "exceljs"
import { AA_TEMPLATES, templateFilePath, type AAEntityType } from "./aa-templates"
import { buildArtistCsvRow, buildArtworkCsvRow, type ArtworkRowOptions } from "./csv-generator"
import type { EnrichedArtist, EnrichedArtwork } from "./enrichment"

/**
 * Coerce an exceljs cell value to plain text.
 * AA's templates use rich-text and formula cells in places (the index row is
 * formulas, several headers are rich text), which come back as objects.
 */
export function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (value instanceof Date) return value.toISOString()

  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? "").join("")
    }
    if ("formula" in value || "sharedFormula" in value) {
      const result = (value as { result?: unknown }).result
      return result == null ? "" : String(result)
    }
    if ("text" in value && typeof value.text === "string") return value.text
    if ("error" in value) return String(value.error)
  }

  return String(value)
}

async function loadTemplate(entityType: AAEntityType) {
  const template = AA_TEMPLATES[entityType]
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(templateFilePath(entityType))

  const worksheet = workbook.getWorksheet(template.sheetName) ?? workbook.worksheets[0]
  if (!worksheet) {
    throw new Error(`Template ${template.provenance.fileName} has no worksheet`)
  }

  // Guard: if AA reshapes the template, fail loudly instead of writing a file
  // whose columns silently no longer line up with our row builders.
  const headerRow = worksheet.getRow(template.headerRow)
  const actualHeaders = template.columns.map((col) =>
    cellToString(headerRow.getCell(col.index + 1).value),
  )
  const mismatch = template.columns.findIndex((col, i) => col.name !== actualHeaders[i])
  if (mismatch >= 0) {
    throw new Error(
      `Template ${template.provenance.fileName} column ${mismatch} is ` +
        `"${actualHeaders[mismatch]}" but the registry expects "${template.columns[mismatch].name}". ` +
        `Re-run scripts/extract-aa-template.py against the new template.`,
    )
  }

  return { workbook, worksheet, template }
}

function writeRows(
  worksheet: ExcelJS.Worksheet,
  firstDataRow: number,
  rows: string[][],
): void {
  rows.forEach((row, i) => {
    const target = worksheet.getRow(firstDataRow + i)
    row.forEach((value, colIndex) => {
      // exceljs columns are 1-indexed.
      target.getCell(colIndex + 1).value = value === "" ? null : value
    })
    target.commit()
  })
}

export async function generateArtistXlsx(artists: EnrichedArtist[]): Promise<Buffer> {
  const { workbook, worksheet, template } = await loadTemplate("artist")
  writeRows(worksheet, template.firstDataRow, artists.map(buildArtistCsvRow))
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function generateArtworkXlsx(
  artworks: EnrichedArtwork[],
  options: ArtworkRowOptions = {},
): Promise<Buffer> {
  const { workbook, worksheet, template } = await loadTemplate("artwork")
  writeRows(
    worksheet,
    template.firstDataRow,
    artworks.map((aw) => buildArtworkCsvRow(aw, options)),
  )
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

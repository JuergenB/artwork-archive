/**
 * Validates generated rows against Artwork Archive's own column rules.
 *
 * AA's templates declare closed vocabularies in their helper row. A value
 * outside that list is what makes AA's importer reject or mangle a record, and
 * it is invisible to us unless we check. This reports drift rather than
 * rewriting it, so the curator can see exactly which records need attention.
 */

import {
  AA_ARTIST_COLUMNS,
  AA_ARTWORK_COLUMNS,
  allowedValuesFor,
  type AAColumn,
} from "@/lib/aa-columns"

export interface VocabularyViolation {
  entityType: "artist" | "artwork"
  columnIndex: number
  columnName: string
  value: string
  allowed: string[]
  /** Row identity — first column of the row (piece name / first name). */
  recordLabel: string
}

function validate(
  rows: string[][],
  columns: AAColumn[],
  entityType: "artist" | "artwork",
): VocabularyViolation[] {
  const violations: VocabularyViolation[] = []

  const vocabularies = columns
    .map((column) => ({ column, allowed: allowedValuesFor(column) }))
    .filter((entry): entry is { column: AAColumn; allowed: string[] } => entry.allowed != null)

  for (const row of rows) {
    const recordLabel = row[0] || "(unnamed record)"
    for (const { column, allowed } of vocabularies) {
      const value = row[column.index]
      if (!value) continue
      if (allowed.includes(value)) continue
      violations.push({
        entityType,
        columnIndex: column.index,
        columnName: column.name,
        value,
        allowed,
        recordLabel,
      })
    }
  }

  return violations
}

export function validateArtistRows(rows: string[][]): VocabularyViolation[] {
  return validate(rows, AA_ARTIST_COLUMNS, "artist")
}

export function validateArtworkRows(rows: string[][]): VocabularyViolation[] {
  return validate(rows, AA_ARTWORK_COLUMNS, "artwork")
}

/** Curator-facing summary, grouped by column and value. */
export function formatViolations(violations: VocabularyViolation[], limit = 10): string | null {
  if (violations.length === 0) return null

  const grouped = new Map<string, { violation: VocabularyViolation; records: string[] }>()
  for (const violation of violations) {
    const key = `${violation.entityType}:${violation.columnIndex}:${violation.value}`
    const existing = grouped.get(key)
    if (existing) existing.records.push(violation.recordLabel)
    else grouped.set(key, { violation, records: [violation.recordLabel] })
  }

  const lines = [
    `${violations.length} value(s) do not match Artwork Archive's allowed list and may be rejected on import:`,
  ]
  for (const { violation, records } of grouped.values()) {
    const shown = records.slice(0, limit).join(", ")
    const more = records.length > limit ? ` …and ${records.length - limit} more` : ""
    lines.push(
      `• ${violation.columnName} = "${violation.value}" (${records.length} record(s): ${shown}${more}). ` +
        `AA allows: ${violation.allowed.join(", ")}`,
    )
  }
  return lines.join("\n")
}

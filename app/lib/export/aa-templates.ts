/**
 * Artwork Archive import template registry + provenance.
 *
 * Every export is built from one of the .xlsx templates AA supplied to us.
 * Those files live in `lib/export/templates/` (copies of the originals under
 * `docs/knowledge/artwork archive formats/`) and their column contract is
 * mirrored into JSON fixtures by `scripts/extract-aa-template.py`.
 *
 * Provenance here is what Kirsten sees in the export UI and what goes into the
 * email to AA, so she can confirm which template revision an export was built
 * against without opening any files.
 *
 * NOTE ON DATES: `revisedAt` comes from the workbook's own docProps/core.xml
 * (`dcterms:modified`) — the date *Artwork Archive* last edited the template.
 * Filesystem mtimes only say when the file landed in our repo and are useless
 * for this purpose.
 */

import path from "node:path"
import artistTemplate from "./__fixtures__/aa-template-artist.json"
import artworkTemplate from "./__fixtures__/aa-template-artwork.json"

export type AAEntityType = "artist" | "artwork"

export interface TemplateProvenance {
  fileName: string
  repoPath: string
  revisionLabel: string
  revisedAt: string | null
  createdAt: string | null
  author: string | null
  sha256: string
  sizeBytes: number
}

export interface AATemplate {
  entityType: AAEntityType
  provenance: TemplateProvenance
  sheetName: string
  headerRow: number
  helperRow: number
  firstDataRow: number
  columnCount: number
  columns: Array<{ index: number; name: string; helperText: string }>
}

export const AA_TEMPLATES: Record<AAEntityType, AATemplate> = {
  artist: artistTemplate as AATemplate,
  artwork: artworkTemplate as AATemplate,
}

/** Absolute path to the .xlsx we generate Excel exports from. */
export function templateFilePath(entityType: AAEntityType): string {
  return path.join(
    process.cwd(),
    "lib",
    "export",
    "templates",
    AA_TEMPLATES[entityType].provenance.fileName,
  )
}

/** `2026-01-14T00:01:31Z` → `January 14, 2026`. Returns null when unknown. */
export function formatRevisionDate(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

/** Short hash for display — full hash stays in the fixture. */
export function shortHash(sha256: string): string {
  return sha256.slice(0, 12)
}

export interface TemplateSummary {
  entityType: AAEntityType
  fileName: string
  repoPath: string
  revisionLabel: string
  revisedOn: string | null
  columnCount: number
  sha256Short: string
}

export function templateSummary(entityType: AAEntityType): TemplateSummary {
  const tpl = AA_TEMPLATES[entityType]
  return {
    entityType,
    fileName: tpl.provenance.fileName,
    repoPath: tpl.provenance.repoPath,
    revisionLabel: tpl.provenance.revisionLabel,
    revisedOn: formatRevisionDate(tpl.provenance.revisedAt),
    columnCount: tpl.columnCount,
    sha256Short: shortHash(tpl.provenance.sha256),
  }
}

export function allTemplateSummaries(): TemplateSummary[] {
  return [templateSummary("artist"), templateSummary("artwork")]
}

/**
 * Human-readable provenance block for the email to Artwork Archive.
 * Tells them precisely which of their own templates we built against.
 */
export function templateProvenanceForEmail(): string {
  const lines = ["This export was created using the following Artwork Archive templates:"]
  for (const s of allTemplateSummaries()) {
    const label = s.entityType === "artist" ? "Contacts" : "Pieces"
    const revised = s.revisedOn ? `revised ${s.revisedOn}` : "revision date unknown"
    lines.push(`  • ${label}: ${s.fileName} (${revised}, ${s.columnCount} columns)`)
  }
  lines.push(
    "If you have issued a newer template revision, send it over and we will regenerate against it.",
  )
  return lines.join("\n")
}

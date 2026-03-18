import { getFieldMappings } from "@/lib/airtable/client"
import { AA_ARTIST_COLUMNS, AA_ARTWORK_COLUMNS } from "@/lib/aa-columns"
import { columns } from "./columns"
import { DataTable } from "./data-table"
import type { MappingRow } from "./columns"

export const dynamic = "force-dynamic"

export default async function FieldMappingsPage() {
  const mappings = await getFieldMappings()

  // Define sort order for transform inputs within each target column
  // Lower number = appears first within the group
  const transformInputOrder: Record<string, number> = {
    // Artist Notes builder order (from spec)
    "(notes_builder)": 0,
    "Artist Statement": 1,
    "Artist Profile (AI)": 2,
    "Artist Summary (AI)": 3,
    "AI Tags": 4,
    "Social Profiles (AI)": 5,
    "Instagram URL": 6,
    "Facebook URL": 7,
    "Twitter URL": 8,
    "LinkedIn URL": 9,
    "Pinterest URL": 10,
    // Artwork Notes builder order
    "Relevance Hypothesis (AI)": 1,
    "Link to Purchase URL": 2,
    // Artwork field_concatenate inputs
    "Medium (AI)": 1,
    "Subject Matter (AI)": 1,
    // Artwork dimension_format input
    "Dimensions Unit (AI)": 1,
  }

  // Group mappings by "entityType|targetColumn" — supports multiple sources per target
  const mappingsByTarget = new Map<string, typeof mappings>()
  for (const m of mappings) {
    const key = `${m.entityType}|${m.targetColumn}`
    const existing = mappingsByTarget.get(key) ?? []
    existing.push(m)
    mappingsByTarget.set(key, existing)
  }

  // Sort each group: primary mappings first, then transform inputs in defined order
  for (const [, group] of mappingsByTarget) {
    group.sort((a, b) => {
      const aIsInput = a.notes?.startsWith("Transform input:") ?? false
      const bIsInput = b.notes?.startsWith("Transform input:") ?? false
      if (aIsInput !== bIsInput) return aIsInput ? 1 : -1 // primary first
      const orderA = transformInputOrder[a.sourceField ?? ""] ?? 50
      const orderB = transformInputOrder[b.sourceField ?? ""] ?? 50
      return orderA - orderB
    })
  }

  // Track which mappings have been placed (to find any that don't match an AA column)
  const placedMappingIds = new Set<string>()

  // Build rows: start with AA columns, expand multi-source mappings
  const allColumns = [...AA_ARTIST_COLUMNS, ...AA_ARTWORK_COLUMNS]
  const rows: MappingRow[] = []

  for (const col of allColumns) {
    const key = `${col.entityType}|${col.name}`
    const targetMappings = mappingsByTarget.get(key)

    if (!targetMappings || targetMappings.length === 0) {
      // Unmapped AA column
      rows.push({
        aaColumn: col.name,
        aaColumnIndex: col.index,
        entityType: col.entityType,
        sourceField: null,
        transform: null,
        writeBack: false,
        active: false,
        notes: null,
        defaultValue: null,
        isMapped: false,
        isTransformInput: false,
      })
    } else {
      // One or more Airtable fields map to this AA column
      for (let i = 0; i < targetMappings.length; i++) {
        const m = targetMappings[i]
        placedMappingIds.add(m.id)
        const isInput = targetMappings.length > 1 && (m.notes?.startsWith("Transform input:") ?? false)
        rows.push({
          aaColumn: col.name,
          aaColumnIndex: col.index,
          entityType: col.entityType,
          sourceField: m.sourceField ?? null,
          transform: m.transform ?? null,
          writeBack: m.writeBack ?? false,
          active: m.active ?? false,
          notes: m.notes ?? null,
          defaultValue: m.defaultValue ?? null,
          isMapped: true,
          isTransformInput: isInput,
        })
      }
    }
  }

  const artistMapped = rows.filter((r) => r.entityType === "artist" && r.isMapped).length
  const artworkMapped = rows.filter((r) => r.entityType === "artwork" && r.isMapped).length
  const totalMapped = artistMapped + artworkMapped

  return (
    <div className="p-8">
      <div className="max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Field Mappings
          </h1>
          <p className="mt-2 text-muted-foreground">
            Artwork Archive CSV columns mapped to Airtable source fields.{" "}
            {totalMapped} source fields mapped across {AA_ARTIST_COLUMNS.length + AA_ARTWORK_COLUMNS.length} AA columns
            {" "}({artistMapped} artist, {artworkMapped} artwork).
          </p>
        </div>
        <DataTable columns={columns} data={rows} />
      </div>
    </div>
  )
}

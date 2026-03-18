import { getFieldMappings } from "@/lib/airtable/client"
import { AA_ARTIST_COLUMNS, AA_ARTWORK_COLUMNS } from "@/lib/aa-columns"
import { columns } from "./columns"
import { DataTable } from "./data-table"
import type { MappingRow } from "./columns"

export const dynamic = "force-dynamic"

export default async function FieldMappingsPage() {
  const mappings = await getFieldMappings()

  // Build lookup: "entityType|targetColumn" → mapping
  const mappingLookup = new Map(
    mappings.map((m) => [`${m.entityType}|${m.targetColumn}`, m])
  )

  // Merge AA column registry with Airtable mappings
  const allColumns = [...AA_ARTIST_COLUMNS, ...AA_ARTWORK_COLUMNS]
  const rows: MappingRow[] = allColumns.map((col) => {
    const mapping = mappingLookup.get(`${col.entityType}|${col.name}`)
    return {
      aaColumn: col.name,
      aaColumnIndex: col.index,
      entityType: col.entityType,
      sourceField: mapping?.sourceField ?? null,
      transform: mapping?.transform ?? null,
      writeBack: mapping?.writeBack ?? false,
      active: mapping?.active ?? false,
      notes: mapping?.notes ?? null,
      defaultValue: mapping?.defaultValue ?? null,
      isMapped: !!mapping,
    }
  })

  const artistCount = AA_ARTIST_COLUMNS.length
  const artworkCount = AA_ARTWORK_COLUMNS.length
  const mappedCount = rows.filter((r) => r.isMapped).length

  return (
    <div className="p-8">
      <div className="max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Field Mappings
          </h1>
          <p className="mt-2 text-muted-foreground">
            Artwork Archive CSV columns mapped to Airtable source fields.{" "}
            {mappedCount} of {rows.length} columns mapped
            {" "}({artistCount} artist, {artworkCount} artwork).
          </p>
        </div>
        <DataTable columns={columns} data={rows} />
      </div>
    </div>
  )
}

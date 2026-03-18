import { NextRequest, NextResponse } from "next/server"
import { updateExportLog, updateRecordStatuses } from "@/lib/airtable/client"
import { fetchById, toExportLog } from "@/lib/airtable/client"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ exportLogId: string }> }
) {
  try {
    const { exportLogId } = await params

    // Fetch the export log to get record IDs
    const exportLog = await fetchById("AIRTABLE_EXPORT_LOGS_TABLE_ID", exportLogId, toExportLog)
    if (!exportLog) {
      return NextResponse.json({ error: "Export log not found" }, { status: 404 })
    }

    if (exportLog.exportStatus !== "Exported" && exportLog.exportStatus !== "Delivered") {
      return NextResponse.json(
        { error: `Cannot accept export with status "${exportLog.exportStatus}"` },
        { status: 400 }
      )
    }

    // Parse stored record IDs
    const artistIds = exportLog.artistRecordIds?.split(",").filter(Boolean) ?? []
    const artworkIds = exportLog.artworkRecordIds?.split(",").filter(Boolean) ?? []

    // Update all records to "Accepted"
    await Promise.all([
      artistIds.length > 0
        ? updateRecordStatuses("AIRTABLE_ARTISTS_TABLE_ID", artistIds, "Accepted")
        : Promise.resolve(),
      artworkIds.length > 0
        ? updateRecordStatuses("AIRTABLE_ARTWORKS_TABLE_ID", artworkIds, "Accepted")
        : Promise.resolve(),
    ])

    // Update export log status
    const updated = await updateExportLog(exportLogId, {
      "Export Status": "Accepted",
    })

    return NextResponse.json({ success: true, exportLog: updated })
  } catch (error) {
    console.error("Accept export error:", error)
    return NextResponse.json({ error: "Failed to accept export" }, { status: 500 })
  }
}

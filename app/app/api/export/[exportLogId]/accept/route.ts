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

    // Parse stored record IDs — only artwork statuses are updated (artist status decoupled per #91)
    const artworkIds = exportLog.artworkRecordIds?.split(",").filter(Boolean) ?? []

    // Update artwork records to "Accepted"
    if (artworkIds.length > 0) {
      await updateRecordStatuses("AIRTABLE_ARTWORKS_TABLE_ID", artworkIds, "Accepted")
    }

    // Update export log status — promote test exports to official on accept
    const updates: Record<string, string> = {
      "Export Status": "Accepted",
    }
    if (exportLog.exportType === "Preview") {
      updates["Export Type"] = "Full"
      // Clean up test note from Export Notes
      const notes = exportLog.exportNotes ?? ""
      updates["Export Notes"] = notes.replace(/^Test export — Airtable records not updated\n?/, "").trim()
    }
    const updated = await updateExportLog(exportLogId, updates)

    return NextResponse.json({ success: true, exportLog: updated })
  } catch (error) {
    console.error("Accept export error:", error)
    return NextResponse.json({ error: "Failed to accept export" }, { status: 500 })
  }
}

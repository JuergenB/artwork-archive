import { NextRequest, NextResponse } from "next/server"
import { updateExportLog } from "@/lib/airtable/client"
import { fetchById, toExportLog } from "@/lib/airtable/client"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ exportLogId: string }> }
) {
  try {
    const { exportLogId } = await params
    const body = await request.json()
    const notes: string = body.notes ?? ""

    // Fetch the export log
    const exportLog = await fetchById("AIRTABLE_EXPORT_LOGS_TABLE_ID", exportLogId, toExportLog)
    if (!exportLog) {
      return NextResponse.json({ error: "Export log not found" }, { status: 404 })
    }

    if (exportLog.exportStatus !== "Exported" && exportLog.exportStatus !== "Delivered") {
      return NextResponse.json(
        { error: `Cannot reject export with status "${exportLog.exportStatus}"` },
        { status: 400 }
      )
    }

    // Update export log — records stay at "Exported" (can re-export)
    const existingNotes = exportLog.exportNotes ?? ""
    const updatedNotes = existingNotes
      ? `${existingNotes}\n\nRejected: ${notes}`
      : `Rejected: ${notes}`

    const updated = await updateExportLog(exportLogId, {
      "Export Status": "Rejected",
      "Export Notes": updatedNotes,
    })

    return NextResponse.json({ success: true, exportLog: updated })
  } catch (error) {
    console.error("Reject export error:", error)
    return NextResponse.json({ error: "Failed to reject export" }, { status: 500 })
  }
}

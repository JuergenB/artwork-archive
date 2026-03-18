import { NextRequest, NextResponse } from "next/server"
import { updateExportLog } from "@/lib/airtable/client"
import { fetchById, toExportLog } from "@/lib/airtable/client"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ exportLogId: string }> }
) {
  try {
    const { exportLogId } = await params

    // Fetch the export log
    const exportLog = await fetchById("AIRTABLE_EXPORT_LOGS_TABLE_ID", exportLogId, toExportLog)
    if (!exportLog) {
      return NextResponse.json({ error: "Export log not found" }, { status: 404 })
    }

    if (exportLog.exportStatus !== "Exported") {
      return NextResponse.json(
        { error: `Cannot mark as delivered — status is "${exportLog.exportStatus}"` },
        { status: 400 }
      )
    }

    // Update export log status to "Delivered"
    const updated = await updateExportLog(exportLogId, {
      "Export Status": "Delivered",
      "Email Status": "Draft Opened",
      "Email Sent At": new Date().toISOString(),
    })

    return NextResponse.json({ success: true, exportLog: updated })
  } catch (error) {
    console.error("Deliver export error:", error)
    return NextResponse.json({ error: "Failed to update delivery status" }, { status: 500 })
  }
}

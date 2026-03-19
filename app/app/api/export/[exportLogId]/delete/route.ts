import { NextRequest, NextResponse } from "next/server"
import { del } from "@vercel/blob"
import { fetchById, toExportLog } from "@/lib/airtable/client"
import Airtable from "airtable"

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

    // Delete blob files if they exist
    const blobUrls: string[] = []
    if (exportLog.artistCsvUrl) blobUrls.push(exportLog.artistCsvUrl)
    if (exportLog.artworkCsvUrl) blobUrls.push(exportLog.artworkCsvUrl)

    if (blobUrls.length > 0) {
      try {
        await del(blobUrls)
      } catch (error) {
        console.error("Failed to delete blob files:", error)
        // Continue with Airtable deletion even if blob delete fails
      }
    }

    // Delete the Airtable record
    const apiKey = process.env.AIRTABLE_API_KEY
    const baseId = process.env.AIRTABLE_BASE_ID
    const tableId = process.env.AIRTABLE_EXPORT_LOGS_TABLE_ID
    if (!apiKey || !baseId || !tableId) {
      throw new Error("Missing Airtable env vars")
    }
    const base = new Airtable({ apiKey }).base(baseId)
    await base(tableId).destroy(exportLogId)

    return NextResponse.json({ success: true, deletedBlobs: blobUrls.length })
  } catch (error) {
    console.error("Delete export error:", error)
    return NextResponse.json(
      { error: "Failed to delete export", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server"
import { getExportLogs } from "@/lib/airtable/client"

export async function GET() {
  try {
    const logs = await getExportLogs()
    // Sort by timestamp descending (most recent first)
    logs.sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return bTime - aTime
    })
    return NextResponse.json(logs)
  } catch (error) {
    console.error("Export logs fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch export logs" }, { status: 500 })
  }
}

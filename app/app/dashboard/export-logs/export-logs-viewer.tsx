"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ExportLog } from "@/lib/types"

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function StatusBadge({ status }: { status: string | null }) {
  const variants: Record<string, string> = {
    "In Progress": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    "Exported": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    "Delivered": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    "Accepted": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    "Rejected": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    "Failed": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  }
  const className = variants[status ?? ""] ?? "bg-gray-100 text-gray-800"
  return (
    <Badge variant="outline" className={className}>
      {status ?? "Unknown"}
    </Badge>
  )
}

function buildMailtoLink(log: ExportLog): string {
  const subject = encodeURIComponent(log.emailSubject ?? "Artwork Archive Export")
  const body = encodeURIComponent(log.emailBody ?? "")
  const to = encodeURIComponent(log.emailRecipients ?? "")
  return `mailto:${to}?subject=${subject}&body=${body}`
}

export function ExportLogsViewer() {
  const [logs, setLogs] = useState<ExportLog[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState("")
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  async function fetchLogs() {
    try {
      const res = await fetch("/api/export/logs")
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch (error) {
      console.error("Failed to fetch export logs:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  async function handleAccept(logId: string) {
    if (!confirm("Accept this export? This will mark all records as Accepted in Airtable.")) return
    setActionLoading(logId)
    try {
      const res = await fetch(`/api/export/${logId}/accept`, { method: "POST" })
      if (res.ok) {
        await fetchLogs()
      } else {
        const data = await res.json()
        alert(data.error ?? "Failed to accept export")
      }
    } catch {
      alert("Failed to accept export")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(logId: string) {
    if (!rejectNotes.trim()) {
      alert("Please enter rejection notes")
      return
    }
    setActionLoading(logId)
    try {
      const res = await fetch(`/api/export/${logId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: rejectNotes }),
      })
      if (res.ok) {
        setRejectingId(null)
        setRejectNotes("")
        await fetchLogs()
      } else {
        const data = await res.json()
        alert(data.error ?? "Failed to reject export")
      }
    } catch {
      alert("Failed to reject export")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDeliver(logId: string) {
    setActionLoading(logId)
    try {
      await fetch(`/api/export/${logId}/deliver`, { method: "POST" })
      await fetchLogs()
    } catch {
      // Non-critical — mailto will still open
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading export logs...</p>
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">No exports yet. Generate your first export from the Preview &amp; Export page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead className="text-right">Artists</TableHead>
            <TableHead className="text-right">Artworks</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Files</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">
                {formatTimestamp(log.timestamp)}
              </TableCell>
              <TableCell>{log.campaignNames ?? "—"}</TableCell>
              <TableCell className="text-right">{log.artistCount ?? "0"}</TableCell>
              <TableCell className="text-right">{log.artworkCount ?? "0"}</TableCell>
              <TableCell>
                <StatusBadge status={log.exportStatus} />
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {log.artistCsvUrl && (
                    <a
                      href={log.artistCsvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Artists
                    </a>
                  )}
                  {log.artworkCsvUrl && (
                    <a
                      href={log.artworkCsvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Artworks
                    </a>
                  )}
                  {!log.artistCsvUrl && !log.artworkCsvUrl && "—"}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {/* Compose Email — available when Exported */}
                  {log.exportStatus === "Exported" && (
                    <a
                      href={buildMailtoLink(log)}
                      onClick={() => handleDeliver(log.id)}
                      className="inline-flex"
                    >
                      <Button variant="outline" size="sm" disabled={actionLoading === log.id}>
                        Compose Email
                      </Button>
                    </a>
                  )}

                  {/* Accept — available when Exported or Delivered */}
                  {(log.exportStatus === "Exported" || log.exportStatus === "Delivered") && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleAccept(log.id)}
                      disabled={actionLoading === log.id}
                    >
                      {actionLoading === log.id ? "..." : "Accept"}
                    </Button>
                  )}

                  {/* Reject — available when Exported or Delivered */}
                  {(log.exportStatus === "Exported" || log.exportStatus === "Delivered") && (
                    <>
                      {rejectingId === log.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Reason..."
                            value={rejectNotes}
                            onChange={(e) => setRejectNotes(e.target.value)}
                            className="h-8 w-48 rounded border px-2 text-sm"
                            autoFocus
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleReject(log.id)}
                            disabled={actionLoading === log.id}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setRejectingId(null); setRejectNotes("") }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRejectingId(log.id)}
                          disabled={actionLoading === log.id}
                        >
                          Reject
                        </Button>
                      )}
                    </>
                  )}

                  {/* Notes display for rejected/failed */}
                  {(log.exportStatus === "Rejected" || log.exportStatus === "Failed") && log.exportNotes && (
                    <span className="text-xs text-muted-foreground max-w-48 truncate" title={log.exportNotes}>
                      {log.exportNotes}
                    </span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

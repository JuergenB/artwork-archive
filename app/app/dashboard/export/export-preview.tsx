"use client"

import { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, ChevronDown, ChevronRight, Download, Eye, Info, Users, ImageIcon, Check, ExternalLink, Loader2 } from "lucide-react"
import type { Campaign, Artist, Artwork } from "@/lib/types"
import type { ExportPreviewData, ExportPreviewArtist, ExportPreviewArtwork } from "@/app/api/export/preview/route"
import { ArtistDetailSheet, ArtworkDetailSheet } from "./record-detail-sheet"
import { ImageWithFallback } from "@/components/image-with-fallback"

interface ExportPreviewProps {
  campaigns: Campaign[]
}

interface ArtistWithArtworks extends ExportPreviewArtist {
  relatedArtworks: ExportPreviewArtwork[]
}

export function ExportPreview({ campaigns }: ExportPreviewProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all")
  const [previewData, setPreviewData] = useState<ExportPreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedArtists, setExpandedArtists] = useState<Set<string>>(new Set())
  const [initialLoad, setInitialLoad] = useState(true)
  const [selectedArtist, setSelectedArtist] = useState<ArtistWithArtworks | null>(null)
  const [selectedArtwork, setSelectedArtwork] = useState<{ artwork: ExportPreviewArtwork; artistName: string | null } | null>(null)
  const [testMode, setTestMode] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [copied, setCopied] = useState<"subject" | "body" | "to" | null>(null)
  const [exportResult, setExportResult] = useState<{
    artistCsvUrl: string
    artworkCsvUrl: string
    artistCount: number
    artworkCount: number
    campaignName: string
    emailSubject: string
    emailBody: string
    exportLogId: string
    enrichmentWarning?: string | null
  } | null>(null)

  // Load "All Campaigns" on mount
  useEffect(() => {
    if (initialLoad) {
      setInitialLoad(false)
      loadPreview("all")
    }
  }, [initialLoad])

  async function loadPreview(campaignId: string) {
    setSelectedCampaign(campaignId)
    setLoading(true)
    setExpandedArtists(new Set())
    try {
      const res = await fetch(`/api/export/preview?campaignId=${campaignId}`)
      const data: ExportPreviewData = await res.json()
      setPreviewData(data)
    } catch (error) {
      console.error("Failed to load preview:", error)
    } finally {
      setLoading(false)
    }
  }

  function toggleArtist(artistId: string) {
    setExpandedArtists((prev) => {
      const next = new Set(prev)
      if (next.has(artistId)) {
        next.delete(artistId)
      } else {
        next.add(artistId)
      }
      return next
    })
  }

  function expandAll() {
    if (!previewData) return
    setExpandedArtists(new Set(previewData.artists.map((a) => a.id)))
  }

  function collapseAll() {
    setExpandedArtists(new Set())
  }

  async function handleExport() {
    if (!previewData || previewData.totalArtists === 0) return
    const msg = testMode
      ? `Test export: ${previewData.totalArtists} artists and ${previewData.totalArtworks} artworks.\n\nCSVs will be generated but Airtable records will NOT be updated.`
      : `Export ${previewData.totalArtists} artists and ${previewData.totalArtworks} artworks?\n\nThis will generate CSV files and mark artwork records as "Exported" in Airtable.`
    if (!confirm(msg)) return

    setExporting(true)
    setExportResult(null)
    try {
      const res = await fetch("/api/export/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaign,
          triggeredBy: testMode ? "Test Export" : "Export UI",
          testMode,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Export failed")
      }
      const result = await res.json()
      setExportResult(result)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Export failed")
    } finally {
      setExporting(false)
    }
  }

  async function copyToClipboard(text: string, field: "subject" | "body" | "to") {
    await navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  // Group artworks by artist
  function getArtistsWithArtworks(): ArtistWithArtworks[] {
    if (!previewData) return []
    const artworksByArtist = new Map<string, ExportPreviewArtwork[]>()
    for (const aw of previewData.artworks) {
      for (const artistId of aw.artistIds) {
        const existing = artworksByArtist.get(artistId) ?? []
        existing.push(aw)
        artworksByArtist.set(artistId, existing)
      }
    }
    return previewData.artists.map((artist) => ({
      ...artist,
      relatedArtworks: artworksByArtist.get(artist.id) ?? [],
    }))
  }

  const artistsWithArtworks = getArtistsWithArtworks()
  const allExpanded = previewData
    ? expandedArtists.size === previewData.artists.length
    : false

  return (
    <div className="space-y-6">
      {/* Step 1: Campaign Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            Step 1: Select Campaign
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Select
              value={selectedCampaign}
              onValueChange={loadPreview}
            >
              <SelectTrigger className="w-[400px]">
                <SelectValue placeholder="Choose a campaign or export all..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All Campaigns
                </SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.campaignName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loading && (
              <span className="text-sm text-muted-foreground animate-pulse">
                Loading preview...
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview */}
      {previewData && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-card">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 dark:bg-blue-900/50 p-2">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{previewData.totalArtists}</p>
                  <p className="text-sm text-muted-foreground">
                    {previewData.totalArtists === 1 ? "Artist" : "Artists"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-card">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="rounded-lg bg-violet-100 dark:bg-violet-900/50 p-2">
                  <ImageIcon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{previewData.totalArtworks}</p>
                  <p className="text-sm text-muted-foreground">
                    {previewData.totalArtworks === 1 ? "Artwork" : "Artworks"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-card">
              <CardContent className="py-4 h-full flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 dark:bg-amber-900/50 p-2 flex-shrink-0">
                  <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight">{previewData.campaignName}</p>
                  <p className="text-sm text-muted-foreground">Campaign</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enrichment Warning */}
          {previewData.enrichmentWarning && (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {previewData.enrichmentWarning}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AA Duplicate Warning */}
          {previewData.aaMatches && previewData.aaMatches.length > 0 && (
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">
                      {previewData.aaMatches.length} artist(s) already exist in Artwork Archive
                    </p>
                    <p className="text-blue-700 dark:text-blue-300 mb-2">
                      Exporting will overwrite their existing AA record (bio, address, notes).
                    </p>
                    <ul className="space-y-1">
                      {previewData.aaMatches.map((m) => (
                        <li key={m.email}>
                          <span className="font-medium">{m.artistName}</span>
                          <span className="text-blue-600 dark:text-blue-400"> — {m.aaGroups}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Data State */}
          {previewData.totalArtists === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No approved artworks found for this campaign. Artworks must be set to
                  &ldquo;Approved for Export&rdquo; status in Airtable before they appear here.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Artists & Artworks Table */}
          {previewData.totalArtists > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">
                    Step 2: Review Records
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={allExpanded ? collapseAll : expandAll}
                    >
                      {allExpanded ? "Collapse All" : "Expand All"}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Review the artists and artworks below. Click an artist row to see their artworks.
                  These are the records that will be included in the export CSV files.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Artworks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {artistsWithArtworks.map((artist) => {
                      const isExpanded = expandedArtists.has(artist.id)
                      return (
                        <ArtistRow
                          key={artist.id}
                          artist={artist}
                          isExpanded={isExpanded}
                          onToggle={() => toggleArtist(artist.id)}
                          onClickName={() => setSelectedArtist(artist)}
                          onClickArtwork={(aw) => setSelectedArtwork({ artwork: aw, artistName: artist.fullName })}
                        />
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Export */}
          {previewData.totalArtists > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">
                  Step 3: Export
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!exportResult ? (
                  <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={testMode}
                      onChange={(e) => setTestMode(e.target.checked)}
                      className="rounded"
                    />
                    <span className="font-medium">Test mode</span>
                    <span className="text-muted-foreground">— generate CSVs without updating Airtable records</span>
                  </label>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Generate Artwork Archive CSV files for{" "}
                      <span className="font-medium text-foreground">
                        {previewData.totalArtists} {previewData.totalArtists === 1 ? "artist" : "artists"}
                      </span>{" "}
                      and{" "}
                      <span className="font-medium text-foreground">
                        {previewData.totalArtworks} {previewData.totalArtworks === 1 ? "artwork" : "artworks"}
                      </span>
                      . Records will be marked as &ldquo;Exported&rdquo; in Airtable.
                    </p>
                    <Button
                      size="lg"
                      onClick={handleExport}
                      disabled={exporting}
                      className="gap-2"
                    >
                      {exporting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Export CSVs
                        </>
                      )}
                    </Button>
                  </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">
                        {testMode ? "Test export" : "Export"} complete — {exportResult.artistCount} artists, {exportResult.artworkCount} artworks
                      </span>
                      {testMode && (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          Test Mode — Airtable not updated
                        </Badge>
                      )}
                    </div>

                    {exportResult.enrichmentWarning && (
                      <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md p-3">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span className="text-sm">{exportResult.enrichmentWarning}</span>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <a href={exportResult.artistCsvUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="gap-2">
                          <ExternalLink className="h-4 w-4" />
                          Download Artists CSV
                        </Button>
                      </a>
                      <a href={exportResult.artworkCsvUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="gap-2">
                          <ExternalLink className="h-4 w-4" />
                          Download Artworks CSV
                        </Button>
                      </a>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        Send the CSV links to the Artwork Archive team:
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          className="gap-2"
                          onClick={() => {
                            setShowEmailPreview(true)
                            fetch(`/api/export/${exportResult.exportLogId}/deliver`, { method: "POST" })
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                          Copy Email
                        </Button>
                        <a
                          href={`mailto:?subject=${encodeURIComponent(exportResult.emailSubject)}&body=${encodeURIComponent(exportResult.emailBody)}`}
                          onClick={() => {
                            fetch(`/api/export/${exportResult.exportLogId}/deliver`, { method: "POST" })
                          }}
                        >
                          <Button variant="ghost" className="gap-2">
                            Compose
                          </Button>
                        </a>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <a href="/dashboard/export-logs" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
                        View in Export Logs →
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Email Preview Dialog */}
      <Dialog open={showEmailPreview} onOpenChange={setShowEmailPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          {exportResult && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-muted-foreground">Subject</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => copyToClipboard(exportResult.emailSubject, "subject")}
                  >
                    {copied === "subject" ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <div className="rounded border bg-muted/50 px-3 py-2 text-sm select-all">
                  {exportResult.emailSubject}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-muted-foreground">Body</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => copyToClipboard(exportResult.emailBody, "body")}
                  >
                    {copied === "body" ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <div className="rounded border bg-muted/50 px-3 py-2 text-sm whitespace-pre-wrap select-all font-mono">
                  {exportResult.emailBody}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Sheets */}
      <ArtistDetailSheet
        artist={selectedArtist}
        artworks={selectedArtist?.relatedArtworks ?? []}
        open={!!selectedArtist}
        onOpenChange={(open) => { if (!open) setSelectedArtist(null) }}
      />
      <ArtworkDetailSheet
        artwork={selectedArtwork?.artwork ?? null}
        artistName={selectedArtwork?.artistName}
        open={!!selectedArtwork}
        onOpenChange={(open) => { if (!open) setSelectedArtwork(null) }}
      />
    </div>
  )
}

// ─── Artist Row with Expandable Artworks ─────────────────

function ArtistRow({
  artist,
  isExpanded,
  onToggle,
  onClickName,
  onClickArtwork,
}: {
  artist: ArtistWithArtworks
  isExpanded: boolean
  onToggle: () => void
  onClickName: () => void
  onClickArtwork: (aw: ExportPreviewArtwork) => void
}) {
  const location = [artist.city, artist.state, artist.country]
    .filter(Boolean)
    .join(", ")

  // Prefer Airtable thumbnail (fresh signed URL) over Paperform URL (may expire)
  const thumbUrl = artist.contactThumbnailUrl ?? artist.contactImageUrl ?? null

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <TableCell className="w-8 px-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="px-2 py-1" style={{ width: 64 }}>
          {thumbUrl ? (
            <div className="relative h-12 w-12 flex-shrink-0">
              <ImageWithFallback
                src={thumbUrl}
                alt={artist.fullName ?? "Artist"}
                fill
                className="rounded-full object-cover"
                unoptimized
                fallbackType="initials"
                initials={(artist.firstName ?? "?")[0]}
              />
            </div>
          ) : (
            <div className="h-12 w-12 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
              <span className="text-sm text-muted-foreground">
                {(artist.firstName ?? "?")[0]}
              </span>
            </div>
          )}
        </TableCell>
        <TableCell>
          <button
            onClick={(e) => { e.stopPropagation(); onClickName() }}
            className="font-medium hover:underline underline-offset-2 text-left"
          >
            {artist.fullName ?? "Unknown"}
          </button>
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">
          {location || "—"}
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">
          {artist.email ?? "—"}
        </TableCell>
        <TableCell className="text-right">
          <Badge variant="secondary" className="text-xs">
            {artist.relatedArtworks.length}
          </Badge>
        </TableCell>
      </TableRow>

      {/* Expanded Artworks */}
      {isExpanded &&
        artist.relatedArtworks.map((artwork) => (
          <ArtworkRow key={artwork.id} artwork={artwork} onClick={() => onClickArtwork(artwork)} />
        ))}
    </>
  )
}

// ─── Artwork Row ─────────────────────────────────────────

function ArtworkRow({ artwork, onClick }: { artwork: ExportPreviewArtwork; onClick: () => void }) {
  // Prefer Airtable thumbnail (fresh signed URL) over Paperform URL (may expire)
  const firstImageUrl = artwork.pieceThumbnailUrl
    ?? artwork.pieceImageUrls?.split("|")[0]?.trim()
    ?? null

  const dimensions = [artwork.heightAi, artwork.widthAi, artwork.depthAi]
    .filter((d) => d != null && d > 0)
    .join(" × ")

  return (
    <TableRow className="bg-muted/20 cursor-pointer hover:bg-muted/40" onClick={onClick}>
      <TableCell></TableCell>
      <TableCell></TableCell>
      <TableCell colSpan={4} className="py-1.5">
        <div className="flex items-center gap-3 pl-8">
          {firstImageUrl ? (
            <div className="relative h-8 w-8 flex-shrink-0">
              <ImageWithFallback
                src={firstImageUrl}
                alt={artwork.pieceName ?? "Artwork"}
                fill
                className="rounded object-cover"
                unoptimized
                fallbackType="icon"
              />
            </div>
          ) : (
            <div className="h-8 w-8 flex-shrink-0 rounded bg-muted flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <span className="text-sm">{artwork.pieceName ?? "Untitled"}</span>
            {artwork.medium && (
              <span className="text-xs text-muted-foreground ml-2">{artwork.medium}</span>
            )}
            {(artwork.type || dimensions) && (
              <div className="text-xs text-muted-foreground">
                {[artwork.type, dimensions ? `${dimensions}${artwork.dimensionsUnitAi ? ` ${artwork.dimensionsUnitAi}` : ""}` : null].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

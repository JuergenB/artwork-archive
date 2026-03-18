"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
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
import { ChevronDown, ChevronRight, Download, Eye, Users, ImageIcon } from "lucide-react"
import type { Campaign, Artist, Artwork } from "@/lib/types"
import type { ExportPreviewData, ExportPreviewArtist, ExportPreviewArtwork } from "@/app/api/export/preview/route"
import { ArtistDetailSheet, ArtworkDetailSheet } from "./record-detail-sheet"

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
            <Card>
              <CardContent className="py-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{previewData.totalArtists}</p>
                  <p className="text-sm text-muted-foreground">
                    {previewData.totalArtists === 1 ? "Artist" : "Artists"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{previewData.totalArtworks}</p>
                  <p className="text-sm text-muted-foreground">
                    {previewData.totalArtworks === 1 ? "Artwork" : "Artworks"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 h-full flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 flex-shrink-0">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight">{previewData.campaignName}</p>
                  <p className="text-sm text-muted-foreground">Campaign</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* No Data State */}
          {previewData.totalArtists === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No approved records found for this campaign. Artists and artworks must be set to
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
              <CardContent>
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
                    . Records will be marked as &ldquo;Exported&rdquo; in Airtable after download.
                  </p>
                  <Button size="lg" disabled className="gap-2">
                    <Download className="h-4 w-4" />
                    Export CSVs
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

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

  // Get first image URL from contact image
  const thumbUrl = artist.contactImageUrl ?? null

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
              <Image
                src={thumbUrl}
                alt={artist.fullName ?? "Artist"}
                fill
                className="rounded-full object-cover"
                unoptimized
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
  // Get first image URL from pipe-separated list
  const firstImageUrl = artwork.pieceImageUrls?.split("|")[0]?.trim() ?? null

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
              <Image
                src={firstImageUrl}
                alt={artwork.pieceName ?? "Artwork"}
                fill
                className="rounded object-cover"
                unoptimized
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

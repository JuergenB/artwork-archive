import { NextRequest, NextResponse } from "next/server"
import { getArtistsByIds, getArtworks, getCampaigns, getPartnerOrgs } from "@/lib/airtable/client"
import { transformArtistForPreview, transformArtworkForPreview } from "@/lib/export/preview-transforms"
import {
  buildLookupMaps,
  enrichArtists,
  enrichArtworks,
  type EnrichedArtist,
  type EnrichedArtwork,
} from "@/lib/export/enrichment"

export interface ExportPreviewArtist extends EnrichedArtist {}

export interface ExportPreviewArtwork extends EnrichedArtwork {}

export interface ExportPreviewData {
  artists: ExportPreviewArtist[]
  artworks: ExportPreviewArtwork[]
  campaignName: string
  totalArtists: number
  totalArtworks: number
  enrichmentWarning: string | null
}

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get("campaignId")

  try {
    // Fetch approved artworks + reference data in parallel
    const [rawArtworks, allCampaigns, allPartnerOrgs] = await Promise.all([
      getArtworks('{Status} = "Approved for Export"'),
      getCampaigns(),
      getPartnerOrgs(),
    ])

    // Filter artworks by campaign if specified
    let artworks = rawArtworks
    let campaignName = "All Campaigns"

    if (campaignId && campaignId !== "all") {
      artworks = artworks.filter((aw) => aw.campaignIds.includes(campaignId))
      const campaign = allCampaigns.find((c) => c.id === campaignId)
      campaignName = campaign?.campaignName ?? "Unknown Campaign"
    }

    // Derive artists from approved artworks (artwork-driven resolution)
    const uniqueArtistIds = [...new Set(artworks.flatMap((aw) => aw.artistIds))]
    const rawArtists = await getArtistsByIds(uniqueArtistIds)

    // Guard: exclude artists on hold or flagged for review
    const BLOCKED_STATUSES = new Set(["Needs Review", "On Hold"])
    const blockedArtists = rawArtists.filter((a) => BLOCKED_STATUSES.has(a.status))
    const blockedArtistIds = new Set(blockedArtists.map((a) => a.id))

    // Guard: exclude artists without AI profile (not yet enriched)
    const eligibleArtists = rawArtists.filter((a) => !blockedArtistIds.has(a.id))
    const unenrichedArtists = eligibleArtists.filter((a) => !a.profileAi)
    const artists = eligibleArtists.filter((a) => a.profileAi)

    // Remove artworks belonging to blocked or unenriched artists
    const excludedArtistIds = new Set([...blockedArtistIds, ...unenrichedArtists.map((a) => a.id)])
    artworks = artworks.filter((aw) =>
      !aw.artistIds.some((id) => excludedArtistIds.has(id))
    )

    // Build warning messages
    const warnings: string[] = []
    if (blockedArtists.length > 0) {
      warnings.push(`${blockedArtists.length} artist(s) excluded because they are flagged: ${blockedArtists.map((a) => `${a.fullName || a.email || a.id} (${a.status})`).join(", ")}`)
    }
    if (unenrichedArtists.length > 0) {
      warnings.push(`${unenrichedArtists.length} artist(s) excluded because they haven't been enriched yet: ${unenrichedArtists.map((a) => a.fullName || a.email || a.id).join(", ")}`)
    }
    const enrichmentWarning = warnings.length > 0 ? warnings.join("\n") : null

    const maps = buildLookupMaps(allCampaigns, allPartnerOrgs, artists)

    // Apply display transforms
    const transformedArtists = artists.map(transformArtistForPreview)
    const transformedArtworks = artworks.map(transformArtworkForPreview)

    // Enrich with cross-table data (Groups, Exhibition History, Collections)
    const enrichedArtists = enrichArtists(transformedArtists, maps)
    const enrichedArtworks = enrichArtworks(transformedArtworks, maps)

    const data: ExportPreviewData = {
      artists: enrichedArtists,
      artworks: enrichedArtworks,
      campaignName,
      totalArtists: enrichedArtists.length,
      totalArtworks: enrichedArtworks.length,
      enrichmentWarning,
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    console.error("Export preview error:", error)
    return NextResponse.json(
      { error: "Failed to fetch export preview data" },
      { status: 500 }
    )
  }
}

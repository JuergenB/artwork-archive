import { NextRequest, NextResponse } from "next/server"
import { getApprovedArtists, getArtworks, getCampaigns, getPartnerOrgs } from "@/lib/airtable/client"
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
}

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get("campaignId")

  try {
    // Fetch all data in parallel
    const [rawArtists, rawArtworks, allCampaigns, allPartnerOrgs] = await Promise.all([
      getApprovedArtists(),
      getArtworks('{Status} = "Approved for Export"'),
      getCampaigns(),
      getPartnerOrgs(),
    ])

    let artists = rawArtists
    let artworks = rawArtworks
    let campaignName = "All Campaigns"

    const maps = buildLookupMaps(allCampaigns, allPartnerOrgs, rawArtists)

    // Filter by campaign if specified
    if (campaignId && campaignId !== "all") {
      const campaign = maps.campaignMap.get(campaignId)
      campaignName = campaign?.campaignName ?? "Unknown Campaign"

      artworks = artworks.filter((aw) => aw.campaignIds.includes(campaignId))
      const artistIdsWithArtworks = new Set(artworks.flatMap((aw) => aw.artistIds))
      artists = artists.filter((a) => artistIdsWithArtworks.has(a.id))
    } else {
      const artistIdsWithArtworks = new Set(artworks.flatMap((aw) => aw.artistIds))
      artists = artists.filter((a) => artistIdsWithArtworks.has(a.id))
    }

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

import { NextRequest, NextResponse } from "next/server"
import { getApprovedArtists, getArtworks, getCampaigns } from "@/lib/airtable/client"
import { transformArtistForPreview, transformArtworkForPreview } from "@/lib/export/preview-transforms"
import type { Artist, Artwork } from "@/lib/types"

export interface ExportPreviewData {
  artists: Artist[]
  artworks: Artwork[]
  campaignName: string
  totalArtists: number
  totalArtworks: number
}

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get("campaignId")

  try {
    // Fetch all approved artists
    let artists = await getApprovedArtists()

    // Fetch all approved artworks
    let artworks = await getArtworks('{Status} = "Approved for Export"')

    let campaignName = "All Campaigns"

    // Filter by campaign if specified
    if (campaignId && campaignId !== "all") {
      const campaigns = await getCampaigns()
      const campaign = campaigns.find((c) => c.id === campaignId)
      campaignName = campaign?.campaignName ?? "Unknown Campaign"

      // Filter artworks that belong to this campaign
      artworks = artworks.filter((aw) => aw.campaignIds.includes(campaignId))

      // Only include artists who have at least one approved artwork in this campaign
      const artistIdsWithArtworks = new Set(artworks.flatMap((aw) => aw.artistIds))
      artists = artists.filter((a) => artistIdsWithArtworks.has(a.id))
    } else {
      // "All Campaigns" — still only show artists who have approved artworks
      const artistIdsWithArtworks = new Set(artworks.flatMap((aw) => aw.artistIds))
      artists = artists.filter((a) => artistIdsWithArtworks.has(a.id))
    }

    // Apply display transforms
    const transformedArtists = artists.map(transformArtistForPreview)
    const transformedArtworks = artworks.map(transformArtworkForPreview)

    const data: ExportPreviewData = {
      artists: transformedArtists,
      artworks: transformedArtworks,
      campaignName,
      totalArtists: artists.length,
      totalArtworks: artworks.length,
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Export preview error:", error)
    return NextResponse.json(
      { error: "Failed to fetch export preview data" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getApprovedArtists, getArtworks, getCampaigns, getPartnerOrgs } from "@/lib/airtable/client"
import { transformArtistForPreview, transformArtworkForPreview } from "@/lib/export/preview-transforms"
import { collectionsExpand } from "@/lib/export/transforms"
import type { Artist, Artwork, Campaign, PartnerOrg } from "@/lib/types"

export interface ExportPreviewArtist extends Artist {
  /** Resolved campaign names for AA Groups column */
  groups: string
  /** Resolved exhibition history for Notes builder */
  exhibitionHistory: string
}

export interface ExportPreviewArtwork extends Artwork {
  /** Resolved collections hierarchy for AA Collections column */
  collections: string
}

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

    // Build lookup maps
    const campaignMap = new Map(allCampaigns.map((c) => [c.id, c]))
    const partnerOrgMap = new Map(allPartnerOrgs.map((p) => [p.id, p]))

    // Filter by campaign if specified
    if (campaignId && campaignId !== "all") {
      const campaign = campaignMap.get(campaignId)
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

    // Resolve Groups + Exhibition History for each artist
    const enrichedArtists: ExportPreviewArtist[] = transformedArtists.map((artist) => {
      // Groups = expanded campaign hierarchy (same logic as artwork Collections)
      const artistCampaigns = artist.campaignIds
        .map((id) => campaignMap.get(id))
        .filter((c): c is Campaign => !!c)

      const groupEntries: string[] = []
      for (const campaign of artistCampaigns) {
        const name = campaign.campaignName ?? ""
        const dashIdx = name.indexOf(" - ")
        const orgName = dashIdx > 0 ? name.substring(0, dashIdx).trim() : name.trim()

        let year: string | null = null
        if (campaign.exhibitionOpen) {
          const match = campaign.exhibitionOpen.match(/\d{4}/)
          if (match) year = match[0]
        }
        if (!year) year = new Date().getFullYear().toString()

        const expanded = collectionsExpand({
          campaignName: campaign.campaignName,
          partnerOrgName: orgName || null,
          year,
        })
        if (expanded) groupEntries.push(expanded)
      }
      // Deduplicate across campaigns (e.g., "Not Real Art" appears in multiple)
      const allGroups = groupEntries.flatMap((g) => g.split(", "))
      const seen = new Set<string>()
      const dedupedGroups: string[] = []
      for (const g of allGroups) {
        if (!seen.has(g)) {
          seen.add(g)
          dedupedGroups.push(g)
        }
      }
      const groups = dedupedGroups.join(", ")

      // Exhibition History
      const historyLines: string[] = []
      for (const campaign of artistCampaigns) {
        const exhibName = campaign.officialExhibitionName ?? campaign.campaignName
        // Find partner org for this campaign
        const orgId = campaign.partnerOrgIds?.[0]
        const org = orgId ? partnerOrgMap.get(orgId) : null
        if (org?.organizationName) {
          historyLines.push(`Participated in ${exhibName} presented by ${org.organizationName}`)
        } else {
          historyLines.push(`Participated in ${exhibName}`)
        }
      }

      return {
        ...artist,
        groups,
        exhibitionHistory: historyLines.join("\n"),
      }
    })

    // Resolve Collections for each artwork
    const enrichedArtworks: ExportPreviewArtwork[] = transformedArtworks.map((artwork) => {
      // Use first campaign for collections (artworks typically belong to one campaign)
      const campaign = artwork.campaignIds
        .map((id) => campaignMap.get(id))
        .find((c): c is Campaign => !!c)

      if (!campaign) {
        return { ...artwork, collections: "" }
      }

      // Extract org name from campaign name prefix (e.g., "Not Real Art - Modern Love" → "Not Real Art")
      const campaignNameStr = campaign.campaignName ?? ""
      const dashIdx = campaignNameStr.indexOf(" - ")
      const orgName = dashIdx > 0 ? campaignNameStr.substring(0, dashIdx).trim() : campaignNameStr.trim()

      // Extract year from Exhibition Open date, fallback to current year
      let year: string | null = null
      if (campaign.exhibitionOpen) {
        const match = campaign.exhibitionOpen.match(/\d{4}/)
        if (match) year = match[0]
      }
      if (!year) year = new Date().getFullYear().toString()

      const collections = collectionsExpand({
        campaignName: campaign.campaignName,
        partnerOrgName: orgName || null,
        year,
      })

      return { ...artwork, collections }
    })

    const data: ExportPreviewData = {
      artists: enrichedArtists,
      artworks: enrichedArtworks,
      campaignName,
      totalArtists: enrichedArtists.length,
      totalArtworks: enrichedArtworks.length,
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

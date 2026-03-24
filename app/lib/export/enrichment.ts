/**
 * Shared enrichment logic for export preview and CSV generation.
 * Resolves cross-table relationships: Groups, Exhibition History, Collections.
 */

import type { Artist, Artwork, Campaign, PartnerOrg } from "@/lib/types"
import { collectionsExpand } from "./transforms"

// ─── Enriched Types ─────────────────────────────────────

export interface PartnerOrgSummary {
  organizationName: string
  missionStatement: string | null
  contactName: string | null
  contactEmail: string | null
  curatorName: string | null
  curatorEmail: string | null
  curatorPronouns: string | null
  curatorBio: string | null
  /** The campaign this partner org is associated with */
  campaignName: string | null
}

export interface EnrichedArtist extends Artist {
  /** Resolved campaign hierarchy for AA Groups column */
  groups: string
  /** Resolved exhibition history for Notes builder */
  exhibitionHistory: string
  /** Resolved partner org details (one per partner campaign) */
  partnerOrgs: PartnerOrgSummary[]
  /** Prior Artwork Archive exhibition groups (from AA Contacts reference table) */
  aaGroups: string | null
}

export interface EnrichedArtwork extends Artwork {
  /** Resolved collections hierarchy for AA Collections column */
  collections: string
  /** Resolved artist first name (from linked artist) */
  artistFirstName: string
  /** Resolved artist last name (from linked artist) */
  artistLastName: string
  /** Resolved partner org details (from campaign) */
  partnerOrgs: PartnerOrgSummary[]
}

// ─── Lookup Maps ────────────────────────────────────────

export interface LookupMaps {
  campaignMap: Map<string, Campaign>
  partnerOrgMap: Map<string, PartnerOrg>
  artistMap: Map<string, Artist>
}

export function buildLookupMaps(
  campaigns: Campaign[],
  partnerOrgs: PartnerOrg[],
  artists: Artist[] = [],
): LookupMaps {
  return {
    campaignMap: new Map(campaigns.map((c) => [c.id, c])),
    partnerOrgMap: new Map(partnerOrgs.map((p) => [p.id, p])),
    artistMap: new Map(artists.map((a) => [a.id, a])),
  }
}

// ─── Artist Enrichment ──────────────────────────────────

function extractYearFromCampaign(campaign: Campaign): string {
  if (campaign.exhibitionOpen) {
    const match = campaign.exhibitionOpen.match(/\d{4}/)
    if (match) return match[0]
  }
  return new Date().getFullYear().toString()
}

function resolvePartnerOrgs(
  campaigns: Campaign[],
  partnerOrgMap: Map<string, PartnerOrg>,
): PartnerOrgSummary[] {
  const results: PartnerOrgSummary[] = []
  for (const campaign of campaigns) {
    const orgId = campaign.partnerOrgIds?.[0]
    if (!orgId) continue
    const org = partnerOrgMap.get(orgId)
    if (!org?.organizationName) continue
    results.push({
      organizationName: org.organizationName,
      missionStatement: org.missionStatement,
      contactName: org.contactName,
      contactEmail: org.contactEmail,
      curatorName: org.curatorName,
      curatorEmail: org.curatorEmail,
      curatorPronouns: org.curatorPronouns,
      curatorBio: org.curatorBio,
      campaignName: campaign.campaignName,
    })
  }
  return results
}

function extractOrgName(campaignName: string): string {
  const dashIdx = campaignName.indexOf(" - ")
  return dashIdx > 0 ? campaignName.substring(0, dashIdx).trim() : campaignName.trim()
}

export function enrichArtist(
  artist: Artist,
  maps: LookupMaps,
): EnrichedArtist {
  const artistCampaigns = artist.campaignIds
    .map((id) => maps.campaignMap.get(id))
    .filter((c): c is Campaign => !!c)

  // Groups = expanded campaign hierarchy
  const groupEntries: string[] = []
  for (const campaign of artistCampaigns) {
    const name = campaign.campaignName ?? ""
    const orgName = extractOrgName(name)
    const year = extractYearFromCampaign(campaign)

    const expanded = collectionsExpand({
      campaignName: campaign.campaignName,
      partnerOrgName: orgName || null,
      year,
    })
    if (expanded) groupEntries.push(expanded)
  }

  // Deduplicate across campaigns
  const allGroups = groupEntries.flatMap((g) => g.split(", "))
  const seen = new Set<string>()
  const dedupedGroups: string[] = []
  for (const g of allGroups) {
    if (!seen.has(g)) {
      seen.add(g)
      dedupedGroups.push(g)
    }
  }

  // Exhibition History
  const historyLines: string[] = []
  for (const campaign of artistCampaigns) {
    const exhibName = campaign.officialExhibitionName ?? campaign.campaignName
    const orgId = campaign.partnerOrgIds?.[0]
    const org = orgId ? maps.partnerOrgMap.get(orgId) : null
    if (org?.organizationName) {
      historyLines.push(`Participated in ${exhibName} presented by ${org.organizationName}`)
    } else {
      historyLines.push(`Participated in ${exhibName}`)
    }
  }

  // Partner orgs (one per partner campaign)
  const partnerOrgs = resolvePartnerOrgs(artistCampaigns, maps.partnerOrgMap)

  return {
    ...artist,
    groups: dedupedGroups.join(", "),
    exhibitionHistory: historyLines.join("\n"),
    partnerOrgs,
    aaGroups: null,
  }
}

// ─── Artwork Enrichment ─────────────────────────────────

export function enrichArtwork(
  artwork: Artwork,
  maps: LookupMaps,
): EnrichedArtwork {
  // Collections from first campaign
  const campaign = artwork.campaignIds
    .map((id) => maps.campaignMap.get(id))
    .find((c): c is Campaign => !!c)

  let collections = ""
  if (campaign) {
    const campaignNameStr = campaign.campaignName ?? ""
    const orgName = extractOrgName(campaignNameStr)
    const year = extractYearFromCampaign(campaign)

    collections = collectionsExpand({
      campaignName: campaign.campaignName,
      partnerOrgName: orgName || null,
      year,
    })
  }

  // Resolve artist name from linked artist
  const artistId = artwork.artistIds?.[0]
  const artist = artistId ? maps.artistMap.get(artistId) : null

  // Partner orgs from campaign
  const artworkCampaigns = artwork.campaignIds
    .map((id) => maps.campaignMap.get(id))
    .filter((c): c is Campaign => !!c)
  const partnerOrgs = resolvePartnerOrgs(artworkCampaigns, maps.partnerOrgMap)

  return {
    ...artwork,
    collections,
    artistFirstName: artist?.firstName ?? "",
    artistLastName: artist?.lastName ?? "",
    partnerOrgs,
  }
}

// ─── Batch Enrichment ───────────────────────────────────

export function enrichArtists(
  artists: Artist[],
  maps: LookupMaps,
): EnrichedArtist[] {
  return artists.map((a) => enrichArtist(a, maps))
}

export function enrichArtworks(
  artworks: Artwork[],
  maps: LookupMaps,
): EnrichedArtwork[] {
  return artworks.map((a) => enrichArtwork(a, maps))
}

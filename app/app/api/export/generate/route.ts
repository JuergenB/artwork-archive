import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import {
  getApprovedArtists,
  getArtworks,
  getCampaigns,
  getPartnerOrgs,
  createExportLog,
  updateExportLog,
  updateRecordStatuses,
} from "@/lib/airtable/client"
import { transformArtistForPreview, transformArtworkForPreview } from "@/lib/export/preview-transforms"
import { buildLookupMaps, enrichArtists, enrichArtworks } from "@/lib/export/enrichment"
import {
  generateArtistCsv,
  generateArtworkCsv,
  generateExportFileNames,
} from "@/lib/export/csv-generator"

export async function POST(request: NextRequest) {
  let exportLogId: string | null = null

  try {
    const body = await request.json()
    const campaignId: string | undefined = body.campaignId
    const triggeredBy: string = body.triggeredBy ?? "Unknown"
    const testMode: boolean = body.testMode === true

    // 1. Fetch all data in parallel
    const [rawArtists, rawArtworks, allCampaigns, allPartnerOrgs] = await Promise.all([
      getApprovedArtists(),
      getArtworks('{Status} = "Approved for Export"'),
      getCampaigns(),
      getPartnerOrgs(),
    ])

    const maps = buildLookupMaps(allCampaigns, allPartnerOrgs, rawArtists)

    // 2. Filter by campaign if specified
    let artists = rawArtists
    let artworks = rawArtworks
    let campaignName = "All Campaigns"

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

    if (artists.length === 0 && artworks.length === 0) {
      return NextResponse.json(
        { error: "No approved records found to export" },
        { status: 400 }
      )
    }

    // 3. Create Export Log with "In Progress" status
    const exportId = `${testMode ? "TEST" : "EXP"}-${Date.now()}`
    const exportLog = await createExportLog({
      "Export ID": exportId,
      "Timestamp": new Date().toISOString(),
      "Export Status": "In Progress",
      "Number of Artists Exported": String(artists.length),
      "Number of Artworks Exported": String(artworks.length),
      "Campaign Names Exported": campaignName,
      "Export Type": testMode ? "Preview" : (campaignId && campaignId !== "all" ? "Campaign" : "Full"),
      "Campaign Filter": campaignId ?? "",
      "Triggered By": triggeredBy,
      "Artist Record IDs": artists.map((a) => a.id).join(","),
      "Artwork Record IDs": artworks.map((aw) => aw.id).join(","),
      "Export Notes": testMode ? "Test export — Airtable records not updated" : "",
    })
    exportLogId = exportLog.id

    // 4. Apply display transforms + enrichment
    const transformedArtists = artists.map(transformArtistForPreview)
    const transformedArtworks = artworks.map(transformArtworkForPreview)
    const enrichedArtists = enrichArtists(transformedArtists, maps)
    const enrichedArtworks = enrichArtworks(transformedArtworks, maps)

    // 5. Generate CSVs
    const artistCsv = generateArtistCsv(enrichedArtists)
    const artworkCsv = generateArtworkCsv(enrichedArtworks)

    // 6. Upload to Vercel Blob
    const { artistFileName, artworkFileName } = generateExportFileNames(campaignName)

    const [artistBlob, artworkBlob] = await Promise.all([
      put(artistFileName, artistCsv, {
        access: "public",
        contentType: "text/csv",
        addRandomSuffix: true,
      }),
      put(artworkFileName, artworkCsv, {
        access: "public",
        contentType: "text/csv",
        addRandomSuffix: true,
      }),
    ])

    // 7. Prepare email draft
    const emailSubject = `Artwork Archive Import — ${campaignName} — ${new Date().toLocaleDateString("en-US")}`
    const emailBody = [
      `Hi Justin,`,
      ``,
      `Here are the CSV files for the ${campaignName} export:`,
      ``,
      `Artists (${artists.length}): ${artistBlob.url}`,
      `Artworks (${artworks.length}): ${artworkBlob.url}`,
      ``,
      `Please let me know once the import is complete.`,
      ``,
      `Thanks,`,
      `Kirsten`,
    ].join("\n")

    // 8. Update Export Log with URLs and status
    await updateExportLog(exportLogId, {
      "Export Status": "Exported",
      "Artist CSV URL": artistBlob.url,
      "Artwork CSV URL": artworkBlob.url,
      "Exported File Name": `${artistFileName}, ${artworkFileName}`,
      "Email Subject": emailSubject,
      "Email Body": emailBody,
    })

    // 9. Update artist/artwork statuses to "Exported" (skip in test mode)
    if (!testMode) {
      const artistIds = artists.map((a) => a.id)
      const artworkIds = artworks.map((aw) => aw.id)

      await Promise.all([
        updateRecordStatuses("AIRTABLE_ARTISTS_TABLE_ID", artistIds, "Exported"),
        updateRecordStatuses("AIRTABLE_ARTWORKS_TABLE_ID", artworkIds, "Exported"),
      ])
    }

    return NextResponse.json({
      exportLogId: exportLog.id,
      exportId,
      artistCsvUrl: artistBlob.url,
      artworkCsvUrl: artworkBlob.url,
      artistCount: artists.length,
      artworkCount: artworks.length,
      campaignName,
      emailSubject,
      emailBody,
    })
  } catch (error) {
    console.error("Export generation error:", error)

    // Update export log with failure if it was created
    if (exportLogId) {
      try {
        await updateExportLog(exportLogId, {
          "Export Status": "Failed",
          "Export Notes": error instanceof Error ? error.message : "Unknown error",
        })
      } catch {
        console.error("Failed to update export log with error status")
      }
    }

    return NextResponse.json(
      { error: "Failed to generate export", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

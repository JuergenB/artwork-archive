import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import {
  getArtistsByIds,
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
import { batchRefreshImageUrls } from "@/lib/paperform/client"

export async function POST(request: NextRequest) {
  let exportLogId: string | null = null

  try {
    const body = await request.json()
    const campaignId: string | undefined = body.campaignId
    const triggeredBy: string = body.triggeredBy ?? "Unknown"
    const testMode: boolean = body.testMode === true

    // 1. Fetch approved artworks + reference data in parallel
    const [rawArtworks, allCampaigns, allPartnerOrgs] = await Promise.all([
      getArtworks('{Status} = "Approved for Export"'),
      getCampaigns(),
      getPartnerOrgs(),
    ])

    // 2. Filter artworks by campaign if specified
    let artworks = rawArtworks
    let campaignName = "All Campaigns"

    if (campaignId && campaignId !== "all") {
      artworks = artworks.filter((aw) => aw.campaignIds.includes(campaignId))
      const campaign = allCampaigns.find((c) => c.id === campaignId)
      campaignName = campaign?.campaignName ?? "Unknown Campaign"
    }

    if (artworks.length === 0) {
      return NextResponse.json(
        { error: "No approved artworks found to export" },
        { status: 400 }
      )
    }

    // 3. Derive artists from approved artworks (artwork-driven resolution)
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
    const excludedArtworkCount = artworks.filter((aw) =>
      aw.artistIds.some((id) => excludedArtistIds.has(id))
    ).length
    artworks = artworks.filter((aw) =>
      !aw.artistIds.some((id) => excludedArtistIds.has(id))
    )

    // Build warning messages
    const warnings: string[] = []
    if (blockedArtists.length > 0) {
      const blockedArtworkCount = rawArtworks.filter((aw) =>
        aw.artistIds.some((id) => blockedArtistIds.has(id))
      ).length
      warnings.push(`${blockedArtworkCount} artwork(s) excluded because ${blockedArtists.length} artist(s) are flagged as ${blockedArtists.map((a) => `${a.fullName || a.email || a.id} (${a.status})`).join(", ")}`)
    }
    if (unenrichedArtists.length > 0) {
      const unenrichedIds = new Set(unenrichedArtists.map((a) => a.id))
      const unenrichedArtworkCount = rawArtworks.filter((aw) =>
        aw.artistIds.some((id) => unenrichedIds.has(id))
      ).length
      warnings.push(`${unenrichedArtworkCount} artwork(s) excluded because ${unenrichedArtists.length} artist(s) haven't been enriched yet: ${unenrichedArtists.map((a) => a.fullName || a.email || a.id).join(", ")}`)
    }
    const enrichmentWarning = warnings.length > 0 ? warnings.join("\n") : null

    if (artists.length === 0 && artworks.length === 0) {
      return NextResponse.json(
        { error: enrichmentWarning || "No approved records found to export" },
        { status: 400 }
      )
    }

    const maps = buildLookupMaps(allCampaigns, allPartnerOrgs, artists)

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
      "Export Notes": [
        testMode ? "Test export — Airtable records not updated" : "",
        enrichmentWarning ?? "",
      ].filter(Boolean).join("\n") || "",
    })
    exportLogId = exportLog.id

    // 4. Apply display transforms + enrichment
    const transformedArtists = artists.map(transformArtistForPreview)
    const transformedArtworks = artworks.map(transformArtworkForPreview)
    const enrichedArtists = enrichArtists(transformedArtists, maps)
    const enrichedArtworks = enrichArtworks(transformedArtworks, maps)

    // 5. Refresh image URLs via Paperform API (fresh signed URLs for CSV)
    const allRecords = [
      ...enrichedArtists.map((a) => ({
        submissionId: a.submissionIdPaperform,
        imageUrls: [a.contactImageUrl].filter((u): u is string => u != null),
      })),
      ...enrichedArtworks.map((aw) => ({
        submissionId: aw.submissionIdPaperform,
        imageUrls: aw.pieceImageUrls?.split("|").map((u) => u.trim()).filter(Boolean) ?? [],
      })),
    ]

    const freshUrlMap = await batchRefreshImageUrls(allRecords)

    // Replace expired URLs with fresh ones in enriched records
    for (const artist of enrichedArtists) {
      if (artist.contactImageUrl && freshUrlMap.has(artist.contactImageUrl)) {
        artist.contactImageUrl = freshUrlMap.get(artist.contactImageUrl)!
      }
    }
    for (const artwork of enrichedArtworks) {
      if (artwork.pieceImageUrls) {
        artwork.pieceImageUrls = artwork.pieceImageUrls
          .split("|")
          .map((u) => u.trim())
          .map((u) => freshUrlMap.get(u) ?? u)
          .join("|")
      }
    }

    // 6. Generate CSVs
    const artistCsv = generateArtistCsv(enrichedArtists)
    const artworkCsv = generateArtworkCsv(enrichedArtworks)

    // 7. Upload to Vercel Blob
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

    // 8. Prepare email draft
    const emailSubject = `Artwork Archive Import — ${campaignName} — ${new Date().toLocaleDateString("en-US")}`
    const emailBody = [
      `Hi Justin,`,
      ``,
      `Here are the CSV files for the ${campaignName} export:`,
      ``,
      `Artists (${artists.length}): ${artistBlob.url}`,
      `Artworks (${artworks.length}): ${artworkBlob.url}`,
      ``,
      `Note: Image links in the CSV files expire in 7 days. Please complete the import by ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. If needed, we can re-export with fresh links.`,
      ``,
      `Please let me know once the import is complete.`,
      ``,
      `Thanks,`,
      `Kirsten`,
    ].join("\n")

    // 9. Update Export Log with URLs and status
    await updateExportLog(exportLogId, {
      "Export Status": "Exported",
      "Artist CSV URL": artistBlob.url,
      "Artwork CSV URL": artworkBlob.url,
      "Exported File Name": `${artistFileName}, ${artworkFileName}`,
      "Email Subject": emailSubject,
      "Email Body": emailBody,
    })

    // 10. Update artwork statuses to "Exported" (skip in test mode)
    // Artist statuses are NOT updated — decoupled per issue #91
    if (!testMode) {
      const artworkIds = artworks.map((aw) => aw.id)
      await updateRecordStatuses("AIRTABLE_ARTWORKS_TABLE_ID", artworkIds, "Exported")
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
      enrichmentWarning,
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

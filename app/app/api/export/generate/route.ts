import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import {
  getAAContacts,
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
  buildArtistCsvRow,
  buildArtworkCsvRow,
} from "@/lib/export/csv-generator"
import {
  validateArtistRows,
  validateArtworkRows,
  formatViolations,
} from "@/lib/export/template-validation"
import { generateArtistXlsx, generateArtworkXlsx } from "@/lib/export/xlsx-generator"
import { refreshImageUrls, toFreshUrlMap, type RefreshOutcome } from "@/lib/paperform/client"
import {
  auditImageUrls,
  formatAuditFailures,
  type AuditInput,
} from "@/lib/export/image-audit"
import { allTemplateSummaries, templateProvenanceForEmail } from "@/lib/export/aa-templates"

function splitImageUrls(value: string | null | undefined): string[] {
  if (!value) return []
  return value.split("|").map((u) => u.trim()).filter(Boolean)
}

// Reads AA's .xlsx templates from disk and uses exceljs — Node runtime, not edge.
export const runtime = "nodejs"

/**
 * This route is slow by nature: one Paperform API call per submission, a
 * liveness check per image, Excel + CSV generation, then four blob uploads.
 * A 62-image export measures ~13s locally, which already exceeds Vercel's
 * default route-handler limit, and the record set only grows. Without this the
 * export dies mid-flight in production.
 */
export const maxDuration = 300

export async function POST(request: NextRequest) {
  let exportLogId: string | null = null

  try {
    const body = await request.json()
    const campaignId: string | undefined = body.campaignId
    const triggeredBy: string = body.triggeredBy ?? "Unknown"
    const testMode: boolean = body.testMode === true
    const excludeDimensions: boolean = body.excludeDimensions !== false

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

    // AA duplicate detection: check if any export artists already exist in Artwork Archive
    const aaContacts = await getAAContacts().catch(() => [])
    const aaEmailMap = new Map<string, { fullName: string | null; groups: string | null }>()
    for (const c of aaContacts) {
      if (c.email) aaEmailMap.set(c.email.toLowerCase(), { fullName: c.fullName, groups: c.groups })
    }
    const aaMatchNames: string[] = []
    for (const a of artists) {
      if (a.email) {
        const match = aaEmailMap.get(a.email.toLowerCase())
        if (match) {
          const groups = match.groups ? ` (${match.groups.split(" : ").slice(0, 3).join(", ")})` : ""
          aaMatchNames.push(`${a.fullName || a.email}${groups}`)
        }
      }
    }
    const aaMatchWarning = aaMatchNames.length > 0
      ? `${aaMatchNames.length} artist(s) already exist in Artwork Archive and will be overwritten: ${aaMatchNames.join("; ")}`
      : null

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
        aaMatchWarning ?? "",
      ].filter(Boolean).join("\n") || "",
    })
    exportLogId = exportLog.id

    // 4. Apply display transforms + enrichment
    const transformedArtists = artists.map(transformArtistForPreview)
    const transformedArtworks = artworks.map(transformArtworkForPreview)
    const enrichedArtists = enrichArtists(transformedArtists, maps)
    const enrichedArtworks = enrichArtworks(transformedArtworks, maps)

    // Populate AA groups on matched artists (for Notes builder)
    for (const a of enrichedArtists) {
      if (a.email) {
        const match = aaEmailMap.get(a.email.toLowerCase())
        if (match) a.aaGroups = match.groups
      }
    }

    // 5. Refresh image URLs via Paperform API (fresh signed URLs for the export)
    //
    // Artworks imported before the intake workflow began storing
    // "Submission ID (Paperform)" have no ID of their own. Fall back to the
    // linked artist's submission. This cannot produce a wrong image: the
    // refreshed URL is only accepted when the filename also matches, so an
    // artist's later submission simply fails to match and blocks the export.
    const artistSubmissionIds = new Map<string, string>()
    for (const artist of enrichedArtists) {
      if (artist.submissionIdPaperform) {
        artistSubmissionIds.set(artist.id, artist.submissionIdPaperform)
      }
    }

    const resolveArtworkSubmissionId = (aw: (typeof enrichedArtworks)[number]): string | null => {
      if (aw.submissionIdPaperform) return aw.submissionIdPaperform
      for (const artistId of aw.artistIds) {
        const inherited = artistSubmissionIds.get(artistId)
        if (inherited) return inherited
      }
      return null
    }

    const refreshOutcomes = await refreshImageUrls([
      ...enrichedArtists.map((a) => ({
        submissionId: a.submissionIdPaperform,
        imageUrls: [a.contactImageUrl].filter((u): u is string => u != null),
        label: a.fullName || a.email || a.id,
      })),
      ...enrichedArtworks.map((aw) => ({
        submissionId: resolveArtworkSubmissionId(aw),
        imageUrls: splitImageUrls(aw.pieceImageUrls),
        label: aw.pieceName || aw.id,
      })),
    ])

    const freshUrlMap = toFreshUrlMap(refreshOutcomes)
    const failureByUrl = new Map<string, RefreshOutcome>()
    for (const outcome of refreshOutcomes) {
      if (outcome.status !== "refreshed") failureByUrl.set(outcome.originalUrl, outcome)
    }

    // Replace stale URLs with fresh ones in the enriched records
    for (const artist of enrichedArtists) {
      if (artist.contactImageUrl && freshUrlMap.has(artist.contactImageUrl)) {
        artist.contactImageUrl = freshUrlMap.get(artist.contactImageUrl)!
      }
    }
    for (const artwork of enrichedArtworks) {
      if (artwork.pieceImageUrls) {
        artwork.pieceImageUrls = splitImageUrls(artwork.pieceImageUrls)
          .map((u) => freshUrlMap.get(u) ?? u)
          .join("|")
      }
    }

    // 6. Audit every image URL that would ship. A partially-refreshed export is
    //    what causes failed AA imports and manual image hunting, so this blocks.
    const auditInputs: AuditInput[] = []
    const originalUrlOf = (url: string) => {
      for (const [original, fresh] of freshUrlMap) if (fresh === url) return original
      return url
    }

    for (const artist of enrichedArtists) {
      if (!artist.contactImageUrl) continue
      const failure = failureByUrl.get(originalUrlOf(artist.contactImageUrl))
      auditInputs.push({
        url: artist.contactImageUrl,
        recordLabel: artist.fullName || artist.email || artist.id,
        entityType: "artist",
        refreshFailure: failure?.detail ?? (failure ? failure.status : undefined),
      })
    }
    for (const artwork of enrichedArtworks) {
      for (const url of splitImageUrls(artwork.pieceImageUrls)) {
        const failure = failureByUrl.get(originalUrlOf(url))
        auditInputs.push({
          url,
          recordLabel: artwork.pieceName || artwork.id,
          entityType: "artwork",
          refreshFailure: failure?.detail ?? (failure ? failure.status : undefined),
        })
      }
    }

    const audit = await auditImageUrls(auditInputs, { verifyLiveness: true })

    if (!audit.ok) {
      const detail = formatAuditFailures(audit)
      await updateExportLog(exportLogId, {
        "Export Status": "Blocked",
        "Image Audit Summary": detail,
        "Export Notes": [
          "Export blocked — image URL audit failed. No files were generated and no record statuses were changed.",
          detail,
        ].join("\n\n"),
      })

      return NextResponse.json(
        {
          error: "Export blocked — some image links would reach Artwork Archive already expired.",
          detail,
          audit: {
            ok: false,
            totalImages: audit.totalImages,
            failureCount: audit.failures.length,
            summary: audit.summary,
            failures: audit.failures.map((f) => ({
              recordLabel: f.recordLabel,
              entityType: f.entityType,
              status: f.status,
              detail: f.detail ?? null,
            })),
          },
          exportLogId,
        },
        { status: 409 },
      )
    }

    // 7. Check values against AA's controlled vocabularies. Reported, not
    //    blocked — these records still import, but AA may reject the value.
    const vocabularyWarning = formatViolations([
      ...validateArtistRows(enrichedArtists.map(buildArtistCsvRow)),
      ...validateArtworkRows(
        enrichedArtworks.map((aw) =>
          buildArtworkCsvRow(aw, { dimensionsInNotes: excludeDimensions }),
        ),
      ),
    ])

    // 8. Generate CSV + Excel. Both formats share the same row builders, and the
    //    Excel files are AA's own templates with our rows appended.
    const artistCsv = generateArtistCsv(enrichedArtists)
    const artworkCsv = generateArtworkCsv(enrichedArtworks, {
      dimensionsInNotes: excludeDimensions,
    })
    const [artistXlsx, artworkXlsx] = await Promise.all([
      generateArtistXlsx(enrichedArtists),
      generateArtworkXlsx(enrichedArtworks, { dimensionsInNotes: excludeDimensions }),
    ])

    // 8. Upload to Vercel Blob
    const {
      artistFileName,
      artworkFileName,
      artistXlsxFileName,
      artworkXlsxFileName,
    } = generateExportFileNames(campaignName)

    const XLSX_CONTENT_TYPE =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    const [artistBlob, artworkBlob, artistXlsxBlob, artworkXlsxBlob] = await Promise.all([
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
      put(artistXlsxFileName, artistXlsx, {
        access: "public",
        contentType: XLSX_CONTENT_TYPE,
        addRandomSuffix: true,
      }),
      put(artworkXlsxFileName, artworkXlsx, {
        access: "public",
        contentType: XLSX_CONTENT_TYPE,
        addRandomSuffix: true,
      }),
    ])

    // 9. Prepare email draft. The import deadline is the earliest real expiry
    //    found by the audit, not an assumed now+7d.
    const deadline = audit.earliestExpiry
    const deadlineText = deadline
      ? deadline.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : null

    const emailSubject = `Artwork Archive Import — ${campaignName} — ${new Date().toLocaleDateString("en-US")}`
    const emailBody = [
      `Hi,`,
      ``,
      `Here are the files for the ${campaignName} export. Both Excel and CSV are provided — they contain identical data, so please use whichever suits your import.`,
      ``,
      `Artists (${artists.length}):`,
      `  Excel: ${artistXlsxBlob.url}`,
      `  CSV:   ${artistBlob.url}`,
      ``,
      `Artworks (${artworks.length}):`,
      `  Excel: ${artworkXlsxBlob.url}`,
      `  CSV:   ${artworkBlob.url}`,
      ``,
      templateProvenanceForEmail(),
      ``,
      deadlineText
        ? `Every image link in these files was freshly generated for this export and is valid until ${deadlineText}. Please complete the import by then — if the window passes, let us know and we will re-export with fresh links at no trouble.`
        : `Image links in these files were freshly generated for this export.`,
      ``,
      `Please let me know once the import is complete.`,
      ``,
      `Thanks,`,
      `Kirsten`,
    ].join("\n")

    // 10. Update Export Log with URLs, audit result and template provenance
    const templateRevision = allTemplateSummaries()
      .map((t) => `${t.entityType}: ${t.fileName} (${t.revisionLabel}, revised ${t.revisedOn ?? "unknown"}, ${t.columnCount} cols, sha256 ${t.sha256Short})`)
      .join("\n")

    await updateExportLog(exportLogId, {
      "Export Status": "Exported",
      "Artist CSV URL": artistBlob.url,
      "Artwork CSV URL": artworkBlob.url,
      "Artist XLSX URL": artistXlsxBlob.url,
      "Artwork XLSX URL": artworkXlsxBlob.url,
      "Image Audit Summary": [audit.summary, vocabularyWarning ?? ""]
        .filter(Boolean)
        .join("\n\n"),
      "Image Links Expire At": deadline ? deadline.toISOString() : "",
      "AA Template Revision": templateRevision,
      "Exported File Name": [
        artistFileName,
        artworkFileName,
        artistXlsxFileName,
        artworkXlsxFileName,
      ].join(", "),
      "Email Subject": emailSubject,
      "Email Body": emailBody,
    })

    // 11. Update artwork statuses to "Exported" (skip in test mode)
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
      artistXlsxUrl: artistXlsxBlob.url,
      artworkXlsxUrl: artworkXlsxBlob.url,
      artistCount: artists.length,
      artworkCount: artworks.length,
      campaignName,
      emailSubject,
      emailBody,
      enrichmentWarning,
      aaMatchWarning,
      vocabularyWarning,
      audit: {
        ok: true,
        totalImages: audit.totalImages,
        summary: audit.summary,
        expiresAt: deadline ? deadline.toISOString() : null,
      },
      templates: allTemplateSummaries(),
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

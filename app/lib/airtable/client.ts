import Airtable from "airtable"
import type {
  Artist,
  ArtistStatus,
  Artwork,
  ArtworkStatus,
  Campaign,
  PartnerOrg,
  FieldMapping,
  ExportLog,
  ExportType,
  TransformType,
} from "@/lib/types"

// ─── Lazy Initialization ─────────────────────────────────
// Env vars are checked at query time, not import time.
// This allows safe imports in build/test contexts.

let _base: Airtable.Base | null = null

function getBase(): Airtable.Base {
  if (!_base) {
    const apiKey = process.env.AIRTABLE_API_KEY
    const baseId = process.env.AIRTABLE_BASE_ID
    if (!apiKey) throw new Error("AIRTABLE_API_KEY is not set")
    if (!baseId) throw new Error("AIRTABLE_BASE_ID is not set")
    _base = new Airtable({ apiKey }).base(baseId)
  }
  return _base
}

function getTable(envVarName: string) {
  const tableId = process.env[envVarName]
  if (!tableId) {
    throw new Error(`${envVarName} is not set in environment variables`)
  }
  return getBase()(tableId)
}

// ─── Generic Helpers ─────────────────────────────────────

type TransformFn<T> = (fields: Record<string, unknown>, id: string) => T

export async function fetchAll<T>(
  envVarName: string,
  transform: TransformFn<T>,
  filterByFormula?: string
): Promise<T[]> {
  const table = getTable(envVarName)
  const query = table.select(
    filterByFormula ? { filterByFormula } : {}
  )
  const records: T[] = []
  await query.eachPage((pageRecords, fetchNextPage) => {
    for (const record of pageRecords) {
      records.push(transform(record.fields, record.id))
    }
    fetchNextPage()
  })
  return records
}

export async function fetchById<T>(
  envVarName: string,
  recordId: string,
  transform: TransformFn<T>
): Promise<T | null> {
  try {
    const table = getTable(envVarName)
    const record = await table.find(recordId)
    return transform(record.fields, record.id)
  } catch {
    return null
  }
}

// ─── Helpers ─────────────────────────────────────────────

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value
  return null
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number") return value
  return null
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string")
  return []
}

/** Extract the "large" thumbnail URL from an Airtable attachment field. */
function asThumbnailUrl(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const attachment = value[0] as Record<string, unknown>
  const thumbnails = attachment?.thumbnails as Record<string, unknown> | undefined
  const large = thumbnails?.large as Record<string, unknown> | undefined
  if (typeof large?.url === "string") return large.url
  // Fall back to the full-size attachment URL
  if (typeof attachment?.url === "string") return attachment.url as string
  return null
}

// ─── Transform Functions ─────────────────────────────────

export function toArtist(fields: Record<string, unknown>, id: string): Artist {
  return {
    id,
    fullName: asString(fields["Full Name"]),
    firstName: asString(fields["First Name"]),
    lastName: asString(fields["Last Name"]),
    email: asString(fields["Email"]),
    bio: asString(fields["Bio"]),
    artistStatement: asString(fields["Artist Statement"]),
    city: asString(fields["City"]),
    state: asString(fields["State"]),
    zipCode: asString(fields["Zip"]),
    country: asString(fields["Country"]),
    nationality: asString(fields["Nationality"]),
    primaryAddress: asString(fields["Primary Address"]),
    address2: asString(fields["Address 2"]),
    phone: asString(fields["Phone"]),
    website: asString(fields["Website"]),
    instagramUrl: asString(fields["Instagram URL"]),
    facebookUrl: asString(fields["Facebook URL"]),
    twitterUrl: asString(fields["Twitter URL"]),
    linkedinUrl: asString(fields["LinkedIn URL"]),
    pinterestUrl: asString(fields["Pinterest URL"]),
    contactImageUrl: asString(fields["Contact Image URL"]),
    contactThumbnailUrl: asThumbnailUrl(fields["Contact Thumbnail"]),
    submissionIdPaperform: asString(fields["Submission ID (Paperform)"]),
    status: (asString(fields["Status"]) as ArtistStatus) || "Pending - Imported",
    profileAi: asString(fields["Artist Profile (AI)"]),
    summaryAi: asString(fields["Artist Summary (AI)"]),
    tagsAi: asString(fields["AI Tags"]),
    socialProfilesAi: asString(fields["Social Profiles (AI)"]),
    campaignIds: asStringArray(fields["Campaigns"]),
    artworkIds: asStringArray(fields["Artworks"]),
    partnerOrgIds: asStringArray(fields["Partner Organizations"]),
  }
}

export function toArtwork(fields: Record<string, unknown>, id: string): Artwork {
  return {
    id,
    pieceName: asString(fields["Piece Name"]),
    type: asString(fields["Type"]),
    medium: asString(fields["Medium"]),
    subjectMatter: asString(fields["Subject Matter"]),
    description: asString(fields["Description"]),
    pieceImageUrls: asString(fields["Piece Image URLs"]),
    pieceThumbnailUrl: asThumbnailUrl(fields["Piece Thumbnail"]),
    yearCreatedDate: asString(fields["Year Created Date"]),
    status: (asString(fields["Status"]) as ArtworkStatus) || "Pending - Imported",
    statusFromArtist: asString(fields["Status (from Artist)"]),
    mediumAi: asString(fields["Medium (AI)"]),
    subjectMatterAi: asString(fields["Subject Matter (AI)"]),
    tagsAi: asString(fields["Tags (AI)"]),
    relevanceHypothesisAi: asString(fields["Relevance Hypothesis (AI)"]),
    heightAi: asNumber(fields["Height (AI)"]),
    widthAi: asNumber(fields["Width (AI)"]),
    depthAi: asNumber(fields["Depth (AI)"]),
    dimensionsUnitAi: asString(fields["Dimensions Unit (AI)"]),
    artistIds: asStringArray(fields["Artist"]),
    campaignIds: asStringArray(fields["Campaign (Linked by Name)"]),
    campaignDescriptions: asString(fields["Campaign Descriptions (from Campaign (Linked by Name))"]),
    linkToPurchaseUrl: asString(fields["Link to Purchase URL"]),
    artistEmail: asString(fields["Artist Email"]),
    submissionIdPaperform: asString(fields["Submission ID (Paperform)"]),
  }
}

export function toCampaign(fields: Record<string, unknown>, id: string): Campaign {
  return {
    id,
    campaignName: asString(fields["Campaign Name"]),
    campaignDescriptions: asString(fields["Campaign Descriptions"]),
    campaignLogoUrl: asString(fields["Campaign Logo"]),
    campaignContactEmails: asString(fields["Campaign Contact Emails"]),
    officialExhibitionName: asString(fields["Official Exhibition Name"]),
    exhibitionVenue: asString(fields["Exhibition Venue"]),
    exhibitionAddress: asString(fields["Exhibition Address"]),
    exhibitionUrl: asString(fields["Exhibition URL"]),
    exhibitionOpen: asString(fields["Exhibition Open"]),
    exhibitionClose: asString(fields["Exhibition Close"]),
    artistIds: asStringArray(fields["Artists"]),
    artworkIds: asStringArray(fields["Artworks"]),
    partnerOrgIds: asStringArray(fields["Partner Organizations"]),
  }
}

export function toPartnerOrg(fields: Record<string, unknown>, id: string): PartnerOrg {
  return {
    id,
    organizationName: asString(fields["Organization Name"]),
    missionStatement: asString(fields["Mission Statement"]),
    contactName: asString(fields["Contact Name"]),
    contactEmail: asString(fields["Contact Email"]),
    curatorName: asString(fields["Curator Name"]),
    curatorEmail: asString(fields["Curator Email"]),
    curatorPronouns: asString(fields["Curator Pronouns"]),
    curatorBio: asString(fields["Curator Bio"]),
    status: asString(fields["Status"]),
    campaignIds: asStringArray(fields["Campaigns"]),
    artistIds: asStringArray(fields["Artists"]),
  }
}

export function toFieldMapping(fields: Record<string, unknown>, id: string): FieldMapping {
  return {
    id,
    entityType: (asString(fields["Entity Type"]) as "artist" | "artwork") || "artist",
    sourceField: asString(fields["Source Field"]) || "",
    targetColumn: asString(fields["Target Column"]) || "",
    targetColumnIndex: asNumber(fields["Target Column Index"]) ?? 0,
    transform: asString(fields["Transform"]) as TransformType | null,
    defaultValue: asString(fields["Default Value"]),
    writeBack: fields["Write Back"] === true,
    active: fields["Active"] !== false,
    notes: asString(fields["Notes"]),
  }
}

export function toExportLog(fields: Record<string, unknown>, id: string): ExportLog {
  return {
    id,
    exportId: asString(fields["Export ID"]),
    timestamp: asString(fields["Timestamp"]),
    exportStatus: asString(fields["Export Status"]) as ExportLog["exportStatus"],
    artistCount: asString(fields["Number of Artists Exported"]),
    artworkCount: asString(fields["Number of Artworks Exported"]),
    campaignNames: asString(fields["Campaign Names Exported"]),
    exportNotes: asString(fields["Export Notes"]),
    exportedFileName: asString(fields["Exported File Name"]),
    artistCsvUrl: asString(fields["Artist CSV URL"]),
    artworkCsvUrl: asString(fields["Artwork CSV URL"]),
    exportType: asString(fields["Export Type"]) as ExportType | null,
    campaignFilter: asString(fields["Campaign Filter"]),
    triggeredBy: asString(fields["Triggered By"]),
    artistRecordIds: asString(fields["Artist Record IDs"]),
    artworkRecordIds: asString(fields["Artwork Record IDs"]),
    emailRecipients: asString(fields["Email Recipients"]),
    emailCc: asString(fields["Email CC"]),
    emailSubject: asString(fields["Email Subject"]),
    emailBody: asString(fields["Email Body"]),
    emailSentAt: asString(fields["Email Sent At"]),
    emailStatus: asString(fields["Email Status"]),
  }
}

// ─── Domain Functions ────────────────────────────────────

// Artists
export async function getArtists(filterByFormula?: string): Promise<Artist[]> {
  return fetchAll("AIRTABLE_ARTISTS_TABLE_ID", toArtist, filterByFormula)
}

export async function getArtistById(id: string): Promise<Artist | null> {
  return fetchById("AIRTABLE_ARTISTS_TABLE_ID", id, toArtist)
}

export async function getApprovedArtists(): Promise<Artist[]> {
  return getArtists('{Status} = "Approved for Export"')
}

export async function getEnrichedArtists(): Promise<Artist[]> {
  return getArtists('{Status} = "Pending - Enriched"')
}

// Artworks
export async function getArtworks(filterByFormula?: string): Promise<Artwork[]> {
  return fetchAll("AIRTABLE_ARTWORKS_TABLE_ID", toArtwork, filterByFormula)
}

export async function getArtworkById(id: string): Promise<Artwork | null> {
  return fetchById("AIRTABLE_ARTWORKS_TABLE_ID", id, toArtwork)
}

export async function getArtworksByArtistStatus(status: string): Promise<Artwork[]> {
  return getArtworks(`{Status (from Artist)} = "${status}"`)
}

// Campaigns
export async function getCampaigns(filterByFormula?: string): Promise<Campaign[]> {
  return fetchAll("AIRTABLE_CAMPAIGNS_TABLE_ID", toCampaign, filterByFormula)
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  return fetchById("AIRTABLE_CAMPAIGNS_TABLE_ID", id, toCampaign)
}

// Partner Organizations
export async function getPartnerOrgs(filterByFormula?: string): Promise<PartnerOrg[]> {
  return fetchAll("AIRTABLE_PARTNER_ORGS_TABLE_ID", toPartnerOrg, filterByFormula)
}

export async function getPartnerOrgById(id: string): Promise<PartnerOrg | null> {
  return fetchById("AIRTABLE_PARTNER_ORGS_TABLE_ID", id, toPartnerOrg)
}

// Field Mappings
export async function getFieldMappings(filterByFormula?: string): Promise<FieldMapping[]> {
  return fetchAll("AIRTABLE_FIELD_MAPPINGS_TABLE_ID", toFieldMapping, filterByFormula)
}

// Export Logs
export async function getExportLogs(filterByFormula?: string): Promise<ExportLog[]> {
  return fetchAll("AIRTABLE_EXPORT_LOGS_TABLE_ID", toExportLog, filterByFormula)
}

export async function createExportLog(
  fields: Record<string, unknown>
): Promise<ExportLog> {
  const table = getTable("AIRTABLE_EXPORT_LOGS_TABLE_ID")
  const record = await table.create(fields as Airtable.FieldSet)
  return toExportLog(record.fields, record.id)
}

export async function updateExportLog(
  recordId: string,
  fields: Record<string, unknown>
): Promise<ExportLog> {
  const table = getTable("AIRTABLE_EXPORT_LOGS_TABLE_ID")
  const record = await table.update(recordId, fields as Airtable.FieldSet)
  return toExportLog(record.fields, record.id)
}

/**
 * Batch update Status field on multiple records in a table.
 * Airtable API allows max 10 records per batch update call.
 */
export async function updateRecordStatuses(
  tableEnvVar: string,
  recordIds: string[],
  status: string
): Promise<void> {
  const table = getTable(tableEnvVar)
  const BATCH_SIZE = 10

  for (let i = 0; i < recordIds.length; i += BATCH_SIZE) {
    const batch = recordIds.slice(i, i + BATCH_SIZE)
    const updates = batch.map((id) => ({
      id,
      fields: { Status: status } as Airtable.FieldSet,
    }))
    await table.update(updates)
  }
}

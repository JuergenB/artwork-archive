/**
 * CSV generation engine for Artwork Archive export.
 * Maps enriched Airtable records to AA template column order,
 * applies all transforms, and generates valid CSV strings.
 */

import { AA_ARTIST_COLUMNS, AA_ARTWORK_COLUMNS } from "@/lib/aa-columns"
import type { EnrichedArtist, EnrichedArtwork } from "./enrichment"
import {
  titleCase,
  stateAbbreviation,
  urlValidate,
  socialMediaProfile,
  phoneNormalize,
  nationalityNormalize,
  aiTags,
  pipeSeparate,
  dimensionFormat,
  dateFormat,
  fieldConcatenate,
  buildArtistNotes,
  buildArtworkNotes,
} from "./transforms"

// ─── CSV Escaping ───────────────────────────────────────

/**
 * Escape a single CSV field per RFC 4180.
 * Wraps in double quotes if value contains comma, quote, or newline.
 */
export function escapeCsvField(value: string): string {
  if (!value) return ""
  // If the field contains special characters, quote it
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    // Double any existing quotes
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Join an array of field values into a CSV row.
 */
function rowToCsv(fields: string[]): string {
  return fields.map(escapeCsvField).join(",")
}

// ─── Artist CSV Row Builder ─────────────────────────────

/**
 * Map an enriched artist to a 40-element array matching AA artist template.
 * Applies all transforms (title_case, state_abbreviation, url_validate,
 * social_media_profile, ai_tags, notes_builder, nationality_normalize, phone_normalize).
 */
export function buildArtistCsvRow(artist: EnrichedArtist): string[] {
  const row = new Array<string>(AA_ARTIST_COLUMNS.length).fill("")

  // Col 0: First Name / Company Name
  row[0] = artist.firstName ?? ""
  // Col 1: Last Name
  row[1] = artist.lastName ?? ""
  // Col 2: Title (not mapped — empty)
  // Col 3: Nationality
  row[3] = nationalityNormalize(artist.nationality)
  // Col 4: Birth Date (not mapped — empty)
  // Col 5: Death Date (not mapped — empty)
  // Col 6: Email
  row[6] = artist.email ?? ""
  // Col 7: Secondary Email (not mapped — empty)
  // Col 8: Phone
  row[8] = phoneNormalize(artist.phone)
  // Col 9: Mobile Phone (not mapped — empty)
  // Col 10: Work Phone (not mapped — empty)
  // Col 11: Primary Address 1
  row[11] = titleCase(artist.primaryAddress)
  // Col 12: Address 2
  row[12] = titleCase(artist.address2)
  // Col 13: City
  row[13] = titleCase(artist.city)
  // Col 14: State
  row[14] = stateAbbreviation(artist.state)
  // Col 15: Zip
  row[15] = artist.zipCode ?? ""
  // Col 16: Country
  row[16] = artist.country ?? ""
  // Cols 17-22: Secondary Address (not mapped — empty)
  // Col 23: Notes (concatenated via notes_builder)
  row[23] = buildArtistNotes({
    artistStatement: artist.artistStatement,
    profileAi: artist.profileAi,
    exhibitionHistory: artist.exhibitionHistory,
    socialProfiles: artist.socialProfilesAi,
    summaryAi: artist.summaryAi,
    tagsAi: artist.tagsAi,
  })
  // Col 24: Bio
  row[24] = artist.bio ?? ""
  // Col 25: Website
  row[25] = urlValidate(artist.website)
  // Col 26: Company / Organization (not mapped — empty)
  // Col 27: Job Title (not mapped — empty)
  // Col 28: Artist (hardcoded "TRUE" — all records are artists)
  row[28] = "TRUE"
  // Col 29: Appraiser (not mapped — empty)
  // Col 30: Groups (campaign hierarchy)
  row[30] = artist.groups
  // Col 31-32: Spouse (not mapped — empty)
  // Col 33: Contact Tags
  row[33] = aiTags(artist.tagsAi)
  // Col 34: Contact Image Url
  row[34] = urlValidate(artist.contactImageUrl)
  // Col 35: Instagram Url
  row[35] = socialMediaProfile(artist.instagramUrl, "instagram")
  // Col 36: Facebook Url
  row[36] = socialMediaProfile(artist.facebookUrl, "facebook")
  // Col 37: Twitter Url
  row[37] = socialMediaProfile(artist.twitterUrl, "twitter")
  // Col 38: LinkedIn Url
  row[38] = socialMediaProfile(artist.linkedinUrl, "linkedin")
  // Col 39: Pinterest URL
  row[39] = socialMediaProfile(artist.pinterestUrl, "pinterest")

  return row
}

// ─── Artwork CSV Row Builder ────────────────────────────

/**
 * Map an enriched artwork to a 68-element array matching AA artwork template.
 * Applies all transforms (field_concatenate, ai_tags, collections_expand,
 * dimension_format, date_format, pipe_separate, notes_builder).
 */
export function buildArtworkCsvRow(artwork: EnrichedArtwork): string[] {
  const row = new Array<string>(AA_ARTWORK_COLUMNS.length).fill("")

  // Col 0: Piece Name
  row[0] = artwork.pieceName ?? ""
  // Col 1: Artist First Name (resolved from linked artist)
  row[1] = artwork.artistFirstName
  // Col 2: Artist Last Name (resolved from linked artist)
  row[2] = artwork.artistLastName
  // Col 3: Inventory Number (not mapped — empty)
  // Col 4: Medium (field_concatenate: artist-submitted + AI)
  row[4] = fieldConcatenate(artwork.medium, artwork.mediumAi)
  // Col 5: Type
  row[5] = artwork.type ?? ""
  // Col 6: Status (not mapped — leave empty, AA manages their own status)
  // Col 7: Height
  row[7] = dimensionFormat(artwork.heightAi, artwork.dimensionsUnitAi)
  // Col 8: Width
  row[8] = dimensionFormat(artwork.widthAi, artwork.dimensionsUnitAi)
  // Col 9: Depth
  row[9] = dimensionFormat(artwork.depthAi, artwork.dimensionsUnitAi)
  // Cols 10-16: Dimension Override, Paper, Framed (not mapped — empty)
  // Col 17: Subject Matter (field_concatenate: artist-submitted + AI)
  row[17] = fieldConcatenate(artwork.subjectMatter, artwork.subjectMatterAi)
  // Cols 18-21: Price, FMV, Wholesale, Insurance (not mapped — empty)
  // Col 22: Creation Date
  row[22] = dateFormat(artwork.yearCreatedDate)
  // Cols 23-24: Circa, Creation date override (not mapped — empty)
  // Col 25: Description
  row[25] = artwork.description ?? ""
  // Col 26: Tags
  row[26] = aiTags(artwork.tagsAi)
  // Col 27: Notes (notes_builder: Exhibition Fit + Purchase Link)
  row[27] = buildArtworkNotes({
    relevanceHypothesisAi: artwork.relevanceHypothesisAi,
    linkToPurchaseUrl: artwork.linkToPurchaseUrl,
  })
  // Col 28: Collections (already resolved in enrichment)
  row[28] = artwork.collections
  // Cols 29-65: Location, Sale, Acquisition, Attribution, etc. (not mapped — empty)
  // Col 66: Piece Image URLs (pipe-separated)
  row[66] = pipeSeparate(artwork.pieceImageUrls)
  // Col 67: Additional File URLs (not mapped — empty)

  return row
}

// ─── CSV Generation ─────────────────────────────────────

/**
 * Generate a complete CSV string from headers and rows.
 */
export function generateCsv(headers: string[], rows: string[][]): string {
  const headerLine = rowToCsv(headers)
  const dataLines = rows.map(rowToCsv)
  return [headerLine, ...dataLines].join("\n")
}

/**
 * Generate the artist CSV for AA import.
 */
export function generateArtistCsv(artists: EnrichedArtist[]): string {
  const headers = AA_ARTIST_COLUMNS.map((col) => col.name)
  const rows = artists.map(buildArtistCsvRow)
  return generateCsv(headers, rows)
}

/**
 * Generate the artwork CSV for AA import.
 */
export function generateArtworkCsv(artworks: EnrichedArtwork[]): string {
  const headers = AA_ARTWORK_COLUMNS.map((col) => col.name)
  const rows = artworks.map(buildArtworkCsvRow)
  return generateCsv(headers, rows)
}

// ─── File Naming ────────────────────────────────────────

function slugify(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 50)
}

export function generateExportFileNames(campaignName: string): {
  artistFileName: string
  artworkFileName: string
} {
  const date = new Date().toISOString().split("T")[0]
  const slug = campaignName === "All Campaigns" ? "All" : slugify(campaignName)
  return {
    artistFileName: `AA-Artists-${slug}-${date}.csv`,
    artworkFileName: `AA-Artworks-${slug}-${date}.csv`,
  }
}

/**
 * Pure data transformation functions for AA export.
 * Each transform: (value, context?) → string
 * All handle null/undefined → ""
 */

// ─── State Abbreviation ─────────────────────────────────────

const STATE_MAP: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR",
  california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID",
  illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS",
  kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM",
  "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA",
  "rhode island": "RI", "south carolina": "SC", "south dakota": "SD",
  tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY",
  // DC + territories
  "district of columbia": "DC",
  "puerto rico": "PR", guam: "GU", "u.s. virgin islands": "VI",
  "american samoa": "AS", "northern mariana islands": "MP",
}

const VALID_ABBREVS = new Set(Object.values(STATE_MAP))

export function stateAbbreviation(value: string | null | undefined): string {
  if (!value) return ""
  const trimmed = value.trim()
  if (!trimmed) return ""
  // Already a valid 2-letter abbreviation
  if (trimmed.length === 2 && VALID_ABBREVS.has(trimmed.toUpperCase())) {
    return trimmed.toUpperCase()
  }
  // Look up full name
  const abbrev = STATE_MAP[trimmed.toLowerCase()]
  return abbrev ?? trimmed // Pass through non-US or unrecognized
}

// ─── URL Validate ───────────────────────────────────────────

export function urlValidate(value: string | null | undefined): string {
  if (!value) return ""
  let url = value.trim()
  if (!url) return ""
  // Add https:// if no protocol
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }
  // Strip trailing slash
  url = url.replace(/\/+$/, "")
  return url
}

// ─── Social Media Profile ───────────────────────────────────

interface SocialPlatform {
  patterns: RegExp[]
  canonical: (handle: string) => string
}

const SOCIAL_PLATFORMS: Record<string, SocialPlatform> = {
  instagram: {
    patterns: [/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#\s]+)/i],
    canonical: (h) => `https://www.instagram.com/${h}`,
  },
  facebook: {
    patterns: [/(?:https?:\/\/)?(?:www\.)?facebook\.com\/([^/?#\s]+)/i],
    canonical: (h) => `https://www.facebook.com/${h}`,
  },
  linkedin: {
    patterns: [/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([^/?#\s]+)/i],
    canonical: (h) => `https://www.linkedin.com/in/${h}`,
  },
  pinterest: {
    patterns: [/(?:https?:\/\/)?(?:www\.)?pinterest\.com\/([^/?#\s]+)/i],
    canonical: (h) => `https://www.pinterest.com/${h}`,
  },
  twitter: {
    patterns: [
      /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([^/?#\s]+)/i,
    ],
    canonical: (h) => `https://x.com/${h}`,
  },
}

/**
 * Platform-aware social URL normalization.
 * Accepts handles (@user, user), partial URLs, full URLs.
 * `platform` param required to determine which platform to normalize for.
 */
export function socialMediaProfile(
  value: string | null | undefined,
  platform?: string,
): string {
  if (!value) return ""
  let input = value.trim()
  if (!input) return ""

  // Try to detect platform from URL if not specified
  let detectedPlatform = platform?.toLowerCase()
  if (!detectedPlatform) {
    for (const [name, config] of Object.entries(SOCIAL_PLATFORMS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(input)) {
          detectedPlatform = name
          break
        }
      }
      if (detectedPlatform) break
    }
  }

  if (!detectedPlatform || !SOCIAL_PLATFORMS[detectedPlatform]) {
    // Unknown platform — just validate as URL
    return urlValidate(input)
  }

  const config = SOCIAL_PLATFORMS[detectedPlatform]

  // Try to extract handle from URL
  for (const pattern of config.patterns) {
    const match = input.match(pattern)
    if (match?.[1]) {
      return config.canonical(match[1])
    }
  }

  // Strip @ prefix and treat as handle
  const handle = input.replace(/^@/, "")
  if (handle) {
    return config.canonical(handle)
  }

  return ""
}

// ─── Title Case (addresses only — never artist names) ───────

// Words that stay uppercase in addresses
const ADDRESS_UPPERS = new Set([
  "NE", "NW", "SE", "SW", "N", "S", "E", "W",
  "NE.", "NW.", "SE.", "SW.", "N.", "S.", "E.", "W.",
  "PO", "APT", "STE", "FL", "US", "USA",
])

// Words that stay lowercase
const ADDRESS_LOWERS = new Set(["of", "the", "and", "at"])

// Patterns for Mc/Mac names (McAllister, MacDonald)
const MC_PATTERN = /^(mc)(\w)/i
const MAC_PATTERN = /^(mac)(\w{3,})/i

function titleCaseWord(word: string, index: number): string {
  const upper = word.toUpperCase()
  // Directionals and abbreviations stay uppercase
  if (ADDRESS_UPPERS.has(upper) || ADDRESS_UPPERS.has(upper + ".")) {
    return upper.replace(/\.?$/, word.endsWith(".") ? "." : "")
  }
  // Minor words lowercase (except first word)
  if (index > 0 && ADDRESS_LOWERS.has(word.toLowerCase())) {
    return word.toLowerCase()
  }
  // Ordinals: 1st, 2nd, 3rd, 4th, etc.
  if (/^\d+(st|nd|rd|th)$/i.test(word)) {
    return word.toLowerCase()
  }
  // Mc* pattern
  const mcMatch = word.match(MC_PATTERN)
  if (mcMatch) {
    return "Mc" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase()
  }
  // Mac* pattern (only if 3+ chars after Mac to avoid "Mace" etc.)
  const macMatch = word.match(MAC_PATTERN)
  if (macMatch) {
    return "Mac" + word.charAt(3).toUpperCase() + word.slice(4).toLowerCase()
  }
  // Default: capitalize first letter
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

export function titleCase(value: string | null | undefined): string {
  if (!value) return ""
  const trimmed = value.trim()
  if (!trimmed) return ""
  return trimmed
    .split(/\s+/)
    .map((word, i) => titleCaseWord(word, i))
    .join(" ")
}

// ─── Phone Normalize ────────────────────────────────────────

export function phoneNormalize(value: string | null | undefined): string {
  if (!value) return ""
  const trimmed = value.trim()
  if (!trimmed) return ""
  // Strip all non-digit, non-plus characters
  const digits = trimmed.replace(/[^\d+]/g, "")
  if (!digits) return ""
  // Pass through as-is — AA accepted wide format variation
  // Just clean up obvious whitespace/formatting issues
  return trimmed.replace(/\s+/g, " ").trim()
}

// ─── Pipe Separate ──────────────────────────────────────────

export function pipeSeparate(value: string | null | undefined): string {
  if (!value) return ""
  const trimmed = value.trim()
  if (!trimmed) return ""
  // Handle JSON array, comma-separated, or newline-separated
  let urls: string[]
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      urls = parsed.map((u: unknown) => String(u).trim()).filter(Boolean)
    } else {
      urls = [trimmed]
    }
  } catch {
    // Split by comma or newline
    urls = trimmed.split(/[,\n]+/).map((u) => u.trim()).filter(Boolean)
  }
  // Validate each URL
  return urls.map((u) => urlValidate(u)).filter(Boolean).join("|")
}

// ─── Dimension Format ───────────────────────────────────────

/**
 * Convert number to string for AA dimensions.
 * null/undefined/0 → ""
 * If unit is "cm", converts to inches (÷ 2.54).
 */
export function dimensionFormat(
  value: number | string | null | undefined,
  unit?: string | null,
): string {
  if (value === null || value === undefined) return ""
  const num = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(num) || num === 0) return ""
  // Convert cm to inches if needed
  const inches = unit?.toLowerCase() === "cm" ? num / 2.54 : num
  // Return as string — no evidence of decimal precision limits in AA
  return String(parseFloat(inches.toFixed(4)))
}

// ─── Date Format ────────────────────────────────────────────

export function dateFormat(value: string | null | undefined): string {
  if (!value) return ""
  const trimmed = value.trim()
  if (!trimmed) return ""
  // Year-only: pass through
  if (/^\d{4}$/.test(trimmed)) return trimmed
  // ISO date (yyyy-mm-dd)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`
  }
  // Already mm/dd/yyyy: pass through
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed
  // Pass through anything else — don't over-transform
  return trimmed
}

// ─── Strip Markdown ─────────────────────────────────────────

export function stripMarkdown(value: string | null | undefined): string {
  if (!value) return ""
  return (
    value
      // Headers
      .replace(/^#{1,6}\s+/gm, "")
      // Bold/italic
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
      // Links [text](url) → text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Images ![alt](url) → alt
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      // Inline code
      .replace(/`([^`]+)`/g, "$1")
      // Horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // Blockquotes
      .replace(/^>\s+/gm, "")
      // Unordered lists
      .replace(/^[\s]*[-*+]\s+/gm, "")
      // Ordered lists
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // Clean up extra blank lines
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  )
}

// ─── AI Tags ────────────────────────────────────────────────

export function aiTags(value: string | null | undefined): string {
  if (!value) return ""
  const trimmed = value.trim()
  if (!trimmed) return ""
  const tags = trimmed
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
  // Deduplicate (case-insensitive) and sort
  const seen = new Map<string, string>()
  for (const tag of tags) {
    const key = tag.toLowerCase()
    if (!seen.has(key)) seen.set(key, tag)
  }
  return Array.from(seen.values()).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  ).join(", ")
}

// ─── Notes Builder ──────────────────────────────────────────

const SECTION_SEPARATOR = "══════════════════════════════"

export interface NotesSection {
  heading: string
  content: string | null | undefined
  /** If true, strip markdown from content before including */
  stripMd?: boolean
}

/**
 * Build concatenated notes field from multiple sources.
 * Sections with empty/null content are omitted.
 */
export function notesBuilder(sections: NotesSection[]): string {
  const parts: string[] = []

  for (const section of sections) {
    let content = section.content?.trim()
    if (!content) continue
    if (section.stripMd) {
      content = stripMarkdown(content)
    }
    // Strip if the content is just the heading repeated (with or without colon/case variation)
    const headingNorm = section.heading.replace(/\s*\(AI\)/i, "").trim().toLowerCase()
    const contentNorm = content.replace(/[:\s]+$/, "").trim().toLowerCase()
    if (contentNorm === headingNorm) continue
    // Strip leading line if it duplicates the heading (e.g., user typed "Artist Statement:\n...")
    const lines = content.split("\n")
    if (lines[0].replace(/[:\s]+$/, "").trim().toLowerCase() === headingNorm) {
      content = lines.slice(1).join("\n").trim()
      if (!content) continue
    }
    parts.push(`${section.heading}:\n${content}`)
  }

  return parts.join(`\n\n${SECTION_SEPARATOR}\n`)
}

// ─── Artist Notes Builder (convenience) ─────────────────────

export interface ArtistNotesContext {
  artistStatement: string | null | undefined
  profileAi: string | null | undefined
  exhibitionHistory: string | null | undefined
  socialProfiles: string | null | undefined
  summaryAi: string | null | undefined
  tagsAi: string | null | undefined
}

export function buildArtistNotes(ctx: ArtistNotesContext): string {
  return notesBuilder([
    { heading: "ARTIST STATEMENT", content: ctx.artistStatement },
    { heading: "SUMMARY (AI)", content: ctx.summaryAi },
    { heading: "EXHIBITION HISTORY", content: ctx.exhibitionHistory },
    { heading: "ADDITIONAL SOCIAL PROFILES (AI)", content: ctx.socialProfiles },
    { heading: "TAGS (AI)", content: ctx.tagsAi },
    { heading: "ARTIST PROFILE (AI)", content: ctx.profileAi, stripMd: true },
  ])
}

// ─── Artwork Notes Builder (convenience) ────────────────────

export interface ArtworkNotesContext {
  relevanceHypothesisAi: string | null | undefined
  linkToPurchaseUrl: string | null | undefined
}

export function buildArtworkNotes(ctx: ArtworkNotesContext): string {
  // Only include relevance hypothesis if not "SKIP"
  const relevance =
    ctx.relevanceHypothesisAi?.trim() &&
    ctx.relevanceHypothesisAi.trim().toUpperCase() !== "SKIP"
      ? ctx.relevanceHypothesisAi
      : null

  return notesBuilder([
    { heading: "EXHIBITION FIT (AI)", content: relevance },
    { heading: "PURCHASE LINK", content: ctx.linkToPurchaseUrl },
  ])
}

// ─── Field Concatenate ──────────────────────────────────────

/**
 * Concatenate artist-submitted + AI analysis values.
 * AI value appended below with "AI ANALYSIS:" prefix, only if different.
 */
export function fieldConcatenate(
  artistValue: string | null | undefined,
  aiValue: string | null | undefined,
): string {
  const artist = artistValue?.trim() ?? ""
  const ai = aiValue?.trim() ?? ""

  if (!artist && !ai) return ""
  if (!ai) return artist
  if (!artist) return ai

  // Only append AI if different from artist value
  if (artist.toLowerCase() === ai.toLowerCase()) return artist

  return `${artist}\n\nAI ANALYSIS: ${ai}`
}

// ─── Collections Expand ─────────────────────────────────────

export interface CollectionsContext {
  campaignName: string | null | undefined
  partnerOrgName: string | null | undefined
  year: string | null | undefined
}

/**
 * Generate comma-separated collection hierarchy for AA Collections column.
 * 1. Campaign name (always)
 * 2. Org + year (if partner org exists)
 * 3. Org all-time (if partner org exists)
 */
export function collectionsExpand(ctx: CollectionsContext): string {
  const campaign = ctx.campaignName?.trim()
  if (!campaign) return ""

  const collections: string[] = [campaign]
  const org = ctx.partnerOrgName?.trim()

  if (org) {
    const year = ctx.year?.trim()
    if (year) {
      collections.push(`${org} ${year}`)
    }
    collections.push(org)
  }

  // Deduplicate while preserving order
  const seen = new Set<string>()
  const deduped: string[] = []
  for (const c of collections) {
    if (!seen.has(c)) {
      seen.add(c)
      deduped.push(c)
    }
  }

  return deduped.join(", ")
}

// ─── Nationality Normalize ──────────────────────────────

const NATIONALITY_MAP: Record<string, string> = {
  "united states": "American", "usa": "American", "us": "American", "u.s.": "American", "u.s.a.": "American",
  "canada": "Canadian", "mexico": "Mexican", "brazil": "Brazilian", "argentina": "Argentine",
  "colombia": "Colombian", "chile": "Chilean", "peru": "Peruvian", "venezuela": "Venezuelan",
  "cuba": "Cuban", "puerto rico": "Puerto Rican", "dominican republic": "Dominican",
  "costa rica": "Costa Rican", "guatemala": "Guatemalan", "honduras": "Honduran",
  "el salvador": "Salvadoran", "panama": "Panamanian", "ecuador": "Ecuadorian",
  "uruguay": "Uruguayan", "bolivia": "Bolivian", "paraguay": "Paraguayan",
  "united kingdom": "British", "uk": "British", "england": "English", "scotland": "Scottish",
  "wales": "Welsh", "ireland": "Irish", "france": "French", "germany": "German",
  "italy": "Italian", "spain": "Spanish", "portugal": "Portuguese", "netherlands": "Dutch",
  "belgium": "Belgian", "switzerland": "Swiss", "austria": "Austrian", "sweden": "Swedish",
  "norway": "Norwegian", "denmark": "Danish", "finland": "Finnish", "iceland": "Icelandic",
  "poland": "Polish", "czech republic": "Czech", "czechia": "Czech",
  "hungary": "Hungarian", "romania": "Romanian", "greece": "Greek",
  "turkey": "Turkish", "russia": "Russian", "ukraine": "Ukrainian",
  "china": "Chinese", "japan": "Japanese", "south korea": "South Korean", "korea": "Korean",
  "india": "Indian", "pakistan": "Pakistani", "bangladesh": "Bangladeshi",
  "philippines": "Filipino", "vietnam": "Vietnamese", "thailand": "Thai",
  "indonesia": "Indonesian", "malaysia": "Malaysian", "singapore": "Singaporean",
  "taiwan": "Taiwanese", "israel": "Israeli", "iran": "Iranian", "iraq": "Iraqi",
  "saudi arabia": "Saudi", "egypt": "Egyptian", "nigeria": "Nigerian",
  "south africa": "South African", "kenya": "Kenyan", "ghana": "Ghanaian",
  "ethiopia": "Ethiopian", "morocco": "Moroccan", "tanzania": "Tanzanian",
  "australia": "Australian", "new zealand": "New Zealander",
  "jamaica": "Jamaican", "trinidad and tobago": "Trinidadian", "haiti": "Haitian",
  "lebanon": "Lebanese", "syria": "Syrian", "jordan": "Jordanian",
}

/**
 * Convert country name to nationality adjective.
 * "United States" → "American", "Canada" → "Canadian".
 * Already-correct nationalities pass through unchanged.
 */
export function nationalityNormalize(value: string | null | undefined): string {
  if (!value) return ""
  const trimmed = value.trim()
  if (!trimmed) return ""
  const normalized = NATIONALITY_MAP[trimmed.toLowerCase()]
  return normalized ?? trimmed
}

// ─── Transform Dispatcher ───────────────────────────────────

import type { TransformType } from "../types"

/**
 * Apply a named transform to a value.
 * For transforms that need context (notes_builder, field_concatenate,
 * collections_expand), use the specific functions directly.
 */
export function applyTransform(
  transform: TransformType | null,
  value: string | null | undefined,
  options?: { platform?: string; unit?: string | null },
): string {
  if (!transform || transform === "none") return value ?? ""

  switch (transform) {
    case "state_abbreviation":
      return stateAbbreviation(value)
    case "url_validate":
      return urlValidate(value)
    case "social_media_profile":
      return socialMediaProfile(value, options?.platform)
    case "title_case":
      return titleCase(value)
    case "phone_normalize":
      return phoneNormalize(value)
    case "pipe_separate":
      return pipeSeparate(value)
    case "dimension_format":
      return dimensionFormat(value, options?.unit)
    case "date_format":
      return dateFormat(value)
    case "strip_markdown":
      return stripMarkdown(value)
    case "ai_tags":
      return aiTags(value)
    case "nationality_normalize":
      return nationalityNormalize(value)
    // These require structured context — use specific functions directly
    case "notes_builder":
    case "field_concatenate":
    case "collections_expand":
      return value ?? ""
    default:
      return value ?? ""
  }
}

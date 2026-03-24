// ─── Status Types ────────────────────────────────────────
// Artist status tracks enrichment only (issue #91).
// Export lifecycle is tracked on artworks, not artists.
// "Approved for Export" | "Exported" | "Accepted" retained for historical records only.
export type ArtistStatus =
  | "Pending - Imported"
  | "In Progress"
  | "Pending - Enriched"
  | "Needs Review"
  | "Approved for Export" // legacy — not set by export pipeline
  | "Exported"            // legacy — not set by export pipeline
  | "Accepted"            // legacy — not set by export pipeline
  | "On Hold"
  | "Error - Data"
  | "Error - Automation"

export type ArtworkStatus =
  | "Pending - Imported"
  | "In Progress"
  | "Pending - Enriched"
  | "Needs Review"
  | "Approved for Export"
  | "Exported"
  | "Accepted"
  | "On Hold"
  | "Error - Data"
  | "Error - Automation"

export type ExportStatus =
  | "In Progress"
  | "Exported"
  | "Delivered"
  | "Accepted"
  | "Rejected"
  | "Failed"

export type UserRole = "admin" | "curator" | "viewer"

// ─── Domain Types ────────────────────────────────────────

export interface Artist {
  id: string
  fullName: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  bio: string | null
  artistStatement: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  country: string | null
  nationality: string | null
  primaryAddress: string | null
  address2: string | null
  phone: string | null
  website: string | null
  instagramUrl: string | null
  facebookUrl: string | null
  twitterUrl: string | null
  linkedinUrl: string | null
  pinterestUrl: string | null
  contactImageUrl: string | null
  contactThumbnailUrl: string | null
  submissionIdPaperform: string | null
  status: ArtistStatus
  profileAi: string | null
  summaryAi: string | null
  tagsAi: string | null
  socialProfilesAi: string | null
  campaignIds: string[]
  artworkIds: string[]
  partnerOrgIds: string[]
}

export interface Artwork {
  id: string
  pieceName: string | null
  type: string | null
  medium: string | null
  subjectMatter: string | null
  description: string | null
  pieceImageUrls: string | null
  pieceThumbnailUrl: string | null
  yearCreatedDate: string | null
  status: ArtworkStatus
  statusFromArtist: string | null
  mediumAi: string | null
  subjectMatterAi: string | null
  tagsAi: string | null
  relevanceHypothesisAi: string | null
  heightAi: number | null
  widthAi: number | null
  depthAi: number | null
  dimensionsUnitAi: string | null
  artistIds: string[]
  campaignIds: string[]
  campaignDescriptions: string | null
  linkToPurchaseUrl: string | null
  artistEmail: string | null
  submissionIdPaperform: string | null
}

export interface Campaign {
  id: string
  campaignName: string | null
  campaignDescriptions: string | null
  campaignLogoUrl: string | null
  campaignContactEmails: string | null
  officialExhibitionName: string | null
  exhibitionVenue: string | null
  exhibitionAddress: string | null
  exhibitionUrl: string | null
  exhibitionOpen: string | null
  exhibitionClose: string | null
  artistIds: string[]
  artworkIds: string[]
  partnerOrgIds: string[]
}

export interface PartnerOrg {
  id: string
  organizationName: string | null
  missionStatement: string | null
  contactName: string | null
  contactEmail: string | null
  curatorName: string | null
  curatorEmail: string | null
  curatorPronouns: string | null
  curatorBio: string | null
  status: string | null
  campaignIds: string[]
  artistIds: string[]
}

export type TransformType =
  | "none"
  | "state_abbreviation"
  | "url_validate"
  | "social_media_profile"
  | "title_case"
  | "phone_normalize"
  | "pipe_separate"
  | "dimension_format"
  | "date_format"
  | "strip_markdown"
  | "ai_tags"
  | "notes_builder"
  | "field_concatenate"
  | "collections_expand"
  | "nationality_normalize"

export type ExportType = "Full" | "Campaign" | "Preview"

export interface FieldMapping {
  id: string
  entityType: "artist" | "artwork"
  sourceField: string
  targetColumn: string
  targetColumnIndex: number
  transform: TransformType | null
  defaultValue: string | null
  writeBack: boolean
  active: boolean
  notes: string | null
}

export interface ExportLog {
  id: string
  exportId: string | null
  timestamp: string | null
  exportStatus: ExportStatus | null
  artistCount: string | null
  artworkCount: string | null
  campaignNames: string | null
  exportNotes: string | null
  exportedFileName: string | null
  artistCsvUrl: string | null
  artworkCsvUrl: string | null
  exportType: ExportType | null
  campaignFilter: string | null
  triggeredBy: string | null
  artistRecordIds: string | null
  artworkRecordIds: string | null
  emailRecipients: string | null
  emailCc: string | null
  emailSubject: string | null
  emailBody: string | null
  emailSentAt: string | null
  emailStatus: string | null
}

export interface User {
  id: string
  email: string
  displayName: string
  role: UserRole
}

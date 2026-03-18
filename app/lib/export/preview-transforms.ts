/**
 * Apply display-relevant transforms to preview data.
 * These are the transforms that affect how data looks in the UI —
 * not the heavy export-only transforms (notes_builder, collections_expand, etc.).
 */

import type { Artist, Artwork } from "@/lib/types"
import {
  titleCase,
  stateAbbreviation,
  urlValidate,
  socialMediaProfile,
  aiTags,
} from "./transforms"

export function transformArtistForPreview(artist: Artist): Artist {
  return {
    ...artist,
    // Address transforms
    primaryAddress: titleCase(artist.primaryAddress),
    address2: titleCase(artist.address2),
    city: titleCase(artist.city),
    state: stateAbbreviation(artist.state),
    // URL transforms
    website: urlValidate(artist.website),
    contactImageUrl: artist.contactImageUrl, // Don't transform — used as image src
    // Social media transforms
    instagramUrl: socialMediaProfile(artist.instagramUrl, "instagram"),
    facebookUrl: socialMediaProfile(artist.facebookUrl, "facebook"),
    twitterUrl: socialMediaProfile(artist.twitterUrl, "twitter"),
    linkedinUrl: socialMediaProfile(artist.linkedinUrl, "linkedin"),
    pinterestUrl: socialMediaProfile(artist.pinterestUrl, "pinterest"),
    // Tags
    tagsAi: aiTags(artist.tagsAi),
  }
}

export function transformArtworkForPreview(artwork: Artwork): Artwork {
  return {
    ...artwork,
    // Keep original artist-submitted values for medium/subjectMatter
    // The field_concatenate happens only at CSV export time
    // Tags
    tagsAi: aiTags(artwork.tagsAi),
  }
}

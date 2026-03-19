"use client"

import Image from "next/image"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { EnrichedArtist, EnrichedArtwork } from "@/lib/export/enrichment"
import { buildArtistNotes, buildArtworkNotes } from "@/lib/export/transforms"

// ─── Field Display Helper ────────────────────────────────

function Field({
  label,
  value,
  isUrl,
}: {
  label: string
  value: string | number | null | undefined
  isUrl?: boolean
}) {
  if (!value && value !== 0) return null
  const display = String(value)
  return (
    <div className="py-3">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">
        {isUrl ? (
          <a
            href={display}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 break-all"
          >
            {display}
          </a>
        ) : (
          <span className="break-words">{display}</span>
        )}
      </dd>
    </div>
  )
}

/** Like Field but shows empty values with a dash — useful for showing all AA export columns */
function FieldOrEmpty({
  label,
  value,
  isUrl,
}: {
  label: string
  value: string | number | null | undefined
  isUrl?: boolean
}) {
  if (!value && value !== 0) {
    return (
      <div className="py-3">
        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </dt>
        <dd className="mt-0.5 text-sm text-muted-foreground/50">—</dd>
      </div>
    )
  }
  return <Field label={label} value={value} isUrl={isUrl} />
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-8 pb-2">
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
        {children}
      </h3>
      <Separator className="mt-2" />
    </div>
  )
}

// ─── Artist Detail ───────────────────────────────────────

export function ArtistDetailSheet({
  artist,
  artworks,
  open,
  onOpenChange,
}: {
  artist: EnrichedArtist | null
  artworks: EnrichedArtwork[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!artist) return null

  const location = [artist.city, artist.state, artist.country]
    .filter(Boolean)
    .join(", ")

  const socialFields = [
    { label: "Instagram", value: artist.instagramUrl },
    { label: "Facebook", value: artist.facebookUrl },
    { label: "Twitter / X", value: artist.twitterUrl },
    { label: "LinkedIn", value: artist.linkedinUrl },
    { label: "Pinterest", value: artist.pinterestUrl },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto p-6">
        <SheetHeader className="pb-6">
          <div className="flex items-center gap-4">
            {artist.contactImageUrl && (
              <div className="relative h-16 w-16 flex-shrink-0">
                <Image
                  src={artist.contactImageUrl}
                  alt={artist.fullName ?? "Artist"}
                  fill
                  className="rounded-full object-cover"
                  unoptimized
                />
              </div>
            )}
            <div>
              <SheetTitle className="text-xl">
                {artist.fullName ?? "Unknown Artist"}
              </SheetTitle>
              {location && (
                <p className="text-sm text-muted-foreground">{location}</p>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-0 pb-8">
          <SectionHeading>Contact</SectionHeading>
          <Field label="Email" value={artist.email} />
          <FieldOrEmpty label="Phone" value={artist.phone} />
          <Field label="Website" value={artist.website} isUrl />
          <Field label="Primary Address" value={artist.primaryAddress} />
          {artist.address2 && <Field label="Address 2" value={artist.address2} />}
          <Field
            label="Location"
            value={[artist.city, artist.state, artist.zipCode, artist.country]
              .filter(Boolean)
              .join(", ")}
          />
          <Field label="Nationality" value={artist.nationality} />
          <Field label="Groups (AA)" value={artist.groups} />

          <SectionHeading>Social Media</SectionHeading>
          {socialFields.map((s) => (
            <FieldOrEmpty key={s.label} label={s.label} value={s.value} isUrl />
          ))}

          <SectionHeading>Bio &amp; Statement</SectionHeading>
          {artist.bio && (
            <div className="py-3">
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Bio
              </dt>
              <dd className="mt-0.5 text-sm whitespace-pre-line leading-relaxed">
                {artist.bio}
              </dd>
            </div>
          )}
          {artist.artistStatement && (
            <div className="py-3">
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Artist Statement
              </dt>
              <dd className="mt-0.5 text-sm whitespace-pre-line leading-relaxed">
                {artist.artistStatement}
              </dd>
            </div>
          )}

          {(artist.profileAi || artist.summaryAi || artist.tagsAi) && (
            <>
              <SectionHeading>AI Enrichment</SectionHeading>
              {artist.summaryAi && (
                <div className="py-3">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Summary
                  </dt>
                  <dd className="mt-0.5 text-sm whitespace-pre-line leading-relaxed">
                    {artist.summaryAi}
                  </dd>
                </div>
              )}
              {artist.tagsAi && (
                <div className="py-3">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Tags (AI)
                  </dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {artist.tagsAi.split(",").map((tag) => (
                      <Badge key={tag.trim()} variant="secondary" className="text-xs">
                        {tag.trim()}
                      </Badge>
                    ))}
                  </dd>
                </div>
              )}
              {artist.profileAi && (
                <div className="py-3">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    AI Profile
                  </dt>
                  <dd className="mt-0.5 text-sm whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                    {artist.profileAi}
                  </dd>
                </div>
              )}
              {artist.socialProfilesAi && (
                <Field label="Social Profiles (AI)" value={artist.socialProfilesAi} />
              )}
            </>
          )}

          {/* Notes Preview */}
          <SectionHeading>Notes Preview (Export)</SectionHeading>
          <div className="py-3">
            <dd className="text-sm whitespace-pre-line leading-relaxed bg-muted/50 rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs">
              {buildArtistNotes({
                artistStatement: artist.artistStatement,
                profileAi: artist.profileAi,
                exhibitionHistory: artist.exhibitionHistory ?? null,
                socialProfiles: artist.socialProfilesAi,
                summaryAi: artist.summaryAi,
                tagsAi: artist.tagsAi,
                partnerOrgs: artist.partnerOrgs ?? [],
              }) || "No notes content available."}
            </dd>
          </div>

          {artworks.length > 0 && (
            <>
              <SectionHeading>
                Artworks ({artworks.length})
              </SectionHeading>
              <div className="space-y-3 pt-2">
                {artworks.map((aw) => {
                  const imgUrl = aw.pieceImageUrls?.split("|")[0]?.trim()
                  return (
                    <div key={aw.id} className="flex gap-3 items-start">
                      {imgUrl ? (
                        <div className="relative h-12 w-12 flex-shrink-0">
                          <Image
                            src={imgUrl}
                            alt={aw.pieceName ?? "Artwork"}
                            fill
                            className="rounded object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 flex-shrink-0 rounded bg-muted" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{aw.pieceName ?? "Untitled"}</p>
                        <p className="text-xs text-muted-foreground">
                          {[aw.type, aw.medium].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Artwork Detail ──────────────────────────────────────

export function ArtworkDetailSheet({
  artwork,
  artistName,
  open,
  onOpenChange,
}: {
  artwork: EnrichedArtwork | null
  artistName?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!artwork) return null

  const firstImageUrl = artwork.pieceImageUrls?.split("|")[0]?.trim()
  const dimensions = [artwork.heightAi, artwork.widthAi, artwork.depthAi]
    .filter((d) => d != null && d > 0)
    .join(" × ")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto p-6">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-xl">
            {artwork.pieceName ?? "Untitled"}
          </SheetTitle>
          {artistName && (
            <p className="text-sm font-medium">{artistName}</p>
          )}
          {artwork.artistEmail && (
            <p className="text-sm text-muted-foreground">{artwork.artistEmail}</p>
          )}
        </SheetHeader>

        {firstImageUrl && (
          <div className="relative w-full aspect-square max-h-64 mb-6">
            <Image
              src={firstImageUrl}
              alt={artwork.pieceName ?? "Artwork"}
              fill
              className="rounded-lg object-contain bg-muted"
              unoptimized
            />
          </div>
        )}

        <div className="space-y-0 pb-8">
          {/* Artist-entered fields first */}
          {artwork.description && (
            <>
              <SectionHeading>Description</SectionHeading>
              <div className="py-3">
                <dd className="text-sm whitespace-pre-line leading-relaxed">
                  {artwork.description}
                </dd>
              </div>
            </>
          )}

          <SectionHeading>Details</SectionHeading>
          <Field label="Type" value={artwork.type} />
          <Field label="Medium" value={artwork.medium} />
          <Field label="Subject Matter" value={artwork.subjectMatter} />
          <Field label="Year Created" value={artwork.yearCreatedDate} />
          <Field label="Collections (AA)" value={artwork.collections} />
          <Field label="Purchase Link" value={artwork.linkToPurchaseUrl} isUrl />

          {/* AI-generated fields — clearly labeled */}
          {(artwork.mediumAi || artwork.subjectMatterAi || artwork.tagsAi || artwork.relevanceHypothesisAi || dimensions) && (
            <>
              <SectionHeading>AI Enrichment</SectionHeading>
              {dimensions && (
                <Field
                  label="Dimensions (AI)"
                  value={`${dimensions}${artwork.dimensionsUnitAi ? ` ${artwork.dimensionsUnitAi}` : ""}`}
                />
              )}
              <Field label="Medium (AI)" value={artwork.mediumAi} />
              <Field label="Subject Matter (AI)" value={artwork.subjectMatterAi} />
              {artwork.tagsAi && (
                <div className="py-3">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Tags (AI)
                  </dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {artwork.tagsAi.split(",").map((tag) => (
                      <Badge key={tag.trim()} variant="secondary" className="text-xs">
                        {tag.trim()}
                      </Badge>
                    ))}
                  </dd>
                </div>
              )}
              {artwork.relevanceHypothesisAi &&
                artwork.relevanceHypothesisAi.toUpperCase() !== "SKIP" && (
                  <div className="py-3">
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Exhibition Fit (AI)
                    </dt>
                    <dd className="mt-0.5 text-sm whitespace-pre-line leading-relaxed">
                      {artwork.relevanceHypothesisAi}
                    </dd>
                  </div>
                )}
            </>
          )}

          {/* Notes preview last */}
          {(() => {
            const notes = buildArtworkNotes({
              relevanceHypothesisAi: artwork.relevanceHypothesisAi,
              linkToPurchaseUrl: artwork.linkToPurchaseUrl,
              partnerOrgs: artwork.partnerOrgs ?? [],
            })
            return notes ? (
              <>
                <SectionHeading>Notes Preview (Export)</SectionHeading>
                <div className="py-3">
                  <dd className="text-sm whitespace-pre-line leading-relaxed bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs">
                    {notes}
                  </dd>
                </div>
              </>
            ) : null
          })()}
        </div>
      </SheetContent>
    </Sheet>
  )
}

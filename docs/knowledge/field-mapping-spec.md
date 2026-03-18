# Field Mapping Specification — Artwork Archive Export

> Consolidated reference for the Phase C export utility (#74).
> Source: Airtable base `appDFU2JdAw2Ckax4` → Artwork Archive CSV import format.

---

## Artist Mappings (AA has 40 columns)

> Rebuilt 2026-03-18 from AA-Artist-Template.xlsx. Previous version had 34 columns — was missing cols 33-39.

### Direct Mappings

| # | AA Column | Airtable Field | Transform | Write Back | Notes |
|---|-----------|---------------|-----------|:---:|-------|
| 0 | First Name / Company Name | `First Name` | none | | Required |
| 1 | Last Name | `Last Name` | none | | |
| 3 | Nationality | `Nationality` | none | | |
| 6 | Email | `Email` | none | | |
| 11 | Primary Address 1 | `Primary Address` | `title_case` | ✓ | Address only — never names |
| 12 | Address 2 | `Address 2` | `title_case` | ✓ | |
| 13 | City | `City` | `title_case` | ✓ | e.g., "REHOBOTH BEACH" → "Rehoboth Beach" |
| 14 | State | `State` | `state_abbreviation` | ✓ | "Florida" → "FL" |
| 15 | Zip | `Zip` | none | | |
| 16 | Country | `Country` | none | | |
| 24 | Bio | `Bio` | none | | Direct mapping |
| 25 | Website | `Website` | `url_validate` | ✓ | |
| 28 | Artist | (hardcoded) | none | | Always "yes" |
| 33 | Contact Tags | `AI Tags` | `ai_tags` | | Dedup, sort alphabetically |
| 34 | Contact Image Url | `Contact Image URL` | `url_validate` | | Use Paperform S3/CDN URL — NEVER Airtable thumbnail |
| 35 | Instagram Url | `Instagram URL` | `social_media_profile` | ✓ | Normalize to canonical URL |
| 36 | Facebook Url | `Facebook URL` | `social_media_profile` | ✓ | Normalize to canonical URL |
| 37 | Twitter Url | `Twitter URL` | `social_media_profile` | ✓ | Normalize to canonical URL |
| 38 | LinkedIn Url | `LinkedIn URL` | `social_media_profile` | ✓ | Normalize to canonical URL |
| 39 | Pinterest URL | `Pinterest URL` | `social_media_profile` | ✓ | Normalize to canonical URL |

### Notes Field (col 23) — Concatenation

Assembled at export time via `notes_builder`. Never written back to Airtable.

Social URLs now have dedicated AA columns (35-39) — removed from Notes builder.

**Order** (short predictable sections first, long AI content last):
```
ARTIST STATEMENT:
{Artist Statement}

══════════════════════════════
SUMMARY (AI):
{Artist Summary (AI)}

══════════════════════════════
EXHIBITION HISTORY:
Participated in {Official Exhibition Name} presented by {Organization Name}
(one line per campaign/partner)

══════════════════════════════
ADDITIONAL SOCIAL PROFILES (AI):
{Social Profiles (AI) — only platforms NOT covered by cols 35-39, e.g., YouTube, TikTok, Behance}
(only include if present)

══════════════════════════════
TAGS (AI):
{AI Tags}

══════════════════════════════
ARTIST PROFILE (AI):
{Artist Profile (AI) — markdown stripped}
(longest section — placed last so shorter sections are visible first)
```

### Groups Field (col 30)

Campaign Name(s) as comma-separated list — same as Collections concept for artists.

### Columns Left Blank

Title (2), Birth Date (4), Death Date (5), Secondary Email (7), Phone (8)*, Mobile Phone (9), Work Phone (10), Secondary Address fields (17-22), Company/Organization (26), Job Title (27), Appraiser (29), Spouse fields (31-32)

*Phone: `phone_normalize` transform exists but AA accepted wide format variation. TBD.

---

## Artwork Mappings (AA has 68 columns)

> Rebuilt 2026-03-18 from AA-Artworks-Template.xlsx. Previous version had 63 columns — indices were off from col 10 onward.

### Direct Mappings

| # | AA Column | Airtable Field | Transform | Write Back | Notes |
|---|-----------|---------------|-----------|:---:|-------|
| 0 | Piece Name | `Piece Name` | none | | |
| 1 | Artist First Name | `First Name (from Artist)` | none | | Lookup |
| 2 | Artist Last Name | `Last Name (from Artist)` | none | | Lookup |
| 5 | Type | `Type` | validate against AA enum | | Book, Ceramics, Collage, Digital, Drawing, Fiber, Film/Video, Furniture, Garment, Glass, Illustration, Installation, Jewelry, Metalworks, Mixed Media, Mosaic, Mural, New Media, Other, Painting, Performance, Photography, Print, Sculpture, Textile, Wood, Works on Paper |
| 6 | Status | (mapped from Airtable status) | status mapping | | "Approved for Export" → "available" |
| 7 | Height | `Height (AI)` | `dimension_format` | | AI-extracted from Description |
| 8 | Width | `Width (AI)` | `dimension_format` | | AI-extracted from Description |
| 9 | Depth | `Depth (AI)` | `dimension_format` | | AI-extracted from Description |
| 22 | Creation Date | `Year Created Date` | `date_format` | | Usually yyyy format |
| 25 | Description | `Description` | none | | Artist-entered |
| 66 | Piece Image URLs | `Piece Image URLs` | `pipe_separate` | | Use Paperform S3/CDN URL — NEVER Airtable thumbnail |
| 67 | Additional File URLs | — | | | Left blank for now |
| 67 | Artist Email | `Artist Email` | none | | **Note: AA template has Artist Email as a non-column identifier field appended after col 67** |

### Concatenation Mappings (artist value + AI appended)

| # | AA Column | Airtable Sources | Strategy |
|---|-----------|-----------------|----------|
| 4 | Medium | `Medium` + `Medium (AI)` | `field_concatenate` — artist value first, append "\n\nAI ANALYSIS: {Medium (AI)}" if different |
| 17 | Subject Matter | `Subject Matter` + `Subject Matter (AI)` | `field_concatenate` — same pattern |

### Transform Mappings

| # | AA Column | Airtable Field | Transform | Notes |
|---|-----------|---------------|-----------|-------|
| 26 | Tags | `Tags (AI)` | `ai_tags` (dedup, sort) | **High value for curation** — searchable across 10K+ artworks |
| 28 | Collections | (derived) | `collections_expand` | Campaign Name + Partner Org Name + Exhibition Year → hierarchy |

### Collections Expansion

Each artwork gets up to 3 collection assignments:
1. **Campaign-specific:** Campaign Name (e.g., "Not Real Art - Modern Love")
2. **Parent org + year:** Organization Name + year from `Exhibition Open` date (e.g., "Not Real Art 2026")
3. **Parent org all-time:** Organization Name (e.g., "Not Real Art")

Year fallback chain: `Exhibition Open` date → `Date Imported` year → current year.

Non-partner submissions get campaign name only (no org hierarchy).

### Notes Field (col 27) — Concatenation

**Order:**
```
EXHIBITION FIT:
{Relevance Hypothesis (AI)}
(only if not "SKIP")

══════════════════════════════
PURCHASE LINK:
{Link to Purchase URL}
(only if present)
```

### Dimensions

- Source: `Height (AI)`, `Width (AI)`, `Depth (AI)` — number fields from AI extraction
- Context: `Dimensions Unit (AI)` — used by `dimension_format` to convert cm→inches
- AA default unit is inches. If `Dimensions Unit (AI)` is "cm", convert to inches at export
- Zero values → empty string (not "0")
- No evidence of decimal precision limits in AA

### Image URLs — CRITICAL

Always use `Piece Image URLs` field (Paperform S3/CDN, permanent). NEVER use `Piece Thumbnail` (Airtable attachment URLs expire in hours).

### Columns Left Blank

Inventory Number (3), Dimension Override (10), Paper Height/Width (11-12), Framed fields (13-16), Price (18), Fair Market/Wholesale/Insurance Value (19-21), Circa (23), Creation date override (24), Current Location fields (29-36), Sale/Donation/Gift fields (37-52), Attribution Line (53), Signed fields (54-55), Edition fields (56-57), Appraisal fields (58-61), Condition fields (62-63), Weight (64), Provenance Info (65), Additional File URLs (67)

---

## Transform Reference

| Transform | Safe to Write Back? | Scope | Notes |
|-----------|:---:|-------|-------|
| `state_abbreviation` | ✓ | US states + DC + territories | "Florida" → "FL". Pass through if non-US or already 2-letter |
| `url_validate` | ✓ | Generic URLs | Ensure https://, strip trailing slash |
| `social_media_profile` | ✓ | Instagram, Facebook, LinkedIn, Pinterest, Twitter/X | Normalize handles/partial URLs to canonical URLs |
| `title_case` | ✓ | **Addresses and cities ONLY** | Never on artist names — see #57 for name capitalization |
| `phone_normalize` | ✓ | TBD | AA accepted wide variation. May be optional |
| `pipe_separate` | ✗ | Image URL arrays | "url1\|url2\|url3" — AA-specific format |
| `dimension_format` | ✗ | Numbers | number → string, 0/null → "" |
| `date_format` | ✗ | Dates | Pass through yyyy. Format full dates to mm/dd/yyyy |
| `strip_markdown` | ✗ | Rich text → plain text | For Artist Profile (AI) in Notes concat |
| `ai_tags` | ✗ | Tag strings | Deduplicate, trim, sort alphabetically |
| `notes_builder` | ✗ | Multi-source concat | Assembles Notes field with headings/separators |
| `field_concatenate` | ✗ | Artist + AI values | Appends AI analysis below artist-submitted value |
| `collections_expand` | ✗ | Campaign + Org + Year | Generates collection hierarchy |

---

## Partner Organization Data

Resolved at export time via code-level joins (Artwork → Campaign → Partner Org). NOT Airtable Lookups.

Data used: Organization Name, Curator Name, Official Exhibition Name (from Campaign).

Airtable is the permanent source of truth for partner information.

---

## Key Design Principles

1. **AI enrichment augments, never overrides** — artist-submitted values go first, AI appended below
2. **Tags are first-class** — AA artwork template has a Tags column. Use it. Don't bury in Notes.
3. **No social media columns in AA** — all social URLs go in artist Notes with headings
4. **Transforms are self-contained** — no chaining needed. Each handles its own input normalization.
5. **title_case is for addresses only** — name capitalization is handled by #57 (AI detection + curator review)
6. **Image URLs must be permanent** — Paperform S3/CDN only, never Airtable attachment URLs
7. **Start minimal** — don't invent transform rules we can't validate against real accepted data
8. **Collection root = Organization Name** — no separate prefix field needed

---

## Export Workflow (10,000-foot view)

1. Curator reviews enriched artists/artworks in Airtable Interface
2. Curator approves records for export (status TBD — between "Pending - Enriched" and "Exported")
3. Export triggered (Airtable button/webhook or web UI)
4. Export pipeline: load mappings → fetch approved records → apply transforms → generate CSVs → write back (if toggled) → upload files → log export → send email notification
5. Email to assigned team member (Kirsten) with artist/artwork counts + CSV download links
6. Team member reviews, forwards to Artwork Archive team (Justin) with the links
7. AA processes import, reports any issues
8. Records marked "Exported" in Airtable

---

## Future: Multi-Source Mapping Profiles

Current implementation builds for our Airtable as the single source. The mapping architecture should be clean enough to support multiple sources later (partner CSVs, other Airtable bases, Paperform direct) by adding a profile/source selector. Not in initial scope — tracked separately.

---

## References

- Epic: #74
- Field mapping analysis: #86
- Airtable schema: #76
- Transforms: #77
- Mapping editor UI: #82
- Field mapping decisions: #84
- Export pipeline: #79
- Capitalization detection: #57
- Sample data: `docs/knowledge/artwork archive example data/`
- AA templates: `docs/knowledge/artwork archive formats/`

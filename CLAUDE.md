# Artwork Archive — Rolling Submissions System

## Project Overview

Automated artwork submission intake and enrichment pipeline for an art gallery/archive. Built on **n8n workflows + Airtable**. No application code — this is a workflow automation project.

---

## n8n Instance

- **URL:** https://polymash.app.n8n.cloud
- **API Key:** stored in Claude Code settings (`~/.claude/settings.json`) under `mcpServers.n8n-mcp`

## Workflows

| # | Name | ID | Status | Purpose |
|---|------|----|--------|---------|
| 1 | **Intake V1.7** | `QtP1J9Fwr5SPRG0u` | Active | Webhook → normalize → upsert Campaign/Artist/Artworks → email notification → ActiveCampaign CRM |
| 2 | **Enrichment V0.11.0** | `3c8WbVLT83fwnF2CaKIRz` | Active | Pre-process → artist research (Perplexity) → AI citation validation → bio quality evaluation → profile formatting (GPT-4.1) → artwork image classification (GPT-4.1 vision) → dimension extraction (GPT-4o-mini) with pipeline progress tracking |
| 3 | **Social Profile Discovery V0.1** | `GDdBMTBr2pk3oSbl` | **Active** | The version actually running. Undocumented below — the detail section describes V1.0. |
| 3b | **Social Profile Discovery V1.0** | `mRgdgMZTjamxK6S9` | Inactive | Documented in "Workflow 3" below, but **not the active one**. Reconcile or retire. |
| 4 | **Error Handler V1.0** | `iAGcwyumKEOc83kj` | Inactive | Error trigger → lookup campaign admins → Gmail notification |
| old | **Intake V0.9** | `3TYwN_RyYT1P_vvwj-Kh1` | Inactive | Deprecated — do not use |

> Table verified against `GET /api/v1/workflows` on 2026-07-25. Names, IDs, and active flags are authoritative as of that date.

## Airtable

- **Base ID:** `appDFU2JdAw2Ckax4`
- **Base Name:** AA Rolling Submissions

### Tables

| Table | ID | Key Fields |
|-------|----|------------|
| **Artists** | `tblZZS5EeWmxmyCTB` | Full Name, First Name, Last Name, Bio, Artist Statement, City, State, Website, Instagram/Facebook/Twitter/LinkedIn/Pinterest URLs, Primary Address, Status, Artist Profile (AI), AI Tags, Artist Summary (AI), Artworks (linked) |
| **Artworks** | `tblh3npWVZgkWSILm` | Piece Name, Type, Medium, Subject Matter, Description, Piece Image URLs, Status, Status (from Artist) (Lookup), Medium (AI), Subject Matter (AI), Tags (AI), Relevance Hypothesis (AI), Height (AI), Width (AI), Depth (AI), Dimensions Unit (AI), Campaign Descriptions (from Campaign) (Lookup) |
| **Pipeline Actions** | `tblPLE3Kt16Blqsjr` | Action Name, Status, Current Phase, Progress Summary, Current Record, Est. Time Remaining |
| **Pipeline Runs** | `tblhF8aI7tf2wPWyo` | Run ID, Workflow, Status, Started At, Completed At, Artists Processed, Artworks Processed, Error Details |
| **Campaigns** | `tblr0oR74rtvR6LN2` | Campaign Name, Campaign Descriptions, Campaign Logo, Campaign Contact Emails, Admin/Submitter Notification templates, Active Campaign Lists/Tags, Embed Code (formula), Exhibition URL, Official Exhibition Name, Exhibition Venue/Address/Open/Close, Artists (linked), Artworks (linked), Partner Organizations (linked) |
| **Partner Organizations** | `tbl0GhG4KxfuYDKaE` | Organization Name, Partner ID (formula), Primary/Alternate Logo, Mission Statement, Contact Name/Email/Phone, Curator Name/Email/Pronouns/Bio/Headshot, Live Exhibition, Public on Website, Status, Campaigns (linked), Artists (linked) |
| **Import Log** | (see Intake workflow) | Submission tracking |

### Status Flow

- **Artists (enrichment only, issue #91):** `Pending - Imported` → `Pending - Enriched` → `Needs Review` or `On Hold` (curator flags). Artist status is **never changed by the export pipeline**. Legacy export values (`Approved for Export`, `Exported`, `Accepted`) have been removed from the Airtable single-select field.
- **Artworks (enrichment + export):** `Pending - Imported` → `Pending - Enriched` (after image classification) → `Approved for Export` → `Exported` → `Accepted`. Artworks inherit artist eligibility via `Status (from Artist)` Lookup field — only artworks whose artist is "Pending - Enriched" are classified.
- **Export pipeline:** Starts from artworks with status "Approved for Export". Artists are resolved by ID from linked artworks. Guards exclude artists who are `Needs Review`, `On Hold`, or missing `Artist Profile (AI)` — their artworks are excluded with a warning message.
- **Export CSV field policy (#97):** Medium and Subject Matter columns contain **artist-submitted values only**. AI-enriched values for both fields are written to the Notes column under `MEDIUM (AI)` and `SUBJECT MATTER (AI)` headings (skipped when AI matches artist value). Dimensions (Height/Width/Depth) are AI-extracted from the artist's Description field — treated as artist data, not labeled as AI.
- **Image links & the export audit ([#102](https://github.com/JuergenB/artwork-archive/issues/102)):** Paperform file URLs expire 7 days after generation, so the export re-mints every image URL through the Paperform API at export time. `app/lib/export/image-audit.ts` then checks each URL's embedded expiry *and* its liveness; if any image would ship stale the export returns **409, writes no files, and changes no record statuses**. Never weaken that gate. Two gotchas it exists to catch: Paperform strips `#`, `(`, `)` from URLs while the API returns the original filename (matched via `looseFilenameKey`), and **141 of 225 artworks have no `Submission ID (Paperform)`** — of which **111 are `Approved for Export`** (counted from Airtable 2026-07-30; re-count before trusting these numbers). Artworks without one inherit the linked artist's submission ID; the filename match still has to succeed, so a wrong submission blocks rather than shipping a bad link. **The cause is historical, not ongoing:** Intake V1.7 didn't write the field until it was fixed 2026-07-28T21:27Z, and the existing rows were never backfilled — see the Workflow 1 note, and do not re-report the node itself as broken.
- **Export formats:** both **.xlsx and .csv** are generated. The Excel files are AA's own template files with data rows appended from row 4, so the index/header/helper rows are theirs byte-for-byte. Both formats share the same row builders. AA's column contract is extracted from their `.xlsx` by `scripts/extract-aa-template.py` into `app/lib/export/__fixtures__/` and locked by `app/lib/aa-columns.test.ts` — when AA ships a revised template, drop it in, re-run the extractor, and let the tests report the drift. Never hand-edit the column registry.
- **Dimensions toggle (#99):** Step 3 of the export UI has an "Exclude dimensions from CSV" checkbox (default **on**). When on, Height/Width/Depth columns stay blank and the values appear at the **top** of the artwork Notes under a `DIMENSIONS` heading (`Height: 24 in`, three lines, blank lines suppressed). Curator-driven temporary accommodation while artist-submitted dimensions are inconsistent — keeps them out of published exhibitions but visible during AA import review. Toggle off restores the legacy column-based behavior.

---

## Workflow 1: Intake V1.7 — Detail

**Trigger:** Webhook (receives form submission data)

**Flow:**
1. Normalize fields by key (Code node — handles varying form field formats)
2. Capture artist & campaign data (Set node)
3. Search/upsert Campaign in Airtable
4. Search/upsert Artist in Airtable
5. Detect artworks from submission data (Code node — parses artwork entries)
6. Split out individual artworks → upsert each in Airtable
7. Aggregate success IDs → update Import Log
8. On success: update artist status to "Pending", get campaign email info
9. **Notification Email Prep** (Set node) — resolves all 9 placeholders in admin + submitter templates using `.replaceAll()` chains
10. AI Email Beautifier (Claude Haiku 4.5 via LangChain, node `Anthropic Claude Haiku 4.5`) → send admin notification via Mailgun HTTP API
11. ActiveCampaign CRM: create/update contact, add to lists, resolve/create tags

**Supported email placeholders:** `[[campaign_name]]`, `[[artist_first_name]]`, `[[artist_last_name]]`, `[[artist_email]]`, `[[submission_id]]`, `[[submission_date]]`, `[[artwork_count]]`, `[[airtable_record_url]]`, `[[paperform_submission_url]]`, `[[support_email]]`

**Note:** Submitter confirmation email templates are prepared but NOT sent yet — requires submitter send node (see issue #50).

### Known Issues
- ~~**`Create or update Artworks` does not write `Submission ID (Paperform)`**~~ — **RESOLVED in the n8n UI 2026-07-28T21:27Z.** The node now maps **19** fields, the last being
  `Submission ID (Paperform)` = `={{ $('Capture Artist & Campaign Data').first().json.submission_id }}`.
  `.first()` (not `.item`) is deliberate and correct: this node receives one item per artwork from `Split Out Artworks` while `Capture Artist & Campaign Data` emits a single item per submission, so `.item` would force a paired-item resolution across mismatched counts.

  > **⚠️ DO NOT re-report this as broken without re-running the check below.** This entry has been wrongly re-raised to the user three times. Two earlier notes here asserted the defect from a point-in-time read — including one that explicitly overrode issue #23's correct "fixed" claim — with no way to tell they had expired. **Prove it stale before asserting anything:**
  >
  > ```bash
  > # 19 mapped fields incl. Submission ID (Paperform) ⇒ FIXED. 18 without it ⇒ regressed.
  > # Live as of this writing: versionId 90d28b11-abbc-4f94-8916-c94d3ed6c938
  > # (n8n_get_workflow QtP1J9Fwr5SPRG0u mode=full, then:)
  > jq -r '.data.nodes[]|select(.name=="Create or update Artworks")|.parameters.columns.value|keys' <saved.json>
  > ```

  **The data consequence is NOT resolved and is a separate problem.** The node fix only applies to submissions received after 2026-07-28T21:27Z; nothing backfilled the existing rows. Verified against Airtable 2026-07-30: **141 of 225 artworks still have no `Submission ID (Paperform)`, and 111 of those are `Approved for Export`** — i.e. most of the current export set relies on the linked-artist fallback to re-mint image URLs. Tracked in [#104](https://github.com/JuergenB/artwork-archive/issues/104); do not conflate it with the node config, which is fixed.

  **But measure before calling it a blocker.** Audited 2026-07-30: of the 123 `Approved for Export` artworks, 12 have their own ID and **111 inherit a usable one from their linked artist — 0 can resolve none**, and all 123 have at least one image URL. So the missing IDs did **not** put the export at risk; only 4 artists submitted more than once (Elise Wilson, Joan Cox, Rachel Flovin, Brooke McGowen), which is where an inherited ID could point at the wrong submission and fail the filename match. Do not repeat the earlier mistake of quoting the 141/111 counts as an imminent export failure.

- **Duplicate artworks: NEVER key on `Piece Name`.** Two records sharing a title and artist are *usually not* duplicates. Curator guidance (2026-07-30), two independent legitimate reasons:
  1. **Multiple views of one piece.** Artists submit several photographs of the same work — different angles of a sculpture, a detail shot. Same title, different files, entirely valid.
  2. **Artists reuse titles.** Sloppy or repeated titling across genuinely different works is common.

  **The duplicate key is (`Artist Email` + decoded image filename). Do not add `Piece Name` to it.** Compare the decoded filename from `Piece Image URLs`, never the signed URL — the query string changes on every refresh. Measured on all 225 artworks 2026-07-30: the 2-part key found **10** duplicate groups, the 3-part key with `Piece Name` found **9** — it missed one real duplicate where the same file was titled *"A Legacy of Fish Blood"* and *"A Legacy of Fish Blood II"*. Adding the title only makes the key stricter and lets same-file/different-title duplicates through. Title equality is a *candidate* filter at most.

  Applied 2026-07-30: `Approved for Export` had 123 records; 6 title+artist collisions, of which **4 were true duplicates** (identical filenames — Beth Grossman double-submitted 78s apart on 2026-07-06, 18:33:07 vs 18:34:25). Those 4 older records were set to **`On Hold`** with the reason in `Notes` naming the surviving record — reversible, and `On Hold` excludes them from the export, which only selects `Approved for Export`. The other 2 (O'Malley "Cross X Roads", Chang "Language") had **different image files and were deliberately kept, both sides**. Result: 119 records, 0 true duplicates. Tracked in [#105](https://github.com/JuergenB/artwork-archive/issues/105).

  **Open question, not yet decided:** when an artist submits several angles of one piece, should that be *one* AA piece with pipe-separated `Piece Image URLs`, or *N* piece records? Intake currently creates one record per artwork slot, so multi-angle submissions become N pieces. Ask the curator before changing this.

  Never delete a suspected duplicate. Park it with `On Hold` + a `Notes` reason.

- **Backfilling `Submission ID (Paperform)` from a Paperform CSV export (done 2026-07-30).** A Paperform "export all submissions" CSV carries column `ID` (24-char hex submission ID) and `Artwork N - File Upload` (original filenames), so artwork → submission joins on the same `looseFilenameKey` the export already uses. **132 of 141 missing IDs written**; `Approved for Export` reliance on the artist fallback dropped from 111 to 5, with 0 unresolvable. Two rules that made it safe and must be kept:
  - **Poison ambiguous keys.** When one filename maps to more than one submission ID, write nothing. This is not a rare edge: Beth Grossman submitted the *identical 4 files twice* 78s apart, so those keys are genuinely ambiguous. The 9 skipped records are all poisoned keys, not failures.
  - **Never overwrite an existing value; check agreement instead.** Doing so found **7 records whose stored ID was wrong** — the file was absent from the stored submission but present in the CSV's, each stored ID pointing at a *later* submission by the same artist (the artist-fallback pattern written onto artworks). All 7 are test accounts and none are `Approved for Export`, so they were left alone. Correcting them needs explicit approval.

- **The same artwork can legitimately appear under two campaigns.** Rachel Flovin's "Obergefell" (`FullTapestry1_3.jpg`) was submitted to the Haywood Grad Show (2026-04-28, now `Accepted`) *and* to Art of Resistance (2026-07-06, `Approved for Export`). This is not a duplicate to park — but **AA already holds the Accepted copy**, so exporting again re-sends it. Check for `Accepted` records sharing an artist+filename with the export set before shipping.

**Integrations:** Airtable, Mailgun (HTTP API), ActiveCampaign, Anthropic (Claude Haiku 4.5)

### Changelog
- **V1.7 (2026-03-23):** Gmail → Mailgun migration (#51) — replaced Gmail OAuth2 send node with HTTP Request node calling Mailgun REST API (`POST /v3/mail.arterial.org/messages`). All emails now sent from `exhibitions@mail.arterial.org` (single verified domain, 10/10 mail-tester score). Added per-brand Reply-To via new `Reply-To Email` field on Campaigns table. Added per-brand From display name via new `Email Display Name` field on Campaigns table. Added `[[support_email]]` placeholder to submitter templates. Added Arterial 501(c)(3) footer to AI Email Beautifier prompt ("This email was sent by Arterial, the 501(c)(3) nonprofit behind [Brand Name]"). 3 new Set node assignments: Reply To Email, From Email, Support Email. Removed Gmail node and unused Mailgun node.
- **V1.6 (2026-03-16):** Dimension field renames (#72) — renamed `Height` → `Height (AI)`, `Width` → `Width (AI)`, `Depth` → `Depth (AI)` in Create or update Artworks node, matching Airtable field renames for AI-extracted dimension data.
- **V1.5 (2026-03-13):** Partner Organizations linking (#68) — added `partner_id` field to Capture Artist & Campaign Data (extracted from `fieldsByKey.partner_id` with `|| {}` fallback). Create or update Artist record appends partner to existing Partner Organizations array (concat + dedup, same pattern as Campaigns). Create or update Artworks wraps partner_id in array. Non-partner submissions pass empty array (no link). Tested via Haywood Grad Show landing page.
- **V1.4 (2026-03-12):** Fixed broken Notification Email Prep node — 8 fields were using `$json['...']` (assumes previous node) instead of explicit `$('NodeName')` references. 4 fields resolved to `undefined` (Admin Notification Email Addresses, Submitter Email Address, Campaign Logo Small/Medium), preventing admin notification emails from sending. All expressions now use explicit node references: `$('Get Campaign Email Info2')` for campaign data, `$('Normalize Fields by Key')` for submission data.
- **V1.3 (2026-03-11):** Fixed campaign link overwrite bug (#52) — Artist upsert now appends new campaign to existing Campaigns linked-record array instead of replacing. Uses `.concat()` + `.filter()` for deduplication. Also added Airtable view ID `viwi8J1HtVO5cCMJY` to record URLs in email templates.
- **V1.2 (2026-03-11):** Restored branded email styling — rewrote AI Email Beautifier prompt with explicit design system (dark `#010101` header, `#040404` buttons, 600px max-width, card-based sections, inline CSS only, table-based layout for Outlook compatibility). Previous prompt was minimal ("You are an expert email designer") with no styling constraints, producing inconsistent generic output.
- **V1.1 (2026-03-10):** Fixed email placeholder resolution — added 6 missing `.replaceAll()` calls to Notification Email Prep Set node (artist_email, submission_id, submission_date, artwork_count, airtable_record_url, paperform_submission_url). Also added all 9 placeholder replacements to submitter template fields (previously only resolved campaign_name). All using native Set node expressions — no Code nodes.
- **V1.0 (2026-03-09):** Initial stable release

---

## Workflow 2: Enrichment V0.11.0 — Detail

**Trigger:** Webhook (`54ac3b7a-0479-4fa6-8965-204cd34addae`)

### Part A: Artist Enrichment
1. Find Pending Artists (Airtable search: `{Status} = "Pending - Imported"`)
2. **Loop Over Artists** (`SplitInBatches`, batch size 1) — sequential processing
3. **Pre-Process Submission** — Code node (gibberish detection + identity anchors)
   - Detects lorem ipsum / placeholder text in Bio and Artist Statement
   - Extracts identity anchors: email domain (non-generic), website domain, city/state
   - Computes data quality score (0-10) based on submission completeness
   - Outputs: `_dataQuality`, `_bioIsGibberish`, `_statementIsGibberish`, `_emailDomain`, `_websiteDomain`, `_identityContext`, `_qualityWarning`
4. **Artist Profile Researcher** — Perplexity `sonar-deep-research`
   - System prompt: art world research specialist with citation accuracy constraints
   - Prompt includes `<data_quality>` section with gibberish warnings, quality score, identity anchors
   - `<search_strategy>` prioritizes website domain → email domain → name+location
   - DISAMBIGUATION RULE: common names must match identity anchors or be excluded
   - Prompt structured with XML tags: `<role>`, `<data_quality>`, `<constraints>`, `<artist_data>`, `<search_strategy>`, `<instructions>`, `<fallback_rules>`
   - Retry on fail: 3 attempts, 30s between retries
5. **Validate Citations** — Basic LLM Chain (GPT-4o-mini, temp 0.1) + Structured Output Parser
   - AI-powered citation validator (replaced V0.6 Code node string matching)
   - Evaluates each Perplexity citation URL against artist identity context (email domain, website domain, location)
   - Rejects links about wrong people with same name, people-search sites, unrelated domains
   - Output schema: `{verified_citations: string[], removed_count: number, validation_notes: string}`
   - Cost: ~$0.001 per artist (GPT-4o-mini)
6. **Bio Quality Evaluator** — Basic LLM Chain (GPT-4o-mini, temp 0.1) + Structured Output Parser
   - Evaluates formatted profile quality (coherence, completeness, factual consistency)
   - Flags profiles that need human review vs. auto-approval
   - Output: `{quality_score: number, passes_quality: boolean, issues: string[]}`
7. **Artist Profile Formatter** — GPT-4.1 Agent (temp 0.2, max 4000 tokens)
   - Takes validated citations + research text directly from Artist Profile Researcher (`$('Artist Profile Researcher').item.json.message`)
   - References Pre-Process Submission for bio/statement (uses original, not gibberish-flagged versions)
   - **JSON Schema strict mode** enabled on LLM — guarantees valid JSON at API level
   - Outputs: formatted_profile (markdown), word_count, sections_included, key_links, social_media_profiles, tags, summary
   - Structured Output Parser with GPT-4.1 (temp 0.3) as safety net
   - Error handling: `onError: continueErrorOutput` → retries from Perplexity on failure
8. Update Artist Record in Airtable (profile, tags, summary, status → "Pending - Enriched")
9. **Rate Limit Delay** (`Wait`, 30 seconds) between each artist

### Pipeline Progress Tracking (V0.8)
- **Prepare Run Metadata** → **Create Pipeline Run** → **Set Action Running** → **Restore Artist Data** before entering artist loop
- **Artist Progress** → **Update Action (Artist)** after each artist enrichment (shows artist name, progress %)
- **Artworks Transition** → **Update Action (Artworks Phase)** when entering artwork phase (shows artwork count, ETA)
- **Artwork Progress** → **Update Action (Artwork)** after each artwork classification
- **Finalize Run** → **Complete Pipeline Run** → **Reset Action Status** after all processing

### Part B: Artwork Enrichment
10. Find Related Artworks — Airtable search: `AND({Status} = "Pending - Imported", {Status (from Artist)} = "Pending - Enriched")`
    - Uses `Status (from Artist)` Lookup field to gate artwork classification behind artist approval
    - Artworks belonging to "Needs Review" artists are excluded
    - **`executeOnce: true` — do not remove.** This node's input is the *done* branch of `Loop Over Artists`, which emits one item per artist. An Airtable `search` node runs its query **once per input item** and concatenates results, so without this flag the queue becomes `artists × artworks` and every artwork is re-classified once per artist. See the V0.11.0 changelog entry for #100.
11. **Loop Over Artworks** (`SplitInBatches`, batch size 1) — sequential processing
12. **Artwork Image Classifier** — GPT-4.1 Vision Agent (node `GPT-4.1 Vision Model`, temp 0.3, max 2000 tokens)
    - Image-first prompt architecture: image URL sent before metadata to prevent hallucination
    - System prompt with `<critical_constraint>`, `<analysis_protocol>`, `<output_requirements>`, `<anti_hallucination_rules>` XML sections
    - Metadata (title, artist description) provided as "optional context" after image analysis
    - Outputs: tags (comma-separated), subject_matter (description), detected_medium
    - Artwork Output Parser with GPT-4.1-mini
    - **Fetch Artwork Image** (HTTP Request) downloads Airtable thumbnail as binary before classifier — required for vision (text URLs don't trigger vision)
13. **Relevance Hypothesis** — Basic LLM Chain (GPT-4o-mini, temp 0.3)
    - Hypothesizes how artwork connects to exhibition theme
    - Inputs: classifier output (subject_matter, tags) + artwork context (title, description) + campaign name/description (via Lookup field)
    - Skips output ("SKIP") for generic exhibitions with no distinctive theme
    - Output written to `Relevance Hypothesis (AI)` field; conditional expression clears field when "SKIP"
14. **Dimension Extractor** — Basic LLM Chain (GPT-4o-mini, temp 0) + Structured Output Parser
    - Extracts height, width, depth, and unit from artwork Description field
    - Handles all dimension formats: `18 x 10.5`, `18" x 10.5"`, spelled-out numbers, mixed units, fractions
    - Returns nulls when no dimensions found — never guesses
    - Stores values in original units (no conversion); assumes inches if unspecified
    - Output: `{height: number|null, width: number|null, depth: number|null, unit: string|null}`
    - Cost: ~$0.001 per artwork (GPT-4o-mini)
15. Update Artwork record (tags, subject matter, medium, relevance hypothesis, dimensions, status → "Pending - Enriched")
16. **Artwork Rate Limit Delay** (`Wait`, 5 seconds) between each artwork

### Known Issues
- "Pre-Process Submission" Code node triggers MCP validator false positive ("Cannot return primitive values") — valid Code node v2 syntax, works at runtime
- **No error path resets the dashboard.** `Complete Pipeline Run` and `Reset Action Status` sit downstream of the artwork loop, so any mid-run failure leaves Pipeline Actions stuck on `Running` with a stale queue count and Pipeline Runs with no `Completed At`. Both then need manual cleanup. Hit on 2026-07-25 (run `enrich-2026-07-25-044`).
- **`Artwork Progress` can hit the n8n Cloud task-runner limit** — `Task request timed out after 60 seconds` ("task runner is down, not ready, or at capacity"). Killed run `enrich-2026-07-25-044` at artwork 269. Infrastructure limit, not a code defect; aggravated by oversized item sets.

### Changelog
- **V0.11.0 (2026-07-25):** Duplicate artwork classification fix ([#100](https://github.com/JuergenB/artwork-archive/issues/100)):
  - **`Find Related Artworks` → `executeOnce: true`.** The Airtable `search` node was running once per input item. Its input is the *done* branch of `Loop Over Artists` (one item per artist), so the search executed N times and concatenated results: run `enrich-2026-07-25-044` queued **14 artists × 44 artworks = 616 items** against a base holding only 222 artworks total. Pass 1 classified the 44 real artworks and flipped them to `Pending - Enriched`; passes 2–14 re-classified the same records from the stale in-memory list, because the status filter is evaluated only once at query time. Every prior run shows the same clean multiple (3×9=27, 2×7=14, 4×11=44). Cost was ~14× the necessary GPT-4.1 vision + GPT-4o-mini calls.
  - **Applied via the n8n UI, not the API** — see the "n8n public API cannot write to these workflows" note under Dev Environment. Verified by API read-back: `versionId 7f6d09ba-8f09-46b8-9a31-7e74ec4895f8`, one-line diff across all 54 nodes, `settings.binaryMode` preserved.
  - **Proven at runtime 2026-07-27** (verified 2026-07-28). Execution `12044` (success): `Find Pending Artists` → 2 items, `Find Related Artworks` → 3 items, `Artwork Image Classifier` → 3 items. With the bug present this would have been 2 × 3 = 6. Issue [#100](https://github.com/JuergenB/artwork-archive/issues/100) closed.
- **V0.11.0 (date unknown — undocumented):** the live workflow was already named V0.11.0 before the fix above, with no changelog entry for it. One verified drift from the V0.10 docs: the **artwork classifier model is `gpt-4.1`**, not GPT-4o (node renamed `GPT-4.1 Vision Model`). Other V0.11.0 changes, if any, are unrecorded.
- **V0.10 (2026-03-16):** AI dimension extraction (#72):
  - **Dimension Extractor** — new Basic LLM Chain (GPT-4o-mini, temp 0) + Structured Output Parser between Relevance Hypothesis and Update record. Extracts height, width, depth, and unit from artwork Description field. Handles all dimension formats (numeric, spelled-out, fractions, mixed units). Returns nulls when no dimensions found.
  - **Airtable field renames** — `Height` → `Height (AI)`, `Width` → `Width (AI)`, `Depth` → `Depth (AI)`. New field: `Dimensions Unit (AI)` (singleLineText). Values stored in original units (no conversion).
  - **Intake V1.6 update** — artwork upsert node updated to use renamed fields (`Height (AI)`, `Width (AI)`, `Depth (AI)`)
- **V0.9 (2026-03-12):** Vision fix, skip-artists path, relevance hypothesis (#60, #61, #62):
  - **Fetch Artwork Image** — added HTTP Request node to download Airtable thumbnail as binary before classifier. GPT-4o vision requires binary image data, not text URLs. The model had been hallucinating descriptions from metadata because it never actually saw the images.
  - **Relevance Hypothesis** (#61) — new Basic LLM Chain (GPT-4o-mini, temp 0.3) between classifier and Update record. Hypothesizes artwork-to-exhibition theme connection. Outputs "SKIP" for generic exhibitions (no theme). New Airtable fields: `Relevance Hypothesis (AI)` (multilineText), `Campaign Descriptions (from Campaign)` (Lookup).
  - **Skip-artists path** (#62) — wired NoOp → `Find Related Artworks` so artworks process when no artists are pending. Added try/catch to Artworks Transition, Artwork Progress, Finalize Run for `$('Restore Artist Data')` fallback. Set `onError: continueRegularOutput` on Complete Pipeline Run.
  - **$json refs fixed** — Update record expressions changed from `$json.output.*` to `$('Artwork Image Classifier').item.json.output.*` (inserting Relevance Hypothesis node changed the upstream)
  - Anti-hallucination prompt with `<critical_constraint>`, `<anti_hallucination_rules>` XML sections retained as safety net
  - Root cause of hallucination: GPT-4o never saw the actual image — URL was passed as text, not binary
- **V0.8.1 (2026-03-11):** Critical paired item tracking fix (#55):
  - Fixed `Restore Artist Data` Code node — missing `pairedItem: { item: index }` caused all downstream `$('Find Pending Artists').item.json` references to resolve to item 0, silently updating the wrong Airtable record in multi-artist batches
  - Fixed `Artworks Transition` Code node — same missing `pairedItem` pattern
  - Changed `Update Artist Record` id expression from `$('Find Pending Artists')` to `$('Pre-Process Submission')` (defensive — references in-loop node)
  - Changed `Artist Progress` name reference from `$('Find Pending Artists')` to `$('Pre-Process Submission')`
  - Full Code node audit: 12 nodes across both workflows reviewed, 2 pairedItem bugs found and fixed, 4 nodes flagged for future replacement with native nodes
- **V0.8 (2026-03-10):** Pipeline operations hub + major bug fixes:
  - Added 13 pipeline progress tracking nodes (Prepare Run Metadata, Create Pipeline Run, Set Action Running, Restore Artist Data, Artist Progress, Update Action (Artist), Artworks Transition, Update Action (Artworks Phase), Artwork Progress, Update Action (Artwork), Finalize Run, Complete Pipeline Run, Reset Action Status)
  - Added Bio Quality Evaluator chain (GPT-4o-mini) between Formatter and Update Artist Record
  - Fixed Find Related Artworks: replaced broken template literal `${}` filter with Airtable formula, added `Status (from Artist)` Lookup field gating
  - Fixed Citation Validator: removed `research_message` field from schema (caused JSON overflow with large citation sets), Formatter now references `$('Artist Profile Researcher').item.json.message` directly
  - Fixed artwork ID pollution: Update record now uses `$('Find Related Artworks').item.json.id` instead of polluted `$('Any Valid Artworks Found?').item.json.id`
  - Fixed optional chaining `?.` in Update Action (Artworks Phase) — replaced with `(|| {})` fallback pattern
  - Current Record fields now display artist/artwork names instead of empty strings
  - Added Pipeline Actions and Pipeline Runs Airtable tables for control panel integration
- **V0.7 (2026-03-09):** Smart citation validation — added Pre-Process Submission node (gibberish detection, identity anchor extraction, data quality scoring), improved Perplexity prompt (email domain search, disambiguation rules, conditional bio/statement), replaced Validate Citations Code node with AI-powered Basic LLM Chain (GPT-4o-mini) that evaluates each citation against artist identity context, updated Formatter to reference new output structure
- **V0.6 (2026-03-09):** Research quality fix — switched Perplexity back from `sonar-pro` to `sonar-deep-research` (sonar-pro was hallucinating citations, e.g. Yayoi Kusama links for unrelated artists), added Validate Citations Code node between researcher and formatter, cleaned up Perplexity prompt (removed fake `<Tools>` section, added citation accuracy constraints, primacy/recency), increased rate limit delay 15s→30s, increased retry wait 15s→30s
- **V0.5 (2026-03-09):** Reliability overhaul — enabled OpenAI JSON Schema strict mode on formatter LLM, restructured formatter system prompt (AI Prompt Architecture: XML tags, primacy/recency, self-check), removed `minItems` schema constraints, reduced formatter temperature 0.4→0.2, added error handling (retry from Perplexity on failure), added artwork SplitInBatches loop, renamed "GPT-4o-mini" → "GPT-4.1 Formatter"
- **V0.4 (2026-03-09):** Added artist SplitInBatches loop + Rate Limit Delay to fix Perplexity HTTP 429

---

## Workflow 3: Social Profile Discovery V1.0 — Detail

**Trigger:** Webhook (`social-profile-discovery`) — control panel action

**Flow:**
1. Find Enriched Artists (Airtable: `{Status} = "Pending - Enriched"`)
2. **Loop Over Artists** (`SplitInBatches`, batch size 1)
3. **Has Website?** (IF) — checks if artist has Website field
4. **Firecrawl Scrape Links** (HTTP Request → `POST /v2/scrape` with `formats: ["links"]`) — extracts all URLs from artist's website. 1 Firecrawl credit, handles JS rendering. Credential: "Fire Crawl Web Crawler"
5. **Merge Website Links** (Set) — normalizes data flow from both IF branches (Firecrawl links or empty)
6. **Social Profile Search** (Perplexity `sonar-deep-research`) — broad web search for social profiles using artist identity anchors. XML-structured prompt with disambiguation rules.
7. **Validate & Merge** (Basic LLM Chain, GPT-4.1, temp 0.1) + Structured Output Parser — validates URLs, filters by confidence (HIGH/MEDIUM only), merges with existing submission data, outputs formatted text
8. **Update Artist** (Airtable — writes `Social Profiles (AI)` field with formatted profile list)
9. **Rate Limit Delay** (30 seconds between artists)

**Output format:** One profile per line as `PLATFORM: URL` in the `Social Profiles (AI)` field.

**No status change** — artists remain at "Pending - Enriched".

**Integrations:** Firecrawl, Perplexity, OpenAI (GPT-4.1), Airtable

### Changelog
- **V1.0 (2026-03-16):** Initial release (#56). Standalone workflow with two-source discovery (Firecrawl website scrape + Perplexity deep-research), GPT-4.1 validation with JSON Schema strict mode.

---

## AI Models Used

| Node | Model | Purpose |
|------|-------|---------|
| Artist Profile Researcher | Perplexity `sonar-deep-research` | Web research |
| Validate Citations (GPT-4o-mini Validator) | GPT-4o-mini (temp 0.1) | Citation verification against identity anchors |
| Bio Quality Evaluator (Quality Check Model) | GPT-4o-mini (temp 0.1) | Profile quality evaluation |
| Artist Profile Formatter (GPT-4.1 Formatter) | GPT-4.1 (temp 0.2, JSON Schema strict mode) | Profile formatting |
| Structured Output Parser | GPT-4.1 (temp 0.3) | JSON extraction |
| AI Email Beautifier (Anthropic Claude Haiku 4.5) | `claude-haiku-4-5-20251001` | Email HTML generation |
| Artwork Image Classifier (GPT-4.1 Vision Model) | GPT-4.1 (temp 0.3, max 2000 tokens) | Vision-based artwork analysis |
| Relevance Hypothesis (Relevance Model) | GPT-4o-mini (temp 0.3) | Artwork-to-exhibition theme connection |
| Dimension Extractor (Dimension Model) | GPT-4o-mini (temp 0) | Dimension extraction from description text |
| Artwork Output Parser | GPT-4.1-mini | JSON extraction |
| Social Profile Search | Perplexity `sonar-deep-research` | Social media profile discovery |
| Validate & Merge (Validate & Merge LLM) | GPT-4.1 (temp 0.1) | Social profile validation, deduplication, formatting |
| Social Profile Parser (Parser LLM) | GPT-4.1-mini (temp 0.1) | JSON extraction for social profiles |

---

## Dev Environment

- **n8n MCP:** Available in Claude Code via `~/.claude/settings.json`
- **No local code** — all logic lives in n8n workflow nodes
- **Airtable auth:** OAuth2 (configured in n8n credentials)
- **User Timezone:** America/New_York (Eastern Time)
- **⚠️ The n8n public API cannot write to these workflows (verified 2026-07-25).** `PUT /api/v1/workflows/{id}` **requires** a `settings` property but **rejects** `settings.binaryMode` — and Intake V1.7, Enrichment V0.11.0, and Social Profile Discovery all carry `settings.binaryMode: "separate"` (10 workflows instance-wide). This also breaks `n8n_update_partial_workflow` / `n8n_update_full_workflow`, which fail with `request/body must NOT have additional properties`. Probed key by key: `callerPolicy` and `availableInMCP` are accepted; only `binaryMode` is rejected. The internal `/rest/` API returns **401** with an API key (needs a browser session cookie). `binaryMode` is undocumented in the n8n docs, and the Enrichment vision path depends on binary handling, so **do not strip it to force a write.** Node changes must be made **in the n8n UI**, then verified with `GET /api/v1/workflows/{id}` — read back the changed field, diff the full node set against a pre-change snapshot, and confirm `settings.binaryMode` survived. Tracked on epic [#85](https://github.com/JuergenB/artwork-archive/issues/85) (moved there when [#100](https://github.com/JuergenB/artwork-archive/issues/100) was closed — the blocker is unrelated to that issue's duplicate-classification bug). Re-confirmed still present 2026-07-28.
- **Airtable `search` nodes execute once per input item** and concatenate results. Any Airtable search fed by a multi-item stream (notably a `SplitInBatches` *done* branch) needs `executeOnce: true`, or the result set is silently multiplied. This caused [#100](https://github.com/JuergenB/artwork-archive/issues/100) — 616 queued artworks against a 222-record table.
- **n8n expression rule:** Never use `$json` or `$json['field']` in expression fields. Always use `$('NodeName').item.json['field']`. The `$json` shorthand silently breaks when nodes are reordered. See V1.4 changelog.
- **Set node v3.4 format:** Use `assignments.assignments[{id, name, value, type}]`, NOT `fields.values[{name, stringValue}]`. The old format saves via API but renders empty in the n8n UI. See skill template #10.
- **n8n Reference Workflow:** `o6oYKsfttQnm4n7t` — contains verified node configs for Set, Firecrawl, chainLlm, lmChatOpenAi, outputParserStructured. Clone from here.
- **Firecrawl `waitFor: 3000` is REQUIRED:** Without it, Firecrawl returns 500 errors. Always include `"waitFor": 3000` in `scrapeOptions.options`. Optional: `"onlyMainContent": true` strips navbars/footers (saves tokens). Default markdown format in UI is `{}` (empty object), not `{"type": "markdown"}`.
- **Firecrawl credential:** `"Firecrawl account"` (`Mv9l4N593kDPmnd0`) — old `"Fire Crawl Web Crawler"` credential is deprecated.

---

## Pre-Flight Validation for n8n MCP Operations

**MANDATORY before ANY `n8n_update_partial_workflow` or `n8n_create_workflow` call:**

1. **Outline nodes first.** List every node you plan to add/update (name, type, typeVersion, key params). Get user approval before writing any MCP call.

2. **Build the operations JSON array.**

3. **Run the validator script:**
   ```bash
   echo '<operations JSON>' | node scripts/validate-n8n-nodes.js
   ```

4. **Fix ALL errors** before calling MCP. Do not proceed with any validation failures.

5. **After the MCP call:** Run `n8n_validate_workflow` + verify with `n8n_get_workflow(mode: "structure")`.

### Why This Exists

Claude Code hooks (PreToolUse) cannot intercept MCP tool calls — they only fire for Bash/Edit/Write. The validator script is the only automated check before node configurations reach n8n. Skipping it has caused repeated runtime failures (wrong typeVersion, plain string model params, $json expression bugs) that required multiple debug cycles to resolve.

### You Are a Refactoring Agent

When configuring n8n nodes, you ASSEMBLE verified configurations from templates (`~/.claude/skills/n8n-project-config/SKILL.md`) and existing working nodes. You do NOT generate node parameters from training data. Your training data for n8n node schemas is unreliable — parameter names, nesting structures, and defaults differ between versions in ways that silently break at runtime.

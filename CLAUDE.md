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
| 1 | **Intake V1.4** | `QtP1J9Fwr5SPRG0u` | Active | Webhook → normalize → upsert Campaign/Artist/Artworks → email notification → ActiveCampaign CRM |
| 2 | **Enrichment V0.9** | `3c8WbVLT83fwnF2CaKIRz` | Active | Pre-process → artist research (Perplexity) → AI citation validation → bio quality evaluation → profile formatting (GPT-4.1) → artwork image classification (GPT-4o) with pipeline progress tracking |
| 3 | **Error Handler V1.0** | `iAGcwyumKEOc83kj` | Inactive | Error trigger → lookup campaign admins → Gmail notification |
| old | **Intake V0.9** | `3TYwN_RyYT1P_vvwj-Kh1` | Inactive | Deprecated — do not use |

## Airtable

- **Base ID:** `appDFU2JdAw2Ckax4`
- **Base Name:** AA Rolling Submissions

### Tables

| Table | ID | Key Fields |
|-------|----|------------|
| **Artists** | `tblZZS5EeWmxmyCTB` | Full Name, First Name, Last Name, Bio, Artist Statement, City, State, Website, Instagram/Facebook/Twitter/LinkedIn/Pinterest URLs, Primary Address, Status, Artist Profile (AI), AI Tags, Artist Summary (AI), Artworks (linked) |
| **Artworks** | `tblh3npWVZgkWSILm` | Piece Name, Type, Medium, Subject Matter, Description, Piece Image URLs, Status, Status (from Artist) (Lookup), Medium (AI), Subject Matter (AI), Tags (AI), Relevance Hypothesis (AI), Campaign Descriptions (from Campaign) (Lookup) |
| **Pipeline Actions** | `tblPLE3Kt16Blqsjr` | Action Name, Status, Current Phase, Progress Summary, Current Record, Est. Time Remaining |
| **Pipeline Runs** | `tblhF8aI7tf2wPWyo` | Run ID, Workflow, Status, Started At, Completed At, Artists Processed, Artworks Processed, Error Details |
| **Campaigns** | `tblr0oR74rtvR6LN2` | Campaign Name, Campaign Descriptions, Campaign Logo, Campaign Contact Emails, Admin/Submitter Notification templates, Active Campaign Lists/Tags, Embed Code (formula), Exhibition URL, Artists (linked), Artworks (linked) |
| **Import Log** | (see Intake workflow) | Submission tracking |

### Status Flow

- **Artists:** `Pending - Imported` → `Pending - Enriched` → (human review)
- **Artworks:** (created during intake) → `Pending - Enriched` (after image classification). Artworks inherit artist eligibility via `Status (from Artist)` Lookup field — only artworks whose artist is "Pending - Enriched" are classified.

---

## Workflow 1: Intake V1.4 — Detail

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
10. AI Email Beautifier (GPT-4o via LangChain) → send admin notification via Gmail
11. ActiveCampaign CRM: create/update contact, add to lists, resolve/create tags

**Supported email placeholders:** `[[campaign_name]]`, `[[artist_first_name]]`, `[[artist_last_name]]`, `[[artist_email]]`, `[[submission_id]]`, `[[submission_date]]`, `[[artwork_count]]`, `[[airtable_record_url]]`, `[[paperform_submission_url]]`

**Note:** Submitter confirmation email templates are prepared but NOT sent yet — requires per-campaign sender configuration (see issues #50, #51).

**Integrations:** Airtable, Gmail, ActiveCampaign, OpenAI (GPT-4o)

### Changelog
- **V1.4 (2026-03-12):** Fixed broken Notification Email Prep node — 8 fields were using `$json['...']` (assumes previous node) instead of explicit `$('NodeName')` references. 4 fields resolved to `undefined` (Admin Notification Email Addresses, Submitter Email Address, Campaign Logo Small/Medium), preventing admin notification emails from sending. All expressions now use explicit node references: `$('Get Campaign Email Info2')` for campaign data, `$('Normalize Fields by Key')` for submission data.
- **V1.3 (2026-03-11):** Fixed campaign link overwrite bug (#52) — Artist upsert now appends new campaign to existing Campaigns linked-record array instead of replacing. Uses `.concat()` + `.filter()` for deduplication. Also added Airtable view ID `viwi8J1HtVO5cCMJY` to record URLs in email templates.
- **V1.2 (2026-03-11):** Restored branded email styling — rewrote AI Email Beautifier prompt with explicit design system (dark `#010101` header, `#040404` buttons, 600px max-width, card-based sections, inline CSS only, table-based layout for Outlook compatibility). Previous prompt was minimal ("You are an expert email designer") with no styling constraints, producing inconsistent generic output.
- **V1.1 (2026-03-10):** Fixed email placeholder resolution — added 6 missing `.replaceAll()` calls to Notification Email Prep Set node (artist_email, submission_id, submission_date, artwork_count, airtable_record_url, paperform_submission_url). Also added all 9 placeholder replacements to submitter template fields (previously only resolved campaign_name). All using native Set node expressions — no Code nodes.
- **V1.0 (2026-03-09):** Initial stable release

---

## Workflow 2: Enrichment V0.8 — Detail

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
11. **Loop Over Artworks** (`SplitInBatches`, batch size 1) — sequential processing
12. **Artwork Image Classifier** — GPT-4o Vision Agent (temp 0.3, max 2000 tokens)
    - Image-first prompt architecture: image URL sent before metadata to prevent hallucination
    - System prompt with `<critical_constraint>`, `<analysis_protocol>`, `<output_requirements>`, `<anti_hallucination_rules>` XML sections
    - Metadata (title, artist description) provided as "optional context" after image analysis
    - Outputs: tags (comma-separated), subject_matter (description), detected_medium
    - Artwork Output Parser with GPT-4.1-mini
    - **Fetch Artwork Image** (HTTP Request) downloads Airtable thumbnail as binary before classifier — required for GPT-4o vision (text URLs don't trigger vision)
13. **Relevance Hypothesis** — Basic LLM Chain (GPT-4o-mini, temp 0.3)
    - Hypothesizes how artwork connects to exhibition theme
    - Inputs: classifier output (subject_matter, tags) + artwork context (title, description) + campaign name/description (via Lookup field)
    - Skips output ("SKIP") for generic exhibitions with no distinctive theme
    - Output written to `Relevance Hypothesis (AI)` field; conditional expression clears field when "SKIP"
14. Update Artwork record (tags, subject matter, medium, relevance hypothesis, status → "Pending - Enriched")
15. **Artwork Rate Limit Delay** (`Wait`, 5 seconds) between each artwork

### Known Issues
- "Pre-Process Submission" Code node triggers MCP validator false positive ("Cannot return primitive values") — valid Code node v2 syntax, works at runtime

### Changelog
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

## AI Models Used

| Node | Model | Purpose |
|------|-------|---------|
| Artist Profile Researcher | Perplexity `sonar-deep-research` | Web research |
| Validate Citations (GPT-4o-mini Validator) | GPT-4o-mini (temp 0.1) | Citation verification against identity anchors |
| Bio Quality Evaluator (Quality Check Model) | GPT-4o-mini (temp 0.1) | Profile quality evaluation |
| Artist Profile Formatter (GPT-4.1 Formatter) | GPT-4.1 (temp 0.2, JSON Schema strict mode) | Profile formatting |
| Structured Output Parser | GPT-4.1 (temp 0.3) | JSON extraction |
| AI Email Beautifier | GPT-4o | Email HTML generation |
| Artwork Image Classifier | GPT-4o | Vision-based artwork analysis |
| Relevance Hypothesis (Relevance Model) | GPT-4o-mini (temp 0.3) | Artwork-to-exhibition theme connection |
| Artwork Output Parser | GPT-4.1-mini | JSON extraction |

---

## Dev Environment

- **n8n MCP:** Available in Claude Code via `~/.claude/settings.json`
- **No local code** — all logic lives in n8n workflow nodes
- **Airtable auth:** OAuth2 (configured in n8n credentials)
- **User Timezone:** America/New_York (Eastern Time)
- **n8n expression rule:** Never use `$json` or `$json['field']` in expression fields. Always use `$('NodeName').item.json['field']`. The `$json` shorthand silently breaks when nodes are reordered. See V1.4 changelog.

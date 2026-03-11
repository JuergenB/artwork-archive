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
| 1 | **Intake V1.2** | `QtP1J9Fwr5SPRG0u` | Active | Webhook → normalize → upsert Campaign/Artist/Artworks → email notification → ActiveCampaign CRM |
| 2 | **Enrichment V0.8** | `3c8WbVLT83fwnF2CaKIRz` | Active | Pre-process → artist research (Perplexity) → AI citation validation → bio quality evaluation → profile formatting (GPT-4.1) → artwork image classification (GPT-4o) with pipeline progress tracking |
| 3 | **Error Handler V1.0** | `iAGcwyumKEOc83kj` | Inactive | Error trigger → lookup campaign admins → Gmail notification |
| old | **Intake V0.9** | `3TYwN_RyYT1P_vvwj-Kh1` | Inactive | Deprecated — do not use |

## Airtable

- **Base ID:** `appDFU2JdAw2Ckax4`
- **Base Name:** AA Rolling Submissions

### Tables

| Table | ID | Key Fields |
|-------|----|------------|
| **Artists** | `tblZZS5EeWmxmyCTB` | Full Name, First Name, Last Name, Bio, Artist Statement, City, State, Website, Instagram/Facebook/Twitter/LinkedIn/Pinterest URLs, Primary Address, Status, Artist Profile (AI), AI Tags, Artist Summary (AI), Artworks (linked) |
| **Artworks** | `tblh3npWVZgkWSILm` | Piece Name, Type, Medium, Subject Matter, Description, Piece Image URLs, Status, Status (from Artist) (Lookup), Medium (AI), Subject Matter (AI), Tags (AI) |
| **Pipeline Actions** | `tblPLE3Kt16Blqsjr` | Action Name, Status, Current Phase, Progress Summary, Current Record, Est. Time Remaining |
| **Pipeline Runs** | `tblhF8aI7tf2wPWyo` | Run ID, Workflow, Status, Started At, Completed At, Artists Processed, Artworks Processed, Error Details |
| **Campaigns** | (see Intake workflow) | Campaign name, admin emails |
| **Import Log** | (see Intake workflow) | Submission tracking |

### Status Flow

- **Artists:** `Pending - Imported` → `Pending - Enriched` → (human review)
- **Artworks:** (created during intake) → `Pending - Enriched` (after image classification). Artworks inherit artist eligibility via `Status (from Artist)` Lookup field — only artworks whose artist is "Pending - Enriched" are classified.

---

## Workflow 1: Intake V1.1 — Detail

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
- **V1.2 (2026-03-11):** Restored branded email styling — rewrote AI Email Beautifier prompt with explicit design system (dark navy `#1a1a2e` header, `#040404` buttons, 600px max-width, card-based sections, inline CSS only, table-based layout for Outlook compatibility). Previous prompt was minimal ("You are an expert email designer") with no styling constraints, producing inconsistent generic output.
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
    - Analyzes artwork image URL
    - Outputs: tags (comma-separated), subject_matter (description), detected_medium
    - Artwork Output Parser with GPT-4.1-mini
13. Update Artwork record (tags, subject matter, medium, status → "Pending - Enriched")
14. **Artwork Rate Limit Delay** (`Wait`, 5 seconds) between each artwork

### Known Issues
- "Pre-Process Submission" Code node triggers MCP validator false positive ("Cannot return primitive values") — valid Code node v2 syntax, works at runtime

### Changelog
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
| Artwork Output Parser | GPT-4.1-mini | JSON extraction |

---

## Dev Environment

- **n8n MCP:** Available in Claude Code via `~/.claude/settings.json`
- **No local code** — all logic lives in n8n workflow nodes
- **Airtable auth:** OAuth2 (configured in n8n credentials)
- **User Timezone:** America/New_York (Eastern Time)
- **n8n expression syntax:** `{{ $json.fieldName }}` for current node data, `{{ $node["NodeName"].json.fieldName }}` for cross-node references, `{{ $input.item.json }}` for explicit input reference

---

## Session Rules

1. **Read workflow structure before answering.** Use `n8n_get_workflow` to check current state.
2. **Validate after changes.** Run `n8n_validate_workflow` + `n8n_autofix_workflow` after any update.
3. **Version before modifying.** Check `n8n_workflow_versions` before changes.
4. **Convert timestamps to ET.** n8n timestamps are UTC.
5. **Prefer partial updates.** Use `n8n_update_partial_workflow` for surgical changes (add/remove/update nodes, rewire connections). Reserve `n8n_update_full_workflow` only for wholesale restructuring. Key patterns:
   - `addNode` + `addConnection` in one atomic call to insert nodes into a flow
   - `rewireConnection` to redirect edges without remove+add
   - `branch="true"/"false"` for IF nodes, `case=N` for Switch nodes
   - `cleanStaleConnections` after removing or renaming nodes
   - `validateOnly: true` to preview changes before applying
   - `continueOnError: true` for best-effort bulk cleanup
   - Always include `intent` parameter describing the change
   - **Connection params:** Use `source`/`target` (node names), NOT `from`/`to` or `fromId`/`toId`
   - **Multi-output nodes (SplitInBatches, IF, Switch):** Use `sourceIndex` to select output. SplitInBatches: output 0 = "done" (post-loop), output 1 = "loop" (inside loop body)
   - **Fixing broken AI sub-nodes:** Always follow this sequence: `removeNode` → `cleanStaleConnections` → `addNode` + `addConnection` in one atomic call. Never just remove and re-add without cleaning stale refs first.
6. **Node selection hierarchy.** When building or modifying workflows, prefer in this order:
   - Native n8n nodes (Airtable, Gmail, HTTP Request, etc.)
   - AI Agent nodes with tools (for tasks requiring intelligence)
   - Edit Fields / Set nodes (for data transformation)
   - Code nodes (JavaScript/Python) only as last resort when no native node can do the job
7. **Show architecture before building.** Before creating or significantly restructuring a workflow, describe the planned node layout and connections to the user for approval.
8. **AI Agent workflows.** When configuring AI Agent nodes:
   - Run `tools_documentation({topic: "ai_agents_guide"})` for the full reference
   - Use AI-specific connection types (`ai_languageModel`, `ai_tool`, `ai_memory`, `ai_outputParser`) — not `main` connections
   - Connect the language model BEFORE enabling the AI Agent
   - Use `sourceOutput` parameter in `addConnection` operations for AI connections
9. **Creating OpenAI Chat Model nodes via MCP.** The `lmChatOpenAi` node requires special attention:
   - Always use **typeVersion 1.3** (matching existing working nodes)
   - The `model` parameter MUST be a **resource locator object**, not a plain string. Plain strings cause "Could not get parameter" at runtime. Correct format: `{"model": {"__rl": true, "value": "gpt-4o-mini", "mode": "list", "cachedResultName": "gpt-4o-mini"}}`
   - Do NOT include `notice` parameter — it's a UI-only field that causes issues when set via API
   - After creating nodes via MCP, verify parameter format matches existing working nodes in the workflow
10. **n8n Code node sandbox restrictions.** The Code node v2 VM does not expose all browser/Node globals:
    - `new URL()` is NOT available — use string manipulation (`replace(/^https?:\/\//, '')`) for URL parsing
    - `setTimeout`, `setInterval` are NOT available
    - `try/catch` will silently swallow ReferenceErrors from missing globals — test carefully
11. **Airtable field completeness.** When an Airtable node uses a specific field list, always verify it includes ALL fields needed by downstream nodes. Missing fields produce empty values silently — no runtime error.

---

## Troubleshooting

- **Validation still fails after autofix:** Run `cleanStaleConnections` operation via `n8n_update_partial_workflow` to remove broken connection references. Check for branch mismatches (e.g., Switch with 3 rules but only 2 output connections).
- **Corrupted workflow (API returns corrupt data, rejects all updates):** Cannot be fixed in place. Create a new workflow and migrate nodes from the old one.
- **Property mutual exclusivity errors:** When migrating deprecated properties (e.g., `continueOnFail` to `onError`), remove the old property with `undefined` and set the new one in the same `updateNode` operation.
- **"Could not get parameter" on lmChatOpenAi sub-nodes:** The `model` field must be a resource locator object (`{"__rl": true, "value": "model-name", "mode": "list"}`). Plain strings cause this error at runtime even though the node saves without complaint. Compare against working nodes with `jq` to verify format.
- **Autofix typeVersion upgrades may not persist:** After running `n8n_autofix_workflow`, always verify the changes with `n8n_get_workflow`. TypeVersion upgrades in particular have been observed to silently revert.

# Artwork Archive — Project Memory

## Architecture
- No application code — all logic lives in n8n workflow nodes + Airtable
- n8n instance: https://polymash.app.n8n.cloud
- Airtable base: `appDFU2JdAw2Ckax4` (AA Rolling Submissions)
- Airtable PAT stored in project `.env`

## Workflows
- **Intake V1.4** (`QtP1J9Fwr5SPRG0u`) — Active, updated 2026-03-12 (fixed broken $json references in Notification Email Prep — 4 fields undefined, emails not sent)
- **Enrichment V0.9** (`3c8WbVLT83fwnF2CaKIRz`) — Active, last modified 2026-03-12 (Artwork Image Classifier anti-hallucination rewrite #60 — image-first prompt architecture)
- **Error Handler V1.0** (`iAGcwyumKEOc83kj`) — Inactive

## Key Decisions
- **Perplexity model**: `sonar-deep-research` is required. `sonar-pro` hallucinated citations badly (Yayoi Kusama links for unrelated artists). Fixed in V0.6. See [enrichment-history.md](enrichment-history.md).
- **Citation validation**: AI-powered (GPT-4o-mini, temp 0.1) — evaluates each citation against artist identity anchors (email domain, website domain, location). Replaced V0.6 Code node string matching in V0.7.
- **Pre-process submission**: Code node detects gibberish (lorem ipsum), extracts identity anchors, computes data quality score (0-10). Added in V0.7 to handle common names + poor submissions.
- **AI Prompt Architecture**: XML tags, primacy/recency for constraints, self-check verification (per global CLAUDE.md rules)
- **Formatter model**: GPT-4.1 with JSON Schema strict mode, temp 0.2
- **Artwork classifier**: GPT-4o Vision, temp 0.3, image-first prompt architecture (V0.9 — image URL before metadata to prevent hallucination from titles/descriptions)
- **Relevance Hypothesis (AI)**: Planned (#61) — GPT-4o-mini text chain after classifier, hypothesizes artwork-to-exhibition theme connection. Skips output for generic exhibitions (no theme). Separate field from visual description.
- **Email brand design system**: AI Email Beautifier prompt specifies: header `#010101` (near-black, neutral for multi-brand logos), buttons `#040404`, 600px max-width, card-based sections, inline CSS only, table layout for Outlook. Added V1.2.
- **Airtable linked record append pattern**: When upserting linked records (e.g., Campaigns on Artist), must concat existing array + new ID and deduplicate. Expression: `($('SearchNode').item.json.Field || []).concat([newId]).filter(function(v,i,a){return a.indexOf(v)===i})`. Fixed in V1.3 (#52).
- **Code node audit (2026-03-11)**: 12 Code nodes across both workflows reviewed. Findings: 4 justified (Pre-Process Submission, Normalize Fields by Key, Detect Artworks, Resolve Tags), 4 need staticData so must stay as Code (Artist Progress, Artwork Progress, Finalize Run, Prepare Run Metadata — though Prepare Run Metadata is replaceable with Set), 3 replaceable with native nodes (Extract AC List IDs, Extract Tags to Add, Restore Artist Data via architecture change). 2 pairedItem bugs found and fixed. See #55.
- **Campaigns table ID**: `tblr0oR74rtvR6LN2` — added Embed Code (formula) and Exhibition URL fields (#59, closed)

## Model Evaluation Queue (low priority — current setup works, volume is ~10-15 submissions/month)
- `sonar-reasoning-pro` — chain-of-thought reasoning, faster than deep-research, citation tokens not billed. Untested.
- Claude Sonnet 4.6 + web search — could merge researcher+formatter into single AI Agent. Untested.
- OpenAI Responses API with web search (n8n v1.117.0+) — untested.
- **Decision (2026-03-09):** Staying with Perplexity `sonar-deep-research`. Slower but proven quality. Volume doesn't justify optimizing for speed.

## Project Phases — see `docs/phases/` for full details
- **Phase A (done)**: [phase-a-foundation.md](../../docs/phases/phase-a-foundation.md) — Intake V1.0, Enrichment V0.8, schema docs, .env
- **Phase B (complete)**: [phase-b-operations-hub.md](../../docs/phases/phase-b-operations-hub.md) — Pipeline Actions + Pipeline Runs tables, 13 pipeline tracking nodes in Enrichment V0.8, documentation. All issues #33-44 closed. Airtable Interface panels remain manual work (no API).
- **Phase C (planned, BLOCKED)**: [phase-c-export-pipeline.md](../../docs/phases/phase-c-export-pipeline.md) — Airtable → AA CSV export. Requires field mapping discussion before starting.
- **Phase D (backlog)**: [phase-d-future-improvements.md](../../docs/phases/phase-d-future-improvements.md) — Tech debt, model evaluation, Slack, analytics

## User Preferences
- Client is Scott Power (Scott "Salvador" Power) — owner of Not Real Art and Arterial (501c3)
- User prefers phased approach, local documentation, discussion before big changes
- User timezone: America/New_York (Eastern Time)
- Pre-approved CLI tools: git, gh, npm, npx, node, python3, supabase, vercel, curl, jq
- **No Code nodes without explicit approval.** Code nodes obfuscate workflow design, make maintenance harder, and break n8n's paired item tracking (V0.8.1 bug: silent wrong-record updates). Every Code node must be justified in the plan and approved by the user. Use native n8n nodes (Edit Fields, Set, IF, Switch) for data transformation. Claude's n8n MCP tendency is to default to Code nodes — actively resist this.
- **Do not trigger n8n workflow executions** unless the user explicitly asks. Double-triggering wastes API tokens (Perplexity, GPT) and creates race conditions.

## Gotchas
- **Never use `$json` in n8n expressions (CRITICAL)**: Always use `$('NodeName').item.json['field']`. The `$json` shorthand assumes data from the immediately preceding node — silently breaks when nodes are reordered or inserted. Caused production email failure in Intake V1.4 (4 fields resolved to `undefined`, admin notifications not sent). Only acceptable inside Code node JavaScript, never in expression fields.
- **Code node pairedItem (CRITICAL)**: Code nodes that return arrays using `.map()` MUST include `pairedItem: { item: index }`. Without it, n8n defaults all items to `pairedItem: {item: 0}`, causing all downstream `$('UpstreamNode').item.json` references to resolve to item 0 regardless of loop iteration. This caused silent wrong-record updates in V0.8 (#55). Downstream nodes should reference the nearest in-loop node, not nodes upstream of any Code node.
- n8n MCP validator false positives: `$('NodeName')` and `$input.item.json` are valid Code node v2 syntax
- n8n MCP `updateNode`: must use `nodeId` (UUID), not `name` or `id` — name resolution silently fails
- n8n MCP `addNode`: must include connections in same atomic operation, or node is rejected as "disconnected"
- n8n MCP connection params: use `source`/`target` (not `from`/`to`), `sourceIndex` (not `sourceOutput` for main connections)
- **lmChatOpenAi `model` param**: Must be resource locator object `{"__rl": true, "value": "gpt-4o-mini", "mode": "list", "cachedResultName": "gpt-4o-mini"}`, NOT a plain string. Plain strings save fine but cause "Could not get parameter" at runtime.
- **n8n autofix typeVersion upgrades**: May silently revert — always verify with `n8n_get_workflow` after applying
- **n8n Code node sandbox**: `new URL()`, `setTimeout`, `setInterval` not available. Use string manipulation for URL parsing. `try/catch` silently swallows ReferenceErrors from missing globals.
- **Airtable field lists**: Always verify all fields needed downstream are included. Missing fields produce empty values silently (no error).
- **n8n data flow pollution**: When an Airtable update node sits in the main data path, its output (the updated record from a different table) replaces upstream data. Downstream `$('NodeName').item.json` references resolve through paired item tracking and bypass the pollution, but `$input` references get the polluted data. Always use explicit node references (`$('OriginalNode').item.json.id`) to bypass polluted nodes.
- **n8n expression limitations**: Template literals (`${}`) don't work — use string concatenation. Optional chaining (`?.`) not supported — use `(obj || {})['field']` fallback pattern.
- **LLM output overflow**: Never require an LLM to echo back large text inside JSON output. The `research_message` field in Citation Validator caused JSON truncation with 35+ citations. Reference source data directly via n8n expressions instead of passing through LLM chains.
- **n8n addNode + addConnection atomicity**: When adding nodes via MCP, main output connections must be added as separate `addConnection` operations — including them inside `addNode.connections` doesn't always work. Always verify connections were created with `n8n_get_workflow(mode: "structure")`.
- **Airtable Lookup fields for cross-table filtering**: Use Lookup fields to propagate status from linked records (e.g., `Status (from Artist)` on Artworks table). This enables Airtable formula-based filtering without workflow complexity.
- **Paperform save-and-resume caching**: Paperform stores ALL form field values (including prefilled ones like `campaign`) in localStorage on its iframe origin (`rolling-submissions.paperform.co`). Cached values override `prefill=` attribute on return visits. Fix: add `&force=1` to the `prefill` attribute — forces prefilled values to override cache while preserving save-and-resume for user-entered fields. See issue #49.
- **Paperform webhook payload**: `body.device.url` is the iframe URL (not parent page URL), includes `_d=domain.com` (parent domain only, no path). No referrer header (server-side webhook). Campaign field: `body.data[0]` with `key: "b6sov"`.
- Airtable `airtable-cli` npm package is broken (v0.1.6) — use direct REST API via curl
- System python3 is 3.9.6; pip installs may target 3.11 — use `python3 -m pip install` to match

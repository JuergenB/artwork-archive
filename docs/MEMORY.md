# Artwork Archive — Project Memory

## Architecture
- **Intake + Enrichment**: n8n workflow nodes + Airtable (no application code)
- **Export Utility (Phase C)**: Next.js 16 + Auth.js + shadcn/ui app in `/app` directory, deployed on Vercel. Uses Airtable as sole database (including field mappings). Epic #74.
- n8n instance: https://polymash.app.n8n.cloud
- Airtable base: `appDFU2JdAw2Ckax4` (AA Rolling Submissions)
- Airtable PAT stored in project `.env`
- **Boilerplate**: `polymash-nextjs-airtable-boilerplate` (Next.js 16, Auth.js 5, Airtable SDK 0.12.2, shadcn/ui, Tailwind v4)
- **F1 Fantasy App reference**: `formula-one-fantasy-assistant` — production Airtable client pattern (fetchAll<T>, fetchById<T>, typed transforms, lazy-init)

## Workflows
- **Intake V1.6** (`QtP1J9Fwr5SPRG0u`) — Active, updated 2026-03-16 (dimension field renames #72: Height/Width/Depth → Height (AI)/Width (AI)/Depth (AI))
- **Enrichment V0.10** (`3c8WbVLT83fwnF2CaKIRz`) — Active, last modified 2026-03-16 (AI dimension extraction #72: Dimension Extractor GPT-4o-mini chain + structured output parser)
- **Social Profile Discovery V1.0** (`mRgdgMZTjamxK6S9`) — Inactive (new, 2026-03-16). Standalone workflow: Firecrawl website link scrape + Perplexity deep-research → GPT-4.1 validation → Social Profiles (AI) field. Triggered as control panel action. Issue #56.
- **Error Handler V1.0** (`iAGcwyumKEOc83kj`) — Inactive

## Key Decisions
- **Perplexity model**: `sonar-deep-research` is required. `sonar-pro` hallucinated citations badly (Yayoi Kusama links for unrelated artists). Fixed in V0.6. See [enrichment-history.md](enrichment-history.md).
- **Citation validation**: AI-powered (GPT-4o-mini, temp 0.1) — evaluates each citation against artist identity anchors (email domain, website domain, location). Replaced V0.6 Code node string matching in V0.7.
- **Pre-process submission**: Code node detects gibberish (lorem ipsum), extracts identity anchors, computes data quality score (0-10). Added in V0.7 to handle common names + poor submissions.
- **AI Prompt Architecture**: XML tags, primacy/recency for constraints, self-check verification (per global CLAUDE.md rules)
- **Formatter model**: GPT-4.1 with JSON Schema strict mode, temp 0.2
- **Artwork classifier**: GPT-4o Vision, temp 0.3 — requires binary image data (Fetch Artwork Image HTTP Request node downloads Airtable thumbnail). Text URLs don't trigger vision mode, causing hallucination from metadata.
- **Relevance Hypothesis (AI)**: Implemented (#61, V0.9) — GPT-4o-mini (temp 0.3) text chain after classifier, hypothesizes artwork-to-exhibition theme connection. Outputs "SKIP" for generic exhibitions (no theme). Uses Campaign Descriptions Lookup field. Separate field from visual description.
- **Email brand design system**: AI Email Beautifier prompt specifies: header `#010101` (near-black, neutral for multi-brand logos), buttons `#040404`, 600px max-width, card-based sections, inline CSS only, table layout for Outlook. Added V1.2.
- **Airtable linked record append pattern**: When upserting linked records (e.g., Campaigns on Artist), must concat existing array + new ID and deduplicate. Expression: `($('SearchNode').item.json.Field || []).concat([newId]).filter(function(v,i,a){return a.indexOf(v)===i})`. Fixed in V1.3 (#52).
- **Code node audit (2026-03-11)**: 12 Code nodes across both workflows reviewed. Findings: 4 justified (Pre-Process Submission, Normalize Fields by Key, Detect Artworks, Resolve Tags), 4 need staticData so must stay as Code (Artist Progress, Artwork Progress, Finalize Run, Prepare Run Metadata — though Prepare Run Metadata is replaceable with Set), 3 replaceable with native nodes (Extract AC List IDs, Extract Tags to Add, Restore Artist Data via architecture change). 2 pairedItem bugs found and fixed. See #55.
- **Dimension extraction**: LLM (GPT-4o-mini, temp 0) chosen over regex. Dimension formats have massive long tail (spelled-out numbers, mixed units, fractions, varying separators). Values stored in original units, no conversion. Assumes inches if unspecified. Fields renamed Height/Width/Depth → Height (AI)/Width (AI)/Depth (AI) + new Dimensions Unit (AI). Implemented V0.10 (#72).
- **Campaigns table ID**: `tblr0oR74rtvR6LN2` — added Embed Code (formula) and Exhibition URL fields (#59, closed)

## Model Evaluation Queue (low priority — current setup works, volume is ~10-15 submissions/month)
- `sonar-reasoning-pro` — chain-of-thought reasoning, faster than deep-research, citation tokens not billed. Untested.
- Claude Sonnet 4.6 + web search — could merge researcher+formatter into single AI Agent. Untested.
- OpenAI Responses API with web search (n8n v1.117.0+) — untested.
- **Decision (2026-03-09):** Staying with Perplexity `sonar-deep-research`. Slower but proven quality. Volume doesn't justify optimizing for speed.

## Project Phases — see `docs/phases/` for full details
- **Phase A (done)**: [phase-a-foundation.md](../../docs/phases/phase-a-foundation.md) — Intake V1.0, Enrichment V0.8, schema docs, .env
- **Phase B (complete)**: [phase-b-operations-hub.md](../../docs/phases/phase-b-operations-hub.md) — Pipeline Actions + Pipeline Runs tables, 13 pipeline tracking nodes in Enrichment V0.8, documentation. All issues #33-44 closed. Airtable Interface panels remain manual work (no API).
- **Phase C (in progress)**: Next.js export utility app in `/app` directory. Pivoted from n8n workflow due to systemic MCP issues. Epic #74, 10 sub-issues (#75-#84). Tech: Next.js 16, Auth.js 5, Airtable SDK, shadcn/ui, Vercel. Field mapping decisions (#84) can proceed in parallel with development.
- **Phase D (backlog)**: [phase-d-future-improvements.md](../../docs/phases/phase-d-future-improvements.md) — Tech debt, model evaluation, Slack, analytics

## User Preferences
- Client is Scott Power (Scott "Salvador" Power) — owner of Not Real Art and Arterial (501c3)
- User prefers phased approach, local documentation, discussion before big changes
- User timezone: America/New_York (Eastern Time)
- Pre-approved CLI tools: git, gh, npm, npx, node, python3, supabase, vercel, curl, jq
- **No Code nodes without explicit approval.** Code nodes obfuscate workflow design, make maintenance harder, and break n8n's paired item tracking (V0.8.1 bug: silent wrong-record updates). Every Code node must be justified in the plan and approved by the user. Use native n8n nodes (Edit Fields, Set, IF, Switch) for data transformation. Claude's n8n MCP tendency is to default to Code nodes — actively resist this.
- **Do not trigger n8n workflow executions** unless the user explicitly asks. Double-triggering wastes API tokens (Perplexity, GPT) and creates race conditions.
- **Epic issues have a mixed audience.** Non-technical stakeholders (CEO, partner org leaders) read epics too. Always lead with a **Purpose** section (why we're doing this, what problem it solves) and a **What This Enables** section (concrete benefits in plain language) before any architecture or technical details. Sub-issues can be fully technical.
- **Keep README.md current.** When creating or updating epics/sub-issues, do a relevance check on `README.md` and update it if the changes affect project scope, phases, architecture, workflows, or AI models. The repo README is the public-facing overview and must always reflect the current state of the project.

## References
- [Firecrawl Web Scraping](memory/reference_firecrawl.md) — n8n credential, sub-workflow, project usage. Full docs in global CLAUDE.md.
- [n8n API workflow creation gotcha](memory/gotcha_n8n_api_workflow_creation.md) — Known n8n bug: API-created workflows render blank in UI. Clone-and-modify pattern is the workaround.
- **n8n-skills installed** (2026-03-16): 7 skills from `czlonkowski/n8n-skills` at `~/.claude/skills/` — n8n-mcp-tools-expert, n8n-workflow-patterns, n8n-node-configuration, n8n-validation-expert, n8n-expression-syntax, n8n-code-javascript, n8n-code-python

## Tooling
- **n8n Node Config Validator** (`scripts/validate-n8n-nodes.js`) — added 2026-03-17. Pure Node.js script (no deps) that validates `n8n_update_partial_workflow` operations JSON before MCP calls. Checks 8 failure modes: wrong typeVersion, plain string model (missing `__rl`), `prompt` vs `promptType`+`text` on chainLlm, missing `batching`, `$json` in expressions, `fields.values[]` on Airtable update, missing AI sub-node connections, Set node old `fields.values` format (renders empty in UI). Run via: `echo '<ops JSON>' | node scripts/validate-n8n-nodes.js`. Exit 0=pass, 1=fail. MCP calls cannot be intercepted by Claude Code hooks (PreToolUse only fires for Bash/Edit/Write), so this validator + skill rules are the only pre-flight defense. Based on Perplexity deep-research recommendations (see `docs/n8n-claude-code-issues.md`).
- **n8n-project-config skill** (`~/.claude/skills/n8n-project-config/SKILL.md`) — 14 verified JSON node templates, credential IDs, typeVersion table, expression rules, connection patterns. Enhanced 2026-03-17 with STOP gate (primacy), post-creation checklist (recency), "clone-don't-invent" enforcement, and mandatory validator step.

## Gotchas
- **Never use `$json` in n8n expressions (CRITICAL)**: Always use `$('NodeName').item.json['field']`. The `$json` shorthand assumes data from the immediately preceding node — silently breaks when nodes are reordered or inserted. Caused production email failure in Intake V1.4 (4 fields resolved to `undefined`, admin notifications not sent). Only acceptable inside Code node JavaScript, never in expression fields.
- **Code node pairedItem (CRITICAL)**: Code nodes that return arrays using `.map()` MUST include `pairedItem: { item: index }`. Without it, n8n defaults all items to `pairedItem: {item: 0}`, causing all downstream `$('UpstreamNode').item.json` references to resolve to item 0 regardless of loop iteration. This caused silent wrong-record updates in V0.8 (#55). Downstream nodes should reference the nearest in-loop node, not nodes upstream of any Code node.
- n8n MCP validator false positives: `$('NodeName')` and `$input.item.json` are valid Code node v2 syntax
- n8n MCP `updateNode`: must use `nodeId` (UUID), not `name` or `id` — name resolution silently fails
- n8n MCP `addNode`: must include connections in same atomic operation, or node is rejected as "disconnected"
- n8n MCP connection params: use `source`/`target` (not `from`/`to`), `sourceIndex` (not `sourceOutput` for main connections)
- **lmChatOpenAi `model` param**: Must be resource locator object `{"__rl": true, "value": "gpt-4o-mini", "mode": "list", "cachedResultName": "gpt-4o-mini"}`, NOT a plain string. Plain strings save fine but cause "Could not get parameter" at runtime.
- **n8n MCP node typeVersion defaults are STALE (CRITICAL)**: When creating ANY new node via MCP, the MCP server uses outdated default typeVersions. This caused 4 consecutive execution failures on the Dimension Extractor (#72): outputParserStructured defaulted to 1.2 (should be 1.3), chainLlm defaulted to 1.4 (should be 1.9). **RULE: Before creating any node via MCP, inspect an existing working node of the same type in the workflow and copy its typeVersion.** Current known good versions in this project: `chainLlm: 1.9`, `outputParserStructured: 1.3`, `lmChatOpenAi: 1.3`.
- **n8n autofix typeVersion upgrades**: May silently revert — always verify with `n8n_get_workflow` after applying
- **n8n Code node sandbox**: `new URL()`, `setTimeout`, `setInterval` not available. Use string manipulation for URL parsing. `try/catch` silently swallows ReferenceErrors from missing globals.
- **Airtable field lists**: Always verify all fields needed downstream are included. Missing fields produce empty values silently (no error).
- **n8n data flow pollution**: When an Airtable update node sits in the main data path, its output (the updated record from a different table) replaces upstream data. Downstream `$('NodeName').item.json` references resolve through paired item tracking and bypass the pollution, but `$input` references get the polluted data. Always use explicit node references (`$('OriginalNode').item.json.id`) to bypass polluted nodes.
- **n8n expression limitations**: Template literals (`${}`) don't work — use string concatenation. Optional chaining (`?.`) not supported — use `(obj || {})['field']` fallback pattern.
- **LLM output overflow**: Never require an LLM to echo back large text inside JSON output. The `research_message` field in Citation Validator caused JSON truncation with 35+ citations. Reference source data directly via n8n expressions instead of passing through LLM chains.
- **n8n addNode + addConnection atomicity**: When adding nodes via MCP, main output connections must be added as separate `addConnection` operations — including them inside `addNode.connections` doesn't always work. Always verify connections were created with `n8n_get_workflow(mode: "structure")`.
- **n8n API-created workflows render blank (CRITICAL)**: Known n8n platform bugs (#23620, #17247). Workflows created via `n8n_create_workflow` with AI/langchain nodes show blank canvas in UI. Root cause: API is more permissive than UI — accepts configs the frontend can't render. **Workaround: Never create complex workflows from scratch via MCP. Use clone-and-modify: user creates skeleton in UI, then `n8n_update_partial_workflow` to add/modify nodes.** After any API creation, open in UI and click Save to trigger webhook registration.
- **Airtable Lookup fields for cross-table filtering**: Use Lookup fields to propagate status from linked records (e.g., `Status (from Artist)` on Artworks table). This enables Airtable formula-based filtering without workflow complexity.
- **Paperform save-and-resume caching**: Paperform stores ALL form field values (including prefilled ones like `campaign`) in localStorage on its iframe origin (`rolling-submissions.paperform.co`). Cached values override `prefill=` attribute on return visits. Fix: add `&force=1` to the `prefill` attribute — forces prefilled values to override cache while preserving save-and-resume for user-entered fields. See issue #49.
- **Paperform webhook payload**: `body.device.url` is the iframe URL (not parent page URL), includes `_d=domain.com` (parent domain only, no path). No referrer header (server-side webhook). Campaign field: `body.data[0]` with `key: "b6sov"`. Partner ID field: key `3tdho`, custom key `partner_id`.
- **Paperform hidden fields and required**: Hidden fields marked "required" do NOT block submission — Paperform only enforces required on visible fields. Empty hidden fields submit fine.
- **Set node v3.4 `fields.values` vs `assignments.assignments` (CRITICAL)**: The old Set node format `fields.values[{name, stringValue}]` is accepted by the n8n API but renders as EMPTY in the n8n UI — the node shows "Drag input fields here" with no visible assignments. The correct UI-compatible format is `assignments.assignments[{id, name, value, type}]`. Each assignment needs a UUID `id`, `name` (field name), `value` (static or expression), and `type` ("string", "number", "boolean", "array", "object"). Do NOT use `mode`, `includeOtherFields`, or `includeBinary` — these are old parameters. Discovered 2026-03-17 when building reference workflow `o6oYKsfttQnm4n7t`.
- **Firecrawl `waitFor: 3000` is REQUIRED**: Without `waitFor`, Firecrawl returns 500 errors on many sites. Always include `"waitFor": 3000` in `scrapeOptions.options` to wait 3 seconds for JS rendering before scraping. Discovered 2026-03-17 when testing reference workflow. Also: the UI saves the default markdown format as `{}` (empty object), not `{"type": "markdown"}`.
- **Firecrawl credential updated (2026-03-17)**: Old credential `"Fire Crawl Web Crawler"` (`bELMVFmTqYBfSYgx`) replaced with `"Firecrawl account"` (`Mv9l4N593kDPmnd0`). All skill templates updated.
- **n8n MCP node names with apostrophes**: Node names containing apostrophes (e.g., "When clicking 'Execute workflow'") cause `addConnection` to fail with "Source node not found". Workaround: use the node's UUID `id` instead of `name` in connection operations.
- **n8n Reference Workflow**: `o6oYKsfttQnm4n7t` ("Claude n8n Common Nodes Reference") — contains 7 correctly configured production nodes (Manual Trigger, Set, Firecrawl, chainLlm, lmChatOpenAi, outputParserStructured with autoFix LLM). Use `n8n_get_workflow(id: "o6oYKsfttQnm4n7t", mode: "full")` to extract verified node configs.
- Airtable `airtable-cli` npm package is broken (v0.1.6) — use direct REST API via curl
- System python3 is 3.9.6; pip installs may target 3.11 — use `python3 -m pip install` to match

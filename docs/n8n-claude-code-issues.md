# n8n + Claude Code MCP: Systemic Issues Catalog

**Last updated:** 2026-03-17
**Context:** Artwork Archive project — automated artwork submission pipeline built on n8n workflows + Airtable, configured exclusively through Claude Code using the n8n-mcp server.

---

## 1. Executive Summary

Claude Code, when used to build and modify n8n workflows via the n8n-mcp server, exhibits a persistent pattern of node misconfiguration that documentation, memory files, custom skills, and explicit rules have all failed to fully eliminate. The root cause, as diagnosed during a multi-session debugging effort on 2026-03-16, is that **Claude generates node configurations from training data rather than following documented rules or looking up actual schemas.** Training data contains outdated or incorrect parameter structures for n8n nodes, and these override explicit instructions provided in CLAUDE.md, MEMORY.md, and custom skills.

The practical impact: building a 16-node Social Profile Discovery workflow required **3+ full conversation sessions** (each running out of context), multiple hours of debugging, and the creation of an entire custom skill with 14 node templates extracted from working production nodes — all to accomplish what should have been a straightforward configuration task.

This document catalogs every recurring failure category, what was tried to fix it, and whether the fix works. It concludes with a Perplexity deep-research prompt for investigating how the broader community handles this problem.

---

## 2. Recurring Failure Categories

### 2a. chainLlm (Basic LLM Chain) Misconfiguration

**What goes wrong:**
Claude configures chainLlm nodes using `prompt` as the parameter name for the user prompt. In chainLlm typeVersion 1.9 (the current production version), the correct parameters are `promptType: "define"` combined with `text`. When `promptType` is omitted, it defaults to `"auto"`, which expects a connected Chat Trigger node providing `$json.chatInput` — a mode that makes no sense in a webhook-triggered workflow.

**Specific example:** During the Social Profile Discovery build (2026-03-16), the Validate & Merge chainLlm node was configured with `prompt: "=Your prompt..."` instead of `promptType: "define"` + `text: "=Your prompt..."`. This caused a silent failure — the node accepted the config but produced empty output at runtime because it was waiting for chat input that never arrived.

**Why it happens:** Claude's training data contains older chainLlm versions (v1.0-1.3) where `prompt` was the correct parameter name. The model pattern-matches to what it has seen most frequently, not what the current version requires.

**What was tried:**
1. Explicit rule in CLAUDE.md: "The parameter name for the prompt is `text`, NOT `prompt`"
2. Explicit rule in MEMORY.md gotchas section
3. Custom skill (`n8n-project-config`) with exact JSON template showing `promptType: "define"` + `text`
4. `n8n-node-configuration` skill from czlonkowski/n8n-skills package

**Current status:** Partially fixed. The custom skill template works when the skill is actively loaded into the conversation, but Claude still defaults to wrong parameters when generating without explicit skill reference. The skill must be manually triggered or explicitly loaded by the user.

---

### 2b. lmChatOpenAi Model Parameter Format

**What goes wrong:**
Claude configures the `model` parameter as a plain string (e.g., `"model": "gpt-4o-mini"`) instead of the required resource locator object:
```json
{
  "model": {
    "__rl": true,
    "value": "gpt-4o-mini",
    "mode": "list",
    "cachedResultName": "gpt-4o-mini"
  }
}
```
Plain strings save to the workflow without error, but cause "Could not get parameter" at runtime.

**Why it happens:** The resource locator pattern (`__rl: true`) is an n8n-internal implementation detail not present in any public API documentation. Claude has no way to know this from training data. The only source of truth is inspecting existing working nodes.

**What was tried:**
1. Explicit rule in CLAUDE.md and MEMORY.md
2. Custom skill template with exact JSON format
3. Global CLAUDE.md n8n platform knowledge section

**Current status:** Fixed when using the custom skill template. Still fails if Claude generates the config freeform.

---

### 2c. Perplexity Node Parameter Structure

**What goes wrong:**
Claude configures the Perplexity node with a simple `prompt` string parameter. The actual n8n Perplexity node uses a `messages` object containing a `message` array with role-based entries:
```json
{
  "messages": {
    "message": [
      {"role": "system", "content": "..."},
      {"content": "..."}
    ]
  }
}
```

**Specific example:** During the Social Profile Discovery build, the Social Profile Search node was created with `"prompt": "=Your system prompt..."`. This was caught during validation and fixed using the skill template.

**Why it happens:** Most LLM APIs use a simple `prompt` parameter. The n8n Perplexity node's nested `messages.message[]` structure is non-standard and unlikely to appear frequently in training data.

**What was tried:**
1. Custom skill template (#4) with exact JSON structure
2. Explicit note in CLAUDE.md

**Current status:** Fixed when using the custom skill template.

---

### 2d. Firecrawl Node — HTTP Request Instead of Native Node

**What goes wrong:**
When instructed to use Firecrawl for web scraping, Claude creates an HTTP Request node configured to call the Firecrawl API directly (with URL, headers, and JSON body), instead of using the native Firecrawl community node (`@mendable/n8n-nodes-firecrawl.firecrawl`). This is fragile, duplicates auth handling, and misses the node's built-in features.

**Specific example (2026-03-16 transcript, line 92):**
User: "Why are you not aware that we are using, all over the place, fire crawl and that there is an n8n node for this? We are trying to avoid using code nodes when we have this."

Claude had no Firecrawl reference in the project CLAUDE.md at the time. It defaulted to the HTTP Request approach because that is what training data contains for Firecrawl API usage.

**Why it happens:** Firecrawl is a community node, not a core n8n node. Claude's training data contains Firecrawl's REST API documentation but not its n8n-specific node configuration.

**What was tried:**
1. Added Firecrawl template (#9) to custom skill with exact parameter structure
2. Added Firecrawl reference to global memory
3. Documented in project CLAUDE.md

**Current status:** Fixed when using the custom skill template. Still requires explicit mention of Firecrawl in the skill/instructions — Claude defaults to HTTP Request without it.

---

### 2e. Airtable Update Node — Wrong Parameter Structure

**What goes wrong:**
Claude configures Airtable update operations using `fields.values[]` (an array of field objects), which is either from an older typeVersion or from Claude's generic understanding of "how APIs work." The correct structure for Airtable typeVersion 2.1 is:
```json
{
  "columns": {
    "mappingMode": "defineBelow",
    "value": {
      "id": "={{ ... }}",
      "FieldName": "={{ ... }}"
    },
    "matchingColumns": ["id"],
    "schema": []
  }
}
```

The `base` and `table` parameters also require the resource locator pattern (`__rl: true`), which Claude omits.

**Why it happens:** The `columns` + `mappingMode` + `matchingColumns` structure is specific to n8n's Airtable node v2.1. Generic API patterns use field arrays.

**What was tried:**
1. Custom skill template (#5) with exact search and update JSON
2. Explicit rule in skill: "Update uses `columns` with `mappingMode: 'defineBelow'`, NOT `fields.values[]`"

**Current status:** Fixed when using the custom skill template.

---

### 2f. Set/Edit Fields Node — Empty Configuration

**What goes wrong:**
Claude creates Set nodes with empty or incomplete `fields.values` arrays. The node saves but passes data through without transforming it. This was observed on the "Merge Website Links" node in the Social Profile Discovery workflow, where the node had `includeOtherFields: true` and `options: {}` but no actual field definitions.

**Why it happens:** The Set node (typeVersion 3.4) requires `mode: "manual"` and a properly structured `fields.values[]` array. Claude sometimes omits the mode or the values array, resulting in a pass-through node.

**What was tried:**
1. Custom skill template (#10) with exact JSON structure

**Current status:** Fixed when using the custom skill template. Failure is easy to spot (node shows "No fields" in the UI).

---

### 2g. $json Shorthand in Expressions

**What goes wrong:**
Claude uses `$json['field']` or `$json.field` in n8n expression fields instead of the explicit form `$('NodeName').item.json['field']`. The `$json` shorthand resolves to data from the immediately preceding node, which silently breaks when:
- Nodes are reordered
- A new node is inserted between source and consumer
- An Airtable update node replaces upstream data (data flow pollution)

**Specific example (Intake V1.4 fix):** Eight fields in the Notification Email Prep node used `$json['...']` references. Four of them (Admin Notification Email Addresses, Submitter Email Address, Campaign Logo Small/Medium) resolved to `undefined` because an intermediate node changed the data flow. Admin notification emails stopped sending entirely. No error was thrown.

**Why it happens:** `$json` is by far the most common expression pattern in n8n documentation, tutorials, and community examples. Claude's training data overwhelmingly favors it.

**What was tried:**
1. Explicit rule in project CLAUDE.md: "Never use `$json` or `$json['field']` in n8n expressions"
2. Explicit rule in global CLAUDE.md
3. Gotcha entry in MEMORY.md marked as "CRITICAL"
4. Expression rules section in custom skill
5. n8n-expression-syntax skill from czlonkowski package

**Current status:** Still occurs. This is the most persistent failure because `$json` is deeply embedded in Claude's training data. Rules reduce frequency but do not eliminate it. Every node configuration must be manually reviewed for `$json` usage.

---

### 2h. Unsupported Expression Syntax

**What goes wrong:**
Claude uses JavaScript features that n8n's expression engine does not support:
- **Template literals** (`` `${variable}` ``) — must use string concatenation instead
- **Optional chaining** (`obj?.field`) — must use `(obj || {})['field']` fallback pattern

**Specific example (V0.8):** The "Update Action (Artworks Phase)" node used optional chaining (`?.`) in an expression, causing a syntax error at runtime.

**Why it happens:** Template literals and optional chaining are standard modern JavaScript. Claude defaults to idiomatic JS without awareness that n8n's expression engine uses a restricted subset.

**What was tried:**
1. Explicit rules in CLAUDE.md and MEMORY.md
2. Expression rules in custom skill
3. n8n-expression-syntax skill

**Current status:** Partially fixed. Claude still occasionally generates template literals in expressions but catches itself more often when rules are loaded.

---

### 2i. Stale typeVersion Defaults

**What goes wrong:**
The n8n-mcp server creates nodes with outdated default typeVersions. For example:
- `outputParserStructured` defaults to 1.2 (should be 1.3)
- `chainLlm` defaults to 1.4 (should be 1.9)

These version mismatches cause runtime failures. The Dimension Extractor feature (#72) required **4 consecutive execution failures** before the typeVersion issue was identified as the root cause.

**Why it happens:** The MCP server's node type registry is not kept in sync with the n8n instance's actual installed versions. This is a bug in the MCP server, not in Claude's reasoning.

**What was tried:**
1. Explicit MEMORY.md gotcha: "Before creating any node via MCP, inspect an existing working node of the same type in the workflow and copy its typeVersion"
2. TypeVersion reference table in custom skill (14 node types with correct versions)
3. Rule: always inspect existing working nodes before creating new ones

**Current status:** Fixed by the custom skill's typeVersion reference table, but requires the skill to be loaded. Without it, the MCP server's stale defaults are used silently.

---

### 2j. Unnecessary Code Nodes

**What goes wrong:**
Claude defaults to Code nodes for data transformation, field mapping, and conditional logic instead of using native n8n nodes (Edit Fields, Set, IF, Switch). Code nodes:
- Break n8n's automatic paired item tracking
- Cause silent data corruption (wrong record updates in loops) when `pairedItem: { item: index }` is omitted
- Obfuscate workflow logic
- Make maintenance harder for non-developers

**Specific example (V0.8.1, issue #55):** The `Restore Artist Data` Code node was missing `pairedItem: { item: index }`. In multi-artist batches, all downstream `$('Find Pending Artists').item.json` references resolved to item 0 regardless of loop iteration, causing the wrong Airtable record to be updated silently.

**Why it happens:** Code nodes are Claude's comfort zone. When faced with any data transformation need, Claude's default instinct is to write JavaScript rather than use n8n's declarative nodes.

**What was tried:**
1. Explicit project rule: "No Code nodes without explicit approval"
2. MEMORY.md feedback entry: "Code nodes require explicit justification and user sign-off"
3. CLAUDE.md section: detailed rules for when Code nodes are acceptable
4. Code node audit (12 nodes reviewed, 2 pairedItem bugs found)

**Current status:** Partially fixed. Claude now hesitates before creating Code nodes but still proposes them as first choice for complex transformations. Requires active user pushback.

---

### 2k. API-Created Workflows Rendering Blank

**What goes wrong:**
Workflows created from scratch via the n8n API (including via MCP) render as a blank canvas in the n8n UI. The canvas shows no nodes even though the API confirms they exist. This particularly affects workflows containing AI/langchain nodes.

**Why it happens:** Known n8n platform bugs (GitHub issues #23620, #17247, #14646). The n8n REST API is more permissive than the UI — it accepts configurations the frontend cannot render. typeVersion mismatches and missing UI metadata (like `webhookId` for webhook nodes) compound the problem.

**Specific example:** The Social Profile Discovery workflow was created via MCP, appeared blank in the UI, and required the user to create a skeleton workflow manually in the UI before Claude could modify it.

**What was tried:**
1. Documented as "CRITICAL" gotcha in MEMORY.md
2. Workaround established: "Never create complex workflows from scratch via MCP. Use clone-and-modify: user creates skeleton in UI, then `n8n_update_partial_workflow` to add/modify nodes."
3. Explicit note in custom skill: "DO NOT create webhook nodes via MCP. Have the user create them in the n8n UI."

**Current status:** Workaround is reliable but adds friction. The user must manually create a skeleton workflow in the n8n UI before Claude can build on it.

---

### 2l. addNode + addConnection Atomicity

**What goes wrong:**
When adding nodes via MCP's `n8n_update_partial_workflow`, main output connections included inside `addNode.connections` do not always persist. Connections must be added as separate `addConnection` operations in the same atomic call.

**Why it happens:** The MCP server's `addNode` operation does not reliably process inline connection definitions for main data flow. AI sub-node connections (via `sourceOutput` parameter) work differently and are more reliable.

**What was tried:**
1. Documented in MEMORY.md and CLAUDE.md
2. Custom skill connection patterns section with separate `addConnection` examples
3. Rule: "Always verify connections were created with `n8n_get_workflow(mode: 'structure')`"

**Current status:** Fixed by always using separate `addConnection` operations. Requires discipline to verify after every modification.

---

### 2m. Data Flow Pollution

**What goes wrong:**
When an Airtable update node sits in the main data path, its output (the updated record) replaces upstream data. Downstream nodes using `$input.item.json` get the Airtable update response instead of the original data. Only explicit node references (`$('OriginalNode').item.json`) bypass the pollution via paired item tracking.

**Specific example (V0.8):** The "Update record" artwork node's output polluted downstream data. The fix was changing `$('Any Valid Artworks Found?').item.json.id` (which received polluted data) to `$('Find Related Artworks').item.json.id`.

**Why it happens:** n8n's data flow is sequential — each node's output replaces the previous node's data in the main flow. Claude does not model this data flow behavior and frequently generates expressions that reference `$input` or `$json` downstream of Airtable writes.

**What was tried:**
1. Explicit rule: "Always use explicit node references to bypass polluted nodes"
2. Documented in MEMORY.md gotchas
3. Documented in global CLAUDE.md platform knowledge

**Current status:** Partially fixed. Claude sometimes remembers to use explicit references but does not consistently model data flow pollution when designing workflows.

---

### 2n. LLM Output Overflow

**What goes wrong:**
When an LLM node is asked to include large text fields in its JSON output (e.g., echoing back a full research report inside a structured output), the JSON gets truncated. This causes downstream parsing failures.

**Specific example (V0.8):** The Citation Validator's schema included a `research_message` field that required the LLM to echo back the entire Perplexity research output (which could be 35+ citations). The JSON was truncated mid-output. The fix was removing `research_message` from the schema and having the downstream Formatter node reference `$('Artist Profile Researcher').item.json.message` directly via n8n expressions.

**Why it happens:** Claude designs LLM chains as isolated processors without considering that n8n expressions can reference data from any upstream node. It defaults to passing all needed data through the LLM rather than using n8n's expression system for data that doesn't need AI processing.

**What was tried:**
1. Explicit rule in MEMORY.md and CLAUDE.md
2. Principle documented: "Reference source data directly via n8n expressions instead of passing through LLM chains"

**Current status:** Partially fixed. Claude still occasionally designs LLM chains that try to pass through large amounts of data.

---

### 2o. autofix typeVersion Upgrades Reverting

**What goes wrong:**
Running `n8n_autofix_workflow` sometimes upgrades node typeVersions, but the upgrades silently revert on the next workflow save or execution.

**Why it happens:** Unknown — likely an n8n platform bug where typeVersion changes made via API do not persist through the UI save cycle.

**What was tried:**
1. Rule: "After running `n8n_autofix_workflow`, always verify the changes with `n8n_get_workflow`"
2. Documented in MEMORY.md and CLAUDE.md

**Current status:** Workaround (verify after autofix) is functional but adds another verification step to every workflow change.

---

## 3. Mitigation Attempts

### 3.1 CLAUDE.md Rules (Project + Global)

**Approach:** Extensive documentation in both project-level and global CLAUDE.md files covering n8n platform knowledge, expression rules, gotchas, and best practices. The project CLAUDE.md alone contains ~450 lines of n8n-specific rules.

**Effectiveness:** Low for generation-time failures. Claude reads and acknowledges the rules at conversation start but reverts to training data patterns during actual node configuration. Rules are most effective for high-level design decisions (e.g., "use Perplexity sonar-deep-research, not sonar-pro") but ineffective for JSON structure generation.

**User quote (line 1170):** "I am interested in why this is systemically being ignored."

**Claude's own diagnosis (line 1173):** "When I'm generating complex JSON configurations, I fall back to pattern-matching from training data instead of following documented rules. I 'know' how a chainLlm node works from training — and that knowledge is wrong for v1.9. The rules in CLAUDE.md and MEMORY.md are read and understood at the start, but they don't stay active constraints during generation."

### 3.2 MEMORY.md Gotchas

**Approach:** Dedicated gotchas section in project memory with entries marked as "CRITICAL" for the most dangerous failures (e.g., `$json` shorthand, stale typeVersions, Code node pairedItem).

**Effectiveness:** Moderate. Gotchas are consulted at conversation start but have the same generation-time override problem as CLAUDE.md rules. More effective than CLAUDE.md rules because they are typically shorter and more action-oriented.

### 3.3 Custom Skill: n8n-project-config

**Approach:** Created on 2026-03-16 after multiple hours of debugging. Contains 14 exact JSON templates extracted from working production nodes, credential IDs, typeVersion reference table, connection patterns, and expression rules. Designed to completely eliminate freeform generation — Claude should copy templates and fill in dynamic values only.

**Effectiveness:** High when loaded. The skill successfully fixed all 4 misconfigured nodes in the Social Profile Discovery workflow in a single pass. However, the skill must be explicitly loaded into the conversation (either by user or by trigger matching), and there is no guarantee it will be invoked automatically for every n8n operation.

**Key limitation:** Skills are loaded based on trigger word matching. If the user's request does not contain trigger words, the skill is not loaded, and Claude falls back to freeform generation.

### 3.4 czlonkowski/n8n-skills Package (7 Skills)

**Approach:** Installed 7 generic n8n skills from a community package:
- n8n-mcp-tools-expert
- n8n-workflow-patterns
- n8n-node-configuration
- n8n-validation-expert
- n8n-expression-syntax
- n8n-code-javascript
- n8n-code-python

**Effectiveness:** Low to moderate. These skills provide generic best practices but do not contain project-specific configurations. The n8n-node-configuration skill describes the process of looking up schemas but does not prevent Claude from generating incorrect configs. The skills add context but do not solve the fundamental generation-time problem.

### 3.5 Validation Loops

**Approach:** Mandatory validate-after-change pattern: `n8n_validate_workflow` -> `n8n_autofix_workflow` -> `n8n_get_workflow` to verify.

**Effectiveness:** Moderate. Catches structural errors (disconnected nodes, missing connections) but does not catch semantic errors (wrong parameter names that are syntactically valid, `$json` usage that resolves but to wrong data, wrong typeVersion that executes but produces wrong results).

### 3.6 Clone-and-Modify Approach

**Approach:** User creates a skeleton workflow in the n8n UI (webhook trigger, basic structure), then Claude modifies it using `n8n_update_partial_workflow`.

**Effectiveness:** High for avoiding the blank-canvas bug. Does not prevent node misconfiguration within the modification operations.

---

## 4. Root Cause Analysis

### 4.1 Training Data Overrides Documentation

The fundamental problem: Claude's training data contains n8n node configurations from older versions, generic API patterns, and community examples that differ from the actual parameter structures of the specific n8n version in production. During JSON generation, Claude pattern-matches to training data rather than following documented rules. This is not a failure of comprehension — Claude can explain the correct format when asked — but a failure of generation discipline.

### 4.2 Context Window Prioritization

Long CLAUDE.md files (450+ lines of n8n rules) compete with other context for attention. Critical rules buried in the middle of long documents receive degraded attention (the U-shaped attention curve). Despite placing rules at the beginning and repeating them at the end, the sheer volume of n8n-specific documentation dilutes the signal.

### 4.3 Skill Triggering Unreliability

Custom skills are triggered by keyword matching against the user's message. If the user says "add a node to the workflow" without mentioning specific node types, the `n8n-project-config` skill may not trigger. There is no mechanism to force a skill to always be loaded for a specific project.

### 4.4 MCP Tool Abstraction

Claude interacts with n8n through the MCP wrapper, not the actual n8n REST API. This abstraction means:
- Claude cannot inspect the actual API response format
- Error messages from the MCP server are sometimes opaque
- Claude cannot independently verify what it sent vs. what n8n received
- The MCP server's own defaults (stale typeVersions) add another source of incorrect configuration

### 4.5 No Runtime Feedback Loop

Configuration errors only surface at execution time, which is disconnected from the configuration step. Claude configures a node, validates it (structural checks pass), and moves on. The semantic error is only discovered when the user runs the workflow and gets an unexpected result. By that point, the context has moved on, and debugging requires re-establishing the full state.

### 4.6 Silent Failures

Many n8n misconfiguration errors are silent:
- Wrong `promptType` defaults to waiting for chat input (no error, just empty output)
- `$json` resolves to available data (no error, just wrong data)
- Plain string model parameter saves fine (error only at runtime)
- Missing `pairedItem` causes item 0 to be used for all iterations (no error, just wrong records)

This means the validate-after-change pattern catches only a fraction of actual issues.

---

## 5. Questions for Community Research

1. **Do other teams successfully use Claude Code (or other AI coding assistants) to build n8n workflows via MCP?** If so, what patterns, constraints, or tooling make it work?

2. **Are there alternative MCP servers** for n8n that handle typeVersion defaults correctly, provide better validation, or expose more of the n8n API surface?

3. **Has anyone built a "node configuration validator"** that checks semantic correctness (not just structural validity) — e.g., verifying that chainLlm uses `promptType: "define"` and not the default auto mode?

4. **What is the community's recommended approach** for AI-assisted workflow building? Is the MCP route the right one, or do people use Cursor/Windsurf/Copilot with n8n's codebase directly?

5. **Are there n8n workflow generation tools or templates** that produce correct JSON for the current n8n version, which could be used as a reference layer between Claude and the MCP server?

6. **How do people handle the "blank canvas" bug** (n8n issues #23620, #17247)? Is there a known fix or a version where it is resolved?

7. **Does the n8n team have plans** to improve the API's parity with the UI (e.g., webhook registration, typeVersion handling, resource locator validation)?

8. **Are there custom MCP tools or middleware** that validate node configurations against the actual n8n node schema before sending them to the API?

9. **What is the experience with other LLMs** (GPT-4, Gemini) for n8n workflow building via MCP? Do they exhibit the same training-data-overrides-documentation problem?

10. **Are there working examples** of n8n workflow JSON generators (not MCP, but standalone scripts or tools) that produce correct configurations for current n8n versions?

---

## 6. Perplexity Deep Research Prompt

The following prompt is designed for Perplexity's `sonar-deep-research` model. Copy it verbatim into a Perplexity deep-research query.

---

```
I need comprehensive research on using AI coding assistants (especially Claude Code by Anthropic, but also Cursor, Windsurf, GitHub Copilot, and others) to build and modify n8n workflows. I have been using Claude Code with the n8n-mcp server (https://github.com/nerding-io/n8n-mcp-server or similar) for months and have encountered persistent, systemic issues that documentation and custom rules have failed to solve.

## Specific Failure Modes I Need Solutions For

These are the exact recurring problems. Please search for community discussions, blog posts, forum threads, YouTube tutorials, GitHub issues, and any other sources that address these specific failure modes:

1. **chainLlm node misconfiguration**: AI assistants configure n8n's Basic LLM Chain node (typeVersion 1.9) using `prompt` as the parameter name instead of `promptType: "define"` + `text`. The AI's training data contains older versions where `prompt` was correct. Has anyone solved this for AI-assisted workflow building?

2. **lmChatOpenAi resource locator pattern**: The OpenAI Chat Model sub-node requires `model` to be a resource locator object (`{"__rl": true, "value": "gpt-4o", "mode": "list", "cachedResultName": "gpt-4o"}`) instead of a plain string. Plain strings save without error but fail at runtime with "Could not get parameter." How do people handle this n8n-specific pattern when using AI tools?

3. **MCP server stale typeVersion defaults**: The n8n-mcp server creates nodes with outdated typeVersions (e.g., outputParserStructured 1.2 instead of 1.3, chainLlm 1.4 instead of 1.9). These cause runtime failures. Are there MCP server forks or configurations that handle this correctly?

4. **$json shorthand in expressions**: AI assistants default to `$json['field']` in n8n expressions instead of the safer `$('NodeName').item.json['field']`. The shorthand breaks silently when nodes are reordered. Is there a linter, pre-commit hook, or validation tool that catches this?

5. **API-created workflows rendering blank**: n8n GitHub issues #23620, #17247, #14646 — workflows created via the REST API (including via MCP) render as blank canvases in the UI, especially when containing AI/langchain nodes. What is the current status of these bugs? Are there workarounds beyond "create skeleton in UI first"?

6. **Community node configuration** (e.g., Firecrawl `@mendable/n8n-nodes-firecrawl.firecrawl`): AI assistants default to HTTP Request nodes instead of native community nodes because training data contains the REST API approach. How do people teach AI assistants about community-specific node configurations?

## What I Want to Learn

### A. Best Practices from the Community
- How do people who successfully use AI assistants with n8n structure their projects?
- What documentation, templates, or tooling do they use to prevent misconfiguration?
- Are there n8n-specific prompt engineering techniques that improve node configuration accuracy?
- What validation strategies go beyond structural checks to catch semantic errors?

### B. Alternative Approaches
- **MCP servers**: Are there better MCP servers for n8n than the standard ones? Forks with improved validation, correct typeVersion handling, or schema enforcement?
- **Direct API**: Do some people skip MCP entirely and use the n8n REST API directly from AI assistants? Is that more reliable?
- **Code generation**: Are there tools that generate correct n8n workflow JSON from higher-level descriptions?
- **Hybrid approaches**: Do people use AI for design/planning but manual UI for actual node configuration? What is the optimal human-AI division of labor for n8n?

### C. Tooling and Infrastructure
- **Workflow linters**: Are there tools that lint n8n workflow JSON for common mistakes (wrong typeVersions, $json usage, missing parameters)?
- **Schema validation**: Can n8n's internal node schemas be extracted and used for pre-flight validation before sending configs to the API?
- **Checkpoint patterns**: Do people snapshot workflows before AI modifications? What rollback strategies exist?
- **Testing frameworks**: Are there ways to test n8n node configurations without executing the full workflow?

### D. Comparison of AI Assistants
- How does Claude Code compare to Cursor, Windsurf, or GitHub Copilot for n8n workflow building?
- Do other LLMs (GPT-4, Gemini) exhibit the same "training data overrides documentation" problem?
- Are there AI assistants specifically optimized for n8n or workflow automation platforms?

### E. n8n Platform Roadmap
- Is n8n improving API parity with the UI?
- Are there plans for official AI-assisted workflow building features?
- What is the status of the blank canvas bug (#23620)?
- Is there an official n8n SDK or library that handles resource locators, typeVersions, and other internal patterns correctly?

## Context About My Setup
- n8n cloud instance (v1.117+)
- Claude Code (Anthropic) as the AI assistant
- n8n-mcp server for API interaction
- Airtable as the data backend
- Workflows include: AI/langchain chains (chainLlm, lmChatOpenAi, outputParserStructured), Perplexity nodes, Firecrawl community nodes, Airtable CRUD, webhook triggers
- Custom skill with 14 verified node templates extracted from working production nodes
- Extensive CLAUDE.md documentation (450+ lines of n8n-specific rules) that the AI reads but does not consistently follow during JSON generation

Please search n8n community forums (community.n8n.io), GitHub (n8n-io/n8n), Reddit (r/n8n, r/ClaudeAI, r/cursor), YouTube, dev.to, Medium, and any other relevant sources. I am looking for practical solutions, not theoretical discussions. Prioritize recent content (2025-2026) as n8n's API and node versions change frequently.
```

---

## Appendix: File References

| File | Purpose |
|------|---------|
| `CLAUDE.md` (project root) | Project-level n8n rules, workflow documentation, changelog |
| `~/.claude/CLAUDE.md` | Global n8n platform knowledge, AI prompt architecture |
| `~/.claude/projects/.../memory/MEMORY.md` | Project memory with gotchas section |
| `~/.claude/skills/n8n-project-config/SKILL.md` | Custom skill with 14 verified node templates |
| `~/.claude/skills/n8n-project-config/references/json-schema.md` | JSON Schema strict mode reference |
| `~/.claude/skills/n8n-node-configuration/SKILL.md` | Generic node configuration guidance |
| `docs/enrichment-history.md` | Version history with specific failure incidents |
| `~/.claude/memory/MEMORY.md` | Global memory index with n8n skill references |

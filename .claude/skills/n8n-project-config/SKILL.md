---
name: n8n-project-config
description: "Exact JSON templates for configuring n8n nodes via MCP in the Artwork Archive project. MUST be used whenever adding or updating ANY n8n node via n8n_update_partial_workflow or n8n_create_workflow. Triggers on: n8n node configuration, addNode, updateNode, chainLlm, lmChatOpenAi, outputParserStructured, Airtable, Perplexity, Firecrawl, IF, SplitInBatches, Wait, webhook, Set node. ALWAYS run 'node scripts/validate-n8n-nodes.js' on operations JSON before any MCP write call. Use this skill BEFORE writing any node parameters — never freeform-generate n8n node configs."
---

# n8n Node Configuration Templates

These templates are extracted from **working production nodes** in the Artwork Archive n8n workflows. They are the single source of truth for node configuration via MCP.

## ⛔ STOP — Pre-Flight Validation Required

Before calling `n8n_update_partial_workflow` or `n8n_create_workflow` with ANY node operations:

1. **Outline your nodes first.** List every node you plan to add/update with: name, type, typeVersion, and key parameters. Present this to the user for approval BEFORE writing any MCP call.

2. **Run the validator.** Pipe your operations JSON through the validator script:
   ```bash
   echo '<your operations JSON array>' | node scripts/validate-n8n-nodes.js
   ```
   If it fails, fix ALL errors before proceeding. Do not skip this step.

3. **Clone, don't invent.** Every node parameter must come from either:
   - A template in this skill (below)
   - An existing working node in the workflow (`n8n_get_workflow`)
   - The `get_node` MCP tool for schema confirmation
   Never generate node parameters from your training data. Your training data is wrong for current n8n versions.

If you are tempted to skip these steps because "it's a simple change," that is exactly when misconfiguration happens. Run the validator anyway.

---

## Why This Skill Exists

When configuring n8n nodes, Claude generates parameters from training data instead of using verified configurations. Training data is often wrong or outdated — parameter names differ between node versions, defaults cause silent misconfiguration, and community nodes have undocumented property structures. This skill eliminates that failure mode by providing exact JSON templates.

---

## Mandatory Process

**Every time** you configure an n8n node via MCP (addNode or updateNode), follow these steps in order:

1. **Outline nodes first** — list name, type, typeVersion, and key parameters for each node. Get user approval.
2. **Look up the template** in this skill for the node type
3. **Call `get_node`** for the node type to confirm the current schema matches
4. **Copy the template exactly**, then fill in only the dynamic values (prompts, field names, expressions)
5. **Run the validator** — `echo '<ops JSON>' | node scripts/validate-n8n-nodes.js` — fix all errors
6. **Never invent parameter names** — if a parameter isn't in the template, it doesn't exist
7. **Validate after** with `n8n_validate_workflow` + `n8n_get_workflow(mode: "structure")` to verify connections

If a node type is not in this skill, find a working instance in an existing workflow (`n8n_get_workflow`) and extract its parameters before configuring.

---

## Credentials (Project-Specific)

```json
"airtable": {"airtableOAuth2Api": {"id": "HOvSYV0GVGpkzhdA", "name": "Airtable Personal Access Token account"}}
"openai":   {"openAiApi": {"id": "UFKlS8KRGWM7HW7J", "name": "OpenAi account"}}
"perplexity": {"perplexityApi": {"id": "926FpxPsyfxE10q7", "name": "Perplexity account"}}
"firecrawl": {"firecrawlApi": {"id": "Mv9l4N593kDPmnd0", "name": "Firecrawl account"}}
"gmail":    {"gmailOAuth2": {"id": "xh1ZWlUuCtrojk5F", "name": "Gmail account"}}
"activecampaign": {"activeCampaignApi": {"id": "6hku5zrCPrTu3XHc", "name": "ActiveCampaign Crewest Account"}}
```

---

## Node Templates

### 1. Basic LLM Chain (`chainLlm`) — typeVersion 1.9

The most error-prone node. The parameter name for the prompt is `text`, NOT `prompt`. The `promptType` must be `"define"` or it defaults to "Connected Chat Trigger Node" which expects `$json.chatInput`.

```json
{
  "type": "@n8n/n8n-nodes-langchain.chainLlm",
  "typeVersion": 1.9,
  "name": "Your Node Name",
  "position": [X, Y],
  "parameters": {
    "promptType": "define",
    "text": "=Your prompt here with {{ $('NodeName').item.json['field'] }} expressions",
    "hasOutputParser": true,
    "batching": {}
  }
}
```

**Critical rules:**
- `promptType` MUST be `"define"` — default `"auto"` expects a Chat Trigger
- Prompt content goes in `text`, NOT `prompt` (which is for v1.0-1.3 only)
- `hasOutputParser: true` — required if connecting an output parser sub-node
- `batching: {}` — required for v1.7+, even if empty
- If NOT using output parser: omit `hasOutputParser` or set to `false`
- If adding system messages, use `messages.messageValues` array (see references/messages.md)

### 2. OpenAI Chat Model (`lmChatOpenAi`) — typeVersion 1.3

Sub-node that connects to chainLlm, agent, or outputParserStructured via `ai_languageModel`.

```json
{
  "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
  "typeVersion": 1.3,
  "name": "Your Model Name",
  "position": [X, Y],
  "parameters": {
    "model": {
      "__rl": true,
      "value": "gpt-4.1",
      "mode": "list",
      "cachedResultName": "gpt-4.1"
    },
    "options": {
      "temperature": 0.1
    }
  },
  "credentials": {
    "openAiApi": {"id": "UFKlS8KRGWM7HW7J", "name": "OpenAi account"}
  }
}
```

**Critical rules:**
- `model` MUST be a resource locator object with `__rl: true` — plain strings cause "Could not get parameter" at runtime
- Common model values: `"gpt-4.1"`, `"gpt-4o"`, `"gpt-4o-mini"`, `"gpt-4.1-mini"`
- `cachedResultName` should match `value`
- Do NOT include `notice` parameter — it's UI-only and causes issues via API
- For JSON Schema strict mode, add `options.textFormat` (see references/json-schema.md)

### 3. Structured Output Parser (`outputParserStructured`) — typeVersion 1.3

Sub-node that connects to chainLlm via `ai_outputParser`.

```json
{
  "type": "@n8n/n8n-nodes-langchain.outputParserStructured",
  "typeVersion": 1.3,
  "name": "Your Parser Name",
  "position": [X, Y],
  "parameters": {
    "schemaType": "manual",
    "inputSchema": "{\"type\":\"object\",\"properties\":{...},\"required\":[...],\"additionalProperties\":false}",
    "autoFix": true
  }
}
```

**Critical rules:**
- `inputSchema` is a JSON string (stringified), not a JSON object
- Always include `"additionalProperties": false` in the schema
- `autoFix: true` enables automatic retry on parse failure
- The parser needs its own LLM sub-node connected via `ai_languageModel`

### 4. Perplexity (`perplexity`) — typeVersion 1

Uses a `messages` array with role-based entries, NOT a simple `prompt` string.

```json
{
  "type": "n8n-nodes-base.perplexity",
  "typeVersion": 1,
  "name": "Your Search Name",
  "position": [X, Y],
  "parameters": {
    "model": "sonar-deep-research",
    "messages": {
      "message": [
        {
          "role": "system",
          "content": "=Your system prompt"
        },
        {
          "content": "=Your user prompt with {{ $('NodeName').item.json['field'] }} expressions"
        }
      ]
    },
    "simplify": true,
    "options": {
      "maxTokens": 4500
    }
  },
  "credentials": {
    "perplexityApi": {"id": "926FpxPsyfxE10q7", "name": "Perplexity account"}
  }
}
```

**Critical rules:**
- Prompt goes in `messages.message[]` array, NOT a `prompt` parameter
- System message has `"role": "system"` — user message omits role
- Always use `"simplify": true` for cleaner output
- Model options: `"sonar-deep-research"` (required for quality), `"sonar-pro"`, `"sonar-reasoning-pro"`

### 5. Airtable — typeVersion 2.1

#### Search operation
```json
{
  "type": "n8n-nodes-base.airtable",
  "typeVersion": 2.1,
  "name": "Find Records",
  "position": [X, Y],
  "parameters": {
    "authentication": "airtableOAuth2Api",
    "operation": "search",
    "base": {
      "__rl": true, "value": "appDFU2JdAw2Ckax4", "mode": "list",
      "cachedResultName": "AA Rolling Submissions",
      "cachedResultUrl": "https://airtable.com/appDFU2JdAw2Ckax4"
    },
    "table": {
      "__rl": true, "value": "TABLE_ID", "mode": "list",
      "cachedResultName": "TABLE_NAME",
      "cachedResultUrl": "https://airtable.com/appDFU2JdAw2Ckax4/TABLE_ID"
    },
    "filterByFormula": "{Status} = \"Pending - Enriched\"",
    "options": {
      "fields": ["Field1", "Field2"]
    }
  },
  "credentials": {
    "airtableOAuth2Api": {"id": "HOvSYV0GVGpkzhdA", "name": "Airtable Personal Access Token account"}
  }
}
```

#### Update operation
```json
{
  "type": "n8n-nodes-base.airtable",
  "typeVersion": 2.1,
  "name": "Update Record",
  "position": [X, Y],
  "parameters": {
    "authentication": "airtableOAuth2Api",
    "operation": "update",
    "base": {
      "__rl": true, "value": "appDFU2JdAw2Ckax4", "mode": "list",
      "cachedResultName": "AA Rolling Submissions",
      "cachedResultUrl": "https://airtable.com/appDFU2JdAw2Ckax4"
    },
    "table": {
      "__rl": true, "value": "TABLE_ID", "mode": "list",
      "cachedResultName": "TABLE_NAME",
      "cachedResultUrl": "https://airtable.com/appDFU2JdAw2Ckax4/TABLE_ID"
    },
    "columns": {
      "mappingMode": "defineBelow",
      "value": {
        "id": "={{ $('SourceNode').item.json.id }}",
        "FieldName": "={{ $('SourceNode').item.json['field'] }}"
      },
      "matchingColumns": ["id"],
      "schema": []
    },
    "options": {}
  },
  "credentials": {
    "airtableOAuth2Api": {"id": "HOvSYV0GVGpkzhdA", "name": "Airtable Personal Access Token account"}
  }
}
```

**Critical rules:**
- `base` and `table` MUST be resource locator objects with `__rl: true`
- Update uses `columns` with `mappingMode: "defineBelow"`, NOT `fields.values[]`
- Always include `matchingColumns: ["id"]` for updates
- Table IDs: Artists=`tblZZS5EeWmxmyCTB`, Artworks=`tblh3npWVZgkWSILm`, Campaigns=`tblr0oR74rtvR6LN2`, Pipeline Actions=`tblPLE3Kt16Blqsjr`, Pipeline Runs=`tblhF8aI7tf2wPWyo`, Partner Orgs=`tbl0GhG4KxfuYDKaE`

### 6. IF — typeVersion 2.3
```json
{
  "type": "n8n-nodes-base.if",
  "typeVersion": 2.3,
  "name": "Check Condition",
  "position": [X, Y],
  "parameters": {
    "conditions": {
      "options": {
        "version": 3,
        "leftValue": "",
        "caseSensitive": true,
        "typeValidation": "strict"
      },
      "conditions": [
        {
          "id": "unique-id",
          "leftValue": "={{ $('NodeName').item.json['field'] }}",
          "rightValue": "",
          "operator": {
            "type": "string",
            "operation": "isNotEmpty",
            "singleValue": true
          }
        }
      ],
      "combinator": "and"
    },
    "options": {}
  }
}
```

### 7. SplitInBatches — typeVersion 3
```json
{
  "type": "n8n-nodes-base.splitInBatches",
  "typeVersion": 3,
  "name": "Loop Over Items",
  "position": [X, Y],
  "parameters": {
    "options": {}
  }
}
```
Default batch size is 1. `options: {}` is required.

### 8. Wait — typeVersion 1.1
```json
{
  "type": "n8n-nodes-base.wait",
  "typeVersion": 1.1,
  "name": "Rate Limit Delay",
  "position": [X, Y],
  "parameters": {
    "amount": 30
  }
}
```
Default unit is seconds. Only `amount` is needed.

### 9. Firecrawl (`@mendable/n8n-nodes-firecrawl.firecrawl`)

Community node — use this instead of HTTP Request for Firecrawl operations. Extracted from a working production workflow.

#### Scrape with link extraction only (for Social Profile Discovery)
```json
{
  "type": "@mendable/n8n-nodes-firecrawl.firecrawl",
  "typeVersion": 1,
  "name": "Firecrawl Scrape Links",
  "position": [X, Y],
  "parameters": {
    "operation": "scrape",
    "url": "={{ $('NodeName').item.json['Website'] }}",
    "scrapeOptions": {
      "options": {
        "formats": {
          "format": [
            {
              "type": "links"
            }
          ]
        },
        "waitFor": 3000,
        "timeout": 60000
      }
    },
    "requestOptions": {}
  },
  "credentials": {
    "firecrawlApi": {"id": "Mv9l4N593kDPmnd0", "name": "Firecrawl account"}
  }
}
```

#### Scrape with markdown + links (content analysis — verified working config)
This is the exact format from the working reference workflow `o6oYKsfttQnm4n7t`:
```json
{
  "type": "@mendable/n8n-nodes-firecrawl.firecrawl",
  "typeVersion": 1,
  "name": "Firecrawl Scrape",
  "position": [X, Y],
  "parameters": {
    "operation": "scrape",
    "url": "={{ $('NodeName').item.json['website_url'] }}",
    "scrapeOptions": {
      "options": {
        "formats": {
          "format": [
            {},
            {"type": "links"}
          ]
        },
        "onlyMainContent": true,
        "headers": {},
        "waitFor": 3000,
        "timeout": 60000
      }
    },
    "requestOptions": {}
  },
  "credentials": {
    "firecrawlApi": {"id": "Mv9l4N593kDPmnd0", "name": "Firecrawl account"}
  }
}
```

#### Scrape with structured JSON extraction (advanced — for content parsing)
```json
{
  "type": "@mendable/n8n-nodes-firecrawl.firecrawl",
  "typeVersion": 1,
  "name": "Firecrawl Scrape",
  "position": [X, Y],
  "parameters": {
    "operation": "scrape",
    "url": "={{ $('NodeName').item.json['url'] }}",
    "scrapeOptions": {
      "options": {
        "formats": {
          "format": [
            {
              "type": "json",
              "prompt": "Your extraction instructions here",
              "schema": "{\"type\":\"object\",\"properties\":{...},\"required\":[]}"
            }
          ]
        },
        "headers": {},
        "timeout": 360000
      }
    },
    "requestOptions": {}
  },
  "credentials": {
    "firecrawlApi": {"id": "Mv9l4N593kDPmnd0", "name": "Firecrawl account"}
  }
}
```

**Critical rules:**
- Default resource is `"Scraping"` — no need to specify it for scrape operations
- `url` is a direct parameter, not nested
- Formats go in `scrapeOptions.options.formats.format[]` array
- Format types: `"links"`, `"markdown"`, `"html"`, `"json"` (json requires `prompt` + `schema`)
- **Markdown default format:** The UI saves the default markdown format as `{}` (empty object), NOT `{"type": "markdown"}`. Both work, but use `{}` to match what the UI produces.
- **`waitFor: 3000` is REQUIRED** — without it, Firecrawl returns 500 errors on many sites. This waits 3 seconds for JS rendering before scraping. Always include it.
- **`onlyMainContent: true`** strips navbars/footers/sidebars. This is the DEFAULT (n8n omits it from API responses when `true`), but always include it explicitly in templates for clarity. The UI shows the toggle as ON.
- Always include `requestOptions: {}`
- The node handles Firecrawl API auth internally — do NOT use HTTP Request for Firecrawl

### 10. Set (Edit Fields) — typeVersion 3.4

⚠️ **CRITICAL: The Set node v3.4 parameter format changed.** The old `fields.values[{name, stringValue}]` format is accepted by the API but renders as empty in the n8n UI. You MUST use the `assignments.assignments[]` format below — this is the only format that both saves correctly AND renders in the UI.

```json
{
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "name": "Edit Fields",
  "position": [X, Y],
  "parameters": {
    "assignments": {
      "assignments": [
        {
          "id": "unique-uuid-here",
          "name": "field_name",
          "value": "={{ $('NodeName').item.json['field'] }}",
          "type": "string"
        }
      ]
    },
    "options": {}
  }
}
```

**Critical rules:**
- Use `assignments.assignments[]` — NOT `fields.values[]` (old format renders empty in UI)
- Each assignment needs: `id` (UUID), `name` (field name), `value` (the value or expression), `type` (`"string"`, `"number"`, `"boolean"`, `"array"`, `"object"`)
- Generate a unique UUID for each assignment's `id` field
- Do NOT include `mode`, `includeOtherFields`, or `includeBinary` — these are old parameters
- `options: {}` is required (even if empty)
- To set a static value: `"value": "https://example.com"`
- To set an expression: `"value": "={{ $('NodeName').item.json['field'] }}"`

**Example — multiple fields:**
```json
{
  "parameters": {
    "assignments": {
      "assignments": [
        {
          "id": "abc-123",
          "name": "website_url",
          "value": "https://example.com",
          "type": "string"
        },
        {
          "id": "def-456",
          "name": "artist_name",
          "value": "={{ $('Find Artists').item.json['Full Name'] }}",
          "type": "string"
        }
      ]
    },
    "options": {}
  }
}
```

### 11. Webhook — typeVersion 2.1

**DO NOT create webhook nodes via MCP.** Have the user create them in the n8n UI. The UI generates `webhookId` and registers the webhook path — the API does not. MCP-created webhooks don't respond to requests until manually saved in the UI.

### 12. Gmail — typeVersion 2.2
```json
{
  "type": "n8n-nodes-base.gmail",
  "typeVersion": 2.2,
  "name": "Send Email",
  "position": [X, Y],
  "parameters": {
    "sendTo": "={{ $('NodeName').item.json['email_field'] }}",
    "subject": "={{ $('NodeName').item.json['subject_field'] }}",
    "message": "={{ $('NodeName').item.json['body_field'] }}",
    "options": {}
  },
  "credentials": {
    "gmailOAuth2": {"id": "xh1ZWlUuCtrojk5F", "name": "Gmail account"}
  }
}
```

### 13. ActiveCampaign — typeVersion 1

Uses `resource` to switch between contact, contactList, tag, contactTag operations.

```json
// Create/update contact
{"resource": "contact", "email": "=...", "updateIfExists": true, "additionalFields": {"firstName": "=...", "lastName": "=..."}}

// Add contact to list
{"resource": "contactList", "listId": "=...", "contactId": "=..."}

// Get all tags
{"resource": "tag", "operation": "getAll", "returnAll": true}

// Create tag
{"resource": "tag", "name": "=...", "additionalFields": {}}

// Add tag to contact
{"resource": "contactTag", "tagId": "=...", "contactId": "=..."}
```
Credential: `{"activeCampaignApi": {"id": "6hku5zrCPrTu3XHc", "name": "ActiveCampaign Crewest Account"}}`

### 14. Aggregate — typeVersion 1
```json
{
  "type": "n8n-nodes-base.aggregate",
  "typeVersion": 1,
  "name": "Aggregate IDs",
  "position": [X, Y],
  "parameters": {
    "fieldsToAggregate": {
      "fieldToAggregate": [
        {
          "fieldToAggregate": "id",
          "renameField": true,
          "outputFieldName": "collected_ids"
        }
      ]
    },
    "options": {}
  }
}
```

---

## Connection Patterns

### AI Sub-Node Connections
```json
{"type": "addConnection", "source": "LLM Node Name", "target": "Chain Node Name", "sourceOutput": "ai_languageModel"}
{"type": "addConnection", "source": "Parser Node Name", "target": "Chain Node Name", "sourceOutput": "ai_outputParser"}
{"type": "addConnection", "source": "Parser LLM Name", "target": "Parser Node Name", "sourceOutput": "ai_languageModel"}
```

### IF Node Branches
```json
{"type": "addConnection", "source": "IF Node", "target": "True Target", "sourceIndex": 0}
{"type": "addConnection", "source": "IF Node", "target": "False Target", "sourceIndex": 1}
```

### SplitInBatches
```json
{"type": "addConnection", "source": "Loop Node", "target": "Done Target", "sourceIndex": 0}
{"type": "addConnection", "source": "Loop Node", "target": "Loop Body Target", "sourceIndex": 1}
```

---

## Expression Rules

- **NEVER** use `$json` or `$json['field']` in expression fields — always `$('NodeName').item.json['field']`
- **NEVER** use template literals (backtick strings with `${}`) — use string concatenation
- **NEVER** use optional chaining (`?.`) — use `(obj || {})['field']`
- `$json` is ONLY acceptable inside Code node JavaScript, never in Set/Edit Fields/Airtable expressions

---

## TypeVersion Reference

Always use these versions. If the MCP defaults to a different version, override it.

| Node Type | typeVersion |
|-----------|------------|
| webhook | 2.1 |
| airtable | 2.1 |
| if | 2.3 |
| splitInBatches | 3 |
| wait | 1.1 |
| noOp | 1 |
| httpRequest | 4.2 |
| perplexity | 1 |
| chainLlm | 1.9 |
| lmChatOpenAi | 1.3 |
| outputParserStructured | 1.3 |
| agent | 3.1 |
| code | 2 |
| set | 3.4 |
| stickyNote | 1 |
| Firecrawl | 1 |
| gmail | 2.2 |
| activeCampaign | 1 |
| aggregate | 1 |

---

## Post-Creation Checklist

After EVERY `n8n_update_partial_workflow` or `n8n_create_workflow` call, verify:

- [ ] `n8n_validate_workflow(id: "...")` — no errors
- [ ] `n8n_get_workflow(mode: "structure")` — all connections exist
- [ ] For every `lmChatOpenAi` node: `model` is resource locator object (`__rl: true`), not plain string
- [ ] For every `chainLlm` node: uses `promptType: "define"` + `text`, NOT `prompt`
- [ ] For every Airtable update node: uses `columns`, NOT `fields.values[]`
- [ ] No `$json[` in any expression field (only `$('NodeName').item.json[...]`)

---

## REMINDER: You Are a Refactoring Agent, Not a Generator

Your job is to ASSEMBLE verified configurations from the templates above and from existing working nodes. You do NOT GENERATE new node parameter structures from training data. Every parameter you write must trace back to a template in this skill or an existing working node fetched via `n8n_get_workflow`. If you cannot trace it, you are guessing — and guessing causes runtime failures that waste the user's time and API credits.

**Before every MCP write call, run:** `echo '<ops>' | node scripts/validate-n8n-nodes.js`

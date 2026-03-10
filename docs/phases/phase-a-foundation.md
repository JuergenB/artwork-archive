# Phase A: Foundation — Intake & Enrichment Pipeline

> **Status:** Complete
> **Last Updated:** 2026-03-09

---

## Scope

Build the core submission pipeline: accept artist submissions from Paperform, store in Airtable, enrich with AI research and image classification.

---

## Delivered Components

### Workflow 1: Intake V1.0 (`QtP1J9Fwr5SPRG0u`) — Active

Handles Paperform submissions end-to-end:

1. **Webhook trigger** receives form submission data
2. **Normalize fields** (Code node) — handles varying Paperform field formats
3. **Campaign upsert** — search/create Campaign record in Airtable
4. **Artist upsert** — search/create Artist record in Airtable
5. **Artwork detection** (Code node) — parses up to 5 artworks from single submission
6. **Artwork loop** — upsert each artwork individually in Airtable
7. **Import Log** — aggregate success IDs, write log record
8. **Notifications** — AI Email Beautifier (GPT-4o) → Gmail to campaign admins
9. **CRM sync** — ActiveCampaign contact create/update, list assignment, tag resolution

**Integrations:** Airtable, Gmail, ActiveCampaign, OpenAI

### Workflow 2: Enrichment V0.6 (`3c8WbVLT83fwnF2CaKIRz`) — Active

Processes artists and artworks with status `Pending - Imported`:

**Part A — Artist Enrichment:**
1. Find pending artists in Airtable
2. SplitInBatches loop (rate limit protection)
3. **Artist Profile Researcher** — Perplexity `sonar-deep-research` with XML-structured prompt
4. **Validate Citations** — Code node filters hallucinated URLs by artist name/website relevance
5. **Artist Profile Formatter** — GPT-4.1 Agent (temp 0.2, JSON Schema strict mode)
6. **Structured Output Parser** — GPT-4.1 (temp 0.3)
7. Update Artist record → status `Pending - Enriched`
8. Rate Limit Delay (30s between artists)

**Part B — Artwork Enrichment:**
1. Find artworks linked to enriched artist
2. SplitInBatches loop
3. **Artwork Image Classifier** — GPT-4o Vision Agent (temp 0.3)
4. **Artwork Output Parser** — GPT-4.1-mini
5. Update Artwork record → status `Pending - Enriched`

### Workflow 3: Error Handler V1.0 (`iAGcwyumKEOc83kj`) — Inactive

Error trigger → lookup campaign admins → Gmail notification. Not yet activated.

### Documentation & Infrastructure
- `docs/knowledge/airtable-schema.md` — complete schema for all 5 tables with field IDs, types, relationships
- `docs/knowledge/AA Rolling Submissions Design.md` — original system design document
- `docs/knowledge/artwork archive formats/` — AA-Artist-Template.xlsx (40 cols), AA-Artworks-Template.xlsx (68 cols)
- `.env` — Airtable PAT and Base ID for local API access
- `.gitignore` — protects secrets

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| Enrichment V0.4 | 2026-03-09 | Added SplitInBatches + Rate Limit Delay for Perplexity 429s |
| Enrichment V0.5 | 2026-03-09 | JSON Schema strict mode, prompt restructuring, error handling, artwork batch loop. Accidentally switched to `sonar-pro` — caused hallucinations. |
| Enrichment V0.6 | 2026-03-09 | Reverted to `sonar-deep-research`, added citation validation, cleaned up Perplexity prompt, increased delays. Cleared all hallucinated data from Airtable. |

---

## Known Issues

- "Find Related Artworks" node has pre-existing template literal error (`${}` vs `{{ }}`)
- Error Handler workflow is inactive — needs activation and testing
- Paperform image URLs have expiring signatures — thumbnails in Airtable attachments are the persistent copies

---

## Airtable Status Flow

```
Paperform → Intake V1.0 → "Pending - Imported"
                                ↓
                     Enrichment V0.6 → "Pending - Enriched"
                                            ↓
                              (Phase C) Export → "Exported"
```

Error states: `Needs Review`, `On Hold`, `Error - Data`, `Error - Automation`

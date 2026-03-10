# Artwork Archive — Rolling Submissions System

Automated artwork submission intake and AI enrichment pipeline for [Not Real Art](https://notrealart.com) and [Arterial](https://arterial.org) (501c3). Built entirely on **n8n workflow automation + Airtable** — no application code.

## What It Does

Artists submit work through online forms. This system automatically:

1. **Ingests** submissions into a structured Airtable database (artists, artworks, campaigns)
2. **Enriches** artist profiles using AI-powered web research, citation validation, and profile generation
3. **Classifies** artwork images using computer vision (medium, subject matter, tags)
4. **Notifies** campaign administrators via styled HTML emails
5. **Syncs** contacts to ActiveCampaign CRM with list/tag management

## Architecture

```
Paperform (online form)
    │
    ▼
┌─────────────────────────────────────────────────┐
│  n8n Cloud — Intake V1.0                        │
│  Webhook → Normalize → Upsert Campaign/Artist/  │
│  Artworks → Email Notification → CRM Sync       │
└─────────────────────┬───────────────────────────┘
                      │ Status: "Pending - Imported"
                      ▼
┌─────────────────────────────────────────────────┐
│  n8n Cloud — Enrichment V0.7                    │
│                                                 │
│  Part A: Artist Enrichment                      │
│  Pre-Process → Perplexity Research →            │
│  AI Citation Validation → GPT-4.1 Formatter →   │
│  Airtable Update                                │
│                                                 │
│  Part B: Artwork Enrichment                     │
│  GPT-4o Vision Classifier → Airtable Update     │
└─────────────────────┬───────────────────────────┘
                      │ Status: "Pending - Enriched"
                      ▼
               (Human Review)
                      │
                      ▼
          Phase C: Export to Artwork Archive (planned)
```

**Infrastructure:**
- **Workflows:** [n8n Cloud](https://n8n.io) (3 workflows)
- **Database:** [Airtable](https://airtable.com) (5 tables: Artists, Artworks, Campaigns, Import Logs, Export Logs)
- **Forms:** [Paperform](https://paperform.co) (webhook integration)
- **CRM:** [ActiveCampaign](https://www.activecampaign.com)
- **Email:** Gmail (OAuth2)

## AI Models

| Step | Model | Purpose |
|------|-------|---------|
| Artist Research | Perplexity `sonar-deep-research` | Web research with citations |
| Citation Validation | GPT-4o-mini | Verify citations match the correct artist |
| Profile Formatting | GPT-4.1 (JSON Schema strict mode) | Generate structured artist profiles |
| Artwork Classification | GPT-4o Vision | Detect medium, subject matter, tags from images |
| Email Generation | GPT-4o | Format admin notification emails |

## Enrichment Pipeline Detail

The enrichment workflow includes several techniques to ensure research accuracy:

- **Identity Anchors** — Extracts email domain, website domain, and location from submission data to disambiguate common artist names during research
- **Gibberish Detection** — Flags lorem ipsum and placeholder text in bio/artist statement fields, adjusting research prompts accordingly
- **Data Quality Scoring** — Rates submission completeness (0-10) to calibrate research depth
- **AI Citation Validation** — Each Perplexity citation URL is evaluated against the artist's identity context; wrong-person links, people-search sites, and unrelated domains are filtered out
- **Rate Limiting** — Sequential processing with configurable delays to respect API quotas

## Workflows

| # | Name | Status | Purpose |
|---|------|--------|---------|
| 1 | Intake V1.0 | Active | Form submission → Airtable + email + CRM |
| 2 | Enrichment V0.7 | Active | AI research, citation validation, image classification |
| 3 | Error Handler V1.0 | Inactive | Error notifications to campaign admins |

## Project Phases

| Phase | Status | Scope |
|-------|--------|-------|
| **A: Foundation** | Complete | Intake pipeline, enrichment pipeline, Airtable schema, documentation |
| **B: Operations Hub** | Planned | Admin panel, trigger buttons, progress monitoring, error dashboard |
| **C: Export Pipeline** | Planned (blocked) | Airtable to Artwork Archive CSV export — requires field mapping discussion |
| **D: Future Improvements** | Backlog | Slack integration, analytics, model evaluation, tech debt |

See `docs/phases/` for detailed specs on each phase.

## Repository Structure

```
artwork-archive/
├── CLAUDE.md                          # AI assistant project context & session rules
├── README.md                          # This file
├── .env                               # Airtable credentials (git-ignored)
├── .gitignore
├── docs/
│   ├── knowledge/
│   │   ├── airtable-schema.md         # Complete Airtable schema (5 tables, 100+ fields)
│   │   ├── AA Rolling Submissions Design.md  # System design document
│   │   └── artwork archive formats/   # AA import templates (.xlsx)
│   ├── phases/
│   │   ├── phase-a-foundation.md      # Complete
│   │   ├── phase-b-operations-hub.md  # Planned
│   │   ├── phase-c-export-pipeline.md # Planned
│   │   └── phase-d-future-improvements.md  # Backlog
│   ├── design/                        # Architecture diagrams (future)
│   └── prompts/                       # AI prompt library (future)
├── scripts/                           # Helper scripts (future)
└── workflows/                         # n8n workflow JSON backups (date-coded)
    ├── intake-v1.0_2026-03-09.json
    ├── enrichment-v0.7_2026-03-09.json
    └── error-handler-v1.0_2026-03-09.json
```

## Workflow Backups

The `workflows/` directory contains date-coded JSON exports of all n8n workflows. These serve as version-controlled backups since the n8n cloud plan has limited version history (1 day).

**Naming convention:** `{workflow-name}-v{version}_{YYYY-MM-DD}.json`

Backups are taken at milestone boundaries — before and after deploying significant workflow changes.

## Prerequisites

- **n8n Cloud** instance with API access
- **Airtable** base with the schema documented in `docs/knowledge/airtable-schema.md`
- **API credentials** for: OpenAI, Perplexity, Gmail (OAuth2), ActiveCampaign, Airtable (OAuth2)
- **Paperform** (or equivalent) configured to POST submissions to the Intake webhook

## Development

This is a no-code project — all logic lives in n8n workflow nodes. Development is done through:

1. **n8n Cloud UI** — visual workflow editor at the n8n instance
2. **n8n MCP** — programmatic workflow management via Claude Code (see `CLAUDE.md` for session rules)
3. **Airtable** — schema and data management

There is no build step, no local server, and no compiled code.

## License

Private project. All rights reserved.

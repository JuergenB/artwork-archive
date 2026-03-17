# Artwork Archive — Rolling Submissions System

An automated artwork submission and AI enrichment pipeline for [Not Real Art](https://notrealart.com) and [Arterial](https://arterial.org) (501c3).

## Why This Exists

Running open-call art exhibitions means processing hundreds of submissions — artist profiles, artwork images, bios, social media links — and turning that raw data into curated, archive-ready records. Doing this manually is slow, error-prone, and doesn't scale.

This system automates the entire journey from submission to enriched archive record:

- **Artists submit** through online forms embedded on exhibition websites
- **AI researches** each artist — finding verified web presence, exhibitions, and press coverage
- **Computer vision classifies** each artwork — detecting medium, subject matter, and visual tags
- **Exhibition relevance** is assessed — connecting each artwork to the exhibition's curatorial theme
- **Campaign admins are notified** with branded HTML emails summarizing each submission
- **CRM contacts are synced** to ActiveCampaign for marketing and communication workflows

The result: every submission arrives in Airtable fully enriched and ready for human curatorial review, with AI-generated profiles, validated citations, and classified artwork images.

## What's Next: Partner Organizations

We're expanding to support **partnership exhibitions** — collaborations with galleries, arts programs, and organizations that bring curated groups of artists into Not Real Art exhibitions. A new partner onboarding system will capture organization profiles, curator details, and exhibition preferences, with automatic attribution in Artwork Archive exports. See [Epic #64](https://github.com/JuergenB/artwork-archive/issues/64) for details.

## Architecture

Built entirely on **n8n workflow automation + Airtable** — no application code, no servers to maintain.

```
Paperform (online submission form)
    |
    v
+--------------------------------------------------+
|  n8n Cloud -- Intake V1.6                        |
|  Webhook --> Normalize --> Upsert Campaign/       |
|  Artist/Artworks --> Email Notification -->        |
|  ActiveCampaign CRM Sync                          |
+-------------------------+------------------------+
                          | Status: "Pending - Imported"
                          v
+--------------------------------------------------+
|  n8n Cloud -- Enrichment V0.10                   |
|                                                  |
|  Part A: Artist Enrichment                       |
|  Pre-Process --> Perplexity Deep Research -->     |
|  AI Citation Validation --> Bio Quality Check --> |
|  GPT-4.1 Profile Formatter --> Airtable Update   |
|                                                  |
|  Part B: Artwork Enrichment                      |
|  Fetch Image --> GPT-4o Vision Classifier -->    |
|  Relevance Hypothesis --> Dimension Extractor --> |
|  Airtable Update                                 |
|                                                  |
|  Pipeline Tracking: progress, ETA, status        |
+-------------------------+------------------------+
                          | Status: "Pending - Enriched"
                          v
+--------------------------------------------------+
|  n8n Cloud -- Social Profile Discovery V1.0      |
|  (Control Panel action — on demand)              |
|                                                  |
|  Firecrawl Website Scrape --> Perplexity Deep    |
|  Research --> GPT-4.1 Validate & Merge -->        |
|  Airtable: Social Profiles (AI)                  |
+-------------------------+------------------------+
                          |
                          v
                   (Human Review)
                          |
                          v
            Phase C: Export to Artwork Archive (planned)
```

**Infrastructure:**
- **Workflows:** [n8n Cloud](https://n8n.io) (4 workflows)
- **Database:** [Airtable](https://airtable.com) (7 tables: Artists, Artworks, Campaigns, Pipeline Actions, Pipeline Runs, Import Log, Partner Organizations)
- **Forms:** [Paperform](https://paperform.co) (webhook integration)
- **Web Scraping:** [Firecrawl](https://firecrawl.dev) (social link extraction from artist websites)
- **CRM:** [ActiveCampaign](https://www.activecampaign.com)
- **Email:** Gmail (OAuth2)

## Workflows

| # | Name | Version | Status | Purpose |
|---|------|---------|--------|---------|
| 1 | Intake | V1.6 | Active | Form submission to Airtable + email + CRM |
| 2 | Enrichment | V0.10 | Active | AI research, citation validation, image classification, relevance hypothesis, dimension extraction |
| 3 | Social Profile Discovery | V1.0 | Active | Find social media profiles for enriched artists via Firecrawl + Perplexity |
| 4 | Error Handler | V1.0 | Inactive | Error notifications to campaign admins |

## AI Models

| Step | Model | Purpose |
|------|-------|---------|
| Artist Research | Perplexity `sonar-deep-research` | Web research with citations |
| Citation Validation | GPT-4o-mini | Verify citations match the correct artist |
| Bio Quality Evaluation | GPT-4o-mini | Flag profiles needing human review |
| Profile Formatting | GPT-4.1 (JSON Schema strict mode) | Generate structured artist profiles |
| Artwork Classification | GPT-4o Vision | Detect medium, subject matter, tags from images |
| Relevance Hypothesis | GPT-4o-mini | Hypothesize artwork connection to exhibition theme |
| Dimension Extraction | GPT-4o-mini | Extract height, width, depth, unit from description text |
| Email Generation | GPT-4o | Format branded admin notification emails |
| Output Parsing | GPT-4.1 / GPT-4.1-mini | Structured JSON extraction (safety nets) |
| Social Profile Search | Perplexity `sonar-deep-research` | Find social media profiles across the web |
| Social Profile Validation | GPT-4.1 | Validate, merge, and structure discovered profiles |

## Enrichment Quality Controls

The enrichment pipeline includes several techniques to ensure research accuracy:

- **Identity Anchors** — Extracts email domain, website domain, and location from submission data to disambiguate common artist names during research
- **Gibberish Detection** — Flags lorem ipsum and placeholder text in bio/artist statement fields, adjusting research prompts accordingly
- **Data Quality Scoring** — Rates submission completeness (0-10) to calibrate research depth
- **AI Citation Validation** — Each Perplexity citation URL is evaluated against the artist's identity context; wrong-person links, people-search sites, and unrelated domains are filtered out
- **Bio Quality Evaluation** — AI-scored check that flags incoherent or incomplete profiles for human review before they reach the archive
- **Vision Binary Delivery** — Artwork images are downloaded as binary data before classification, ensuring the vision model actually sees the image rather than just the URL
- **Anti-Hallucination Prompting** — Image-first prompt architecture sends the image before any metadata, preventing the model from describing artwork based on titles alone
- **Rate Limiting** — Sequential processing with configurable delays to respect API quotas

## Project Phases

| Phase | Status | Scope |
|-------|--------|-------|
| **A: Foundation** | Complete | Intake pipeline, enrichment pipeline, Airtable schema, documentation |
| **B: Operations Hub** | Complete | Pipeline Actions + Pipeline Runs tables, progress tracking, admin dashboard |
| **C: Export Pipeline** | Planned | Airtable to Artwork Archive CSV export — requires field mapping discussion |
| **D: Future Improvements** | Backlog | Slack integration, analytics, model evaluation, tech debt |
| **E: Partner Organizations** | Planned | Partner org onboarding, curator tracking, submission linking, export attribution |

See `docs/phases/` for detailed specs on each phase.

## Repository Structure

```
artwork-archive/
├── CLAUDE.md                          # AI assistant project context & session rules
├── README.md                          # This file
├── .env                               # Airtable credentials (git-ignored)
├── .gitignore
├── docs/
│   ├── MEMORY.md                      # Project memory (persists across AI sessions)
│   ├── enrichment-history.md          # Enrichment pipeline version history
│   ├── knowledge/
│   │   ├── airtable-schema.md         # Complete Airtable schema
│   │   ├── AA Rolling Submissions Design.md  # System design document
│   │   └── artwork archive formats/   # AA import templates (.xlsx)
│   ├── phases/
│   │   ├── phase-a-foundation.md      # Complete
│   │   ├── phase-b-operations-hub.md  # Complete
│   │   ├── phase-c-export-pipeline.md # Planned
│   │   └── phase-d-future-improvements.md  # Backlog
│   ├── design/                        # Architecture diagrams (future)
│   └── prompts/                       # AI prompt library (future)
├── scripts/                           # Helper scripts (future)
└── workflows/                         # n8n workflow JSON backups (date-coded)
```

## Workflow Backups

The `workflows/` directory contains date-coded JSON exports of n8n workflows, serving as version-controlled backups.

**Naming convention:** `{workflow-name}-v{version}_{YYYY-MM-DD}.json`

## Prerequisites

- **n8n Cloud** instance with API access
- **Airtable** base with the schema documented in `docs/knowledge/airtable-schema.md`
- **API credentials** for: OpenAI, Perplexity, Gmail (OAuth2), ActiveCampaign, Airtable (OAuth2)
- **Paperform** (or equivalent) configured to POST submissions to the Intake webhook

## Development

This is a no-code project — all logic lives in n8n workflow nodes. Development is done through:

1. **n8n Cloud UI** — visual workflow editor
2. **n8n MCP** — programmatic workflow management via Claude Code (see `CLAUDE.md` for session rules)
3. **Airtable** — schema and data management

There is no build step, no local server, and no compiled code.

## License

Private project. All rights reserved.

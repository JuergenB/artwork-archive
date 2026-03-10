# Phase D: Future Improvements & Technical Debt

> **Status:** Backlog
> **Last Updated:** 2026-03-09

---

## Overview

Items that are not urgent but should be addressed as the system matures. These are tracked here so they don't get lost across sessions.

---

## Technical Debt

### 1. Fix "Find Related Artworks" Template Literal Error

**Priority:** Medium
**Workflow:** Enrichment V0.6 (`3c8WbVLT83fwnF2CaKIRz`)

The "Find Related Artworks" node uses JavaScript template literal syntax (`${}`) instead of n8n expression syntax (`{{ }}`). This is a pre-existing error that predates all V0.4-V0.6 changes. It may cause the artwork enrichment step to fail silently or process incorrect records.

**Fix:** Update the expression to use `{{ }}` n8n syntax.

### 2. Activate Error Handler Workflow

**Priority:** Medium
**Workflow:** Error Handler V1.0 (`iAGcwyumKEOc83kj`)

Currently inactive. When activated, it will catch errors from Intake and Enrichment workflows, look up campaign admin contacts, and send Gmail notifications. Needs testing before activation.

### 3. Paperform Image URL Expiration

**Priority:** Low

Paperform upload URLs include expiring signatures. The Intake workflow copies images to Airtable attachment fields (which are persistent), but the `Contact Image URL` and `Piece Image URLs` text fields still contain the original expiring URLs. These will eventually 404.

**Options:**
- Accept it (Airtable thumbnails are the canonical copies)
- Add a step to download and re-host images (Google Drive/Dropbox)
- Use Airtable attachment URLs instead of Paperform URLs for export

### 4. Duplicate Artist Detection

**Priority:** Low

The current upsert logic matches on email. If an artist submits with a different email, a duplicate record is created (e.g., two "Juergen Berkessel" records exist in the current data). Consider adding name-based fuzzy matching as a secondary check.

---

## Model Evaluation (Low Priority)

Current setup works well for ~10-15 submissions/month. Revisit if volume increases significantly.

| Alternative | What It Could Replace | Potential Benefit | Status |
|-------------|----------------------|-------------------|--------|
| Perplexity `sonar-reasoning-pro` | `sonar-deep-research` | Faster, citation tokens not billed | Untested |
| Claude Sonnet 4.6 + web search | Perplexity + GPT-4.1 formatter | Merge researcher+formatter into one node, no hallucinated citations | Untested |
| OpenAI Responses API with web search | Perplexity | Native n8n support (v1.117.0+), fewer API providers | Untested |

**Decision (2026-03-09):** Staying with Perplexity `sonar-deep-research`. Proven quality, volume doesn't justify optimizing for speed.

---

## Feature Ideas

### Slack Integration

The Campaigns table already has a `Campaign Slack ID` field (e.g., `#not-real-art-general`). Could add:
- Submission notification to campaign Slack channel
- Enrichment completion notification
- Export completion notification
- Error alerts

### Artist Portfolio Page

Generate a simple public page per artist using their enriched profile, artwork thumbnails, and social links. Could be:
- Static HTML hosted on the client's site
- A simple Next.js/Astro app
- An Airtable Interface shared view

### Batch Re-Enrichment

Allow admin to select specific artists and re-run enrichment (e.g., after fixing bad data, or when an artist updates their web presence). Currently would require manually resetting status to `Pending - Imported`.

### ActiveCampaign Deeper Integration

Current integration creates/updates contacts and assigns to lists. Could expand to:
- Tag artists by enrichment quality score
- Trigger email sequences based on submission status
- Sync artwork counts as custom fields

### Analytics Dashboard

Track metrics over time:
- Submissions per campaign per month
- Enrichment success rate
- Average enrichment quality (if we add scoring)
- Export history and volume trends

---

## Completed Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-09 | Stay on Perplexity `sonar-deep-research` | Proven quality, low volume (~10-15/month), speed not critical |
| 2026-03-09 | Do not use `sonar-pro` | Hallucinated citations (Yayoi Kusama incident) |
| 2026-03-09 | Added citation validation as permanent safety net | Defense-in-depth against any model hallucinating URLs |
| 2026-03-09 | Phase C export requires discussion before starting | Many AA columns don't apply, field mapping needs user input |

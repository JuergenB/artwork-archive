# Phase C: Export Pipeline — Airtable to Artwork Archive

> **Status:** Planned — requires discussion before implementation
> **Last Updated:** 2026-03-09

---

## Problem

The entire purpose of the Rolling Submissions system is to eventually export enriched artist and artwork records into Artwork Archive (AA) compatible CSV files for import into the AA exhibition platform. This workflow does not exist yet.

---

## Scope

Build Stage 3 of the pipeline: take artists and artworks with status `Pending - Enriched`, convert them to Artwork Archive format, generate CSV files, store them, update records to `Exported`, and log the export.

---

## What We Know

### Artwork Archive Import Formats

Two template files define the AA import format:

**AA-Artist-Template.xlsx** (40 columns, Row 2 = headers):
- Contact fields: First Name, Last Name, Email, Phone, Address, City, State, Zip, Country
- Profile: Bio/Statement (maps to Notes), Website, Social URLs
- Organization fields: Company, Business Name, Display Name
- Classification: Contact Type, Tags
- Many columns may not apply to our use case

**AA-Artworks-Template.xlsx** (68 columns, Row 3 = sample data):
- Piece identity: Piece Title, Artist First/Last Name
- Details: Type, Medium, Height, Width, Depth, Price, Year Created, Description
- Classification: Subject Matter, Tags, Collections
- Files: Piece Image URLs (pipe-separated), Additional File URLs
- Location: Current Location fields
- Provenance, Edition info, Insurance fields
- Many columns are optional/unused for our submissions

### Airtable Source Data

Documented in `docs/knowledge/airtable-schema.md`:
- **Artists table** — 32 fields including AI-enriched profile, summary, tags
- **Artworks table** — 30 fields including AI-enriched tags, subject matter, medium

---

## Key Decisions Needed (Discussion Required)

### 1. Field Mapping — Which Columns Apply?

Many of the 40 artist columns and 68 artwork columns in the AA templates do not apply. Before building the export, we need to agree on:

- Which AA columns get populated vs. left blank
- How Airtable fields map to AA columns (some are 1:1, some need transformation)
- How AI-enriched fields are used (e.g., do AI Tags go into AA Tags? Does Artist Profile (AI) go into Notes?)
- How to handle the Artist Statement → Notes concatenation described in the design doc

### 2. Export Trigger

- Manual trigger via Airtable button (recommended — aligns with Operations Hub Phase B)
- Scheduled (e.g., first of each month)
- Or both

### 3. File Generation

- n8n can generate CSV via Code node or Spreadsheet File node
- Files need to be stored (Dropbox or Google Drive per design doc)
- File naming convention needed (e.g., `AA-Artists-Export-2026-03-09.csv`)

### 4. Scope of Each Export

- All `Pending - Enriched` records? Or allow selecting by Campaign?
- Should exports be incremental (only new since last export) or cumulative?

### 5. Post-Export Actions

- Update artist/artwork status to `Exported`
- Set `Date Exported to AA` field
- Write Export Log record
- Notify admin via email/Slack

---

## Proposed Workflow: Export V1.0

```
Trigger (Webhook from Airtable button or Operations Hub)
  → Fetch all Artists where Status = "Pending - Enriched"
  → Fetch all Artworks where Status = "Pending - Enriched"
  → Code Node: Map Artist fields → AA Artist CSV format
  → Code Node: Map Artwork fields → AA Artworks CSV format
  → Generate Artist CSV file
  → Generate Artworks CSV file
  → Upload to Dropbox/Google Drive
  → Update Artist records: Status → "Exported", Date Exported → now
  → Update Artwork records: Status → "Exported", Date Exported → now
  → Write Export Log record
  → Notify admin (email + optional Slack)
```

---

## Reference: Existing Export Log Table

| Field | Type | Notes |
|-------|------|-------|
| Export ID | multilineText | Primary field |
| Timestamp | multilineText | |
| Number of Artists Exported | multilineText | |
| Number of Artworks Exported | multilineText | |
| Campaign Names Exported | multilineText | |
| Export Status | multilineText | |
| Exported File Name | multilineText | |
| Export Notes | multilineText | |

---

## Dependencies

- Phase A enrichment must be verified working (V0.6 test needed)
- Field mapping discussion with user (BLOCKING — do not start without this)
- Dropbox or Google Drive credential setup in n8n
- Phase B Operations Hub button (optional — can use direct webhook initially)

---

## Open Questions

1. Which of the 40 artist columns and 68 artwork columns actually get populated?
2. How should AI-enriched content be formatted for AA import?
3. Dropbox or Google Drive for file storage?
4. Should exports be campaign-specific or global?
5. Does AA have any import validation we need to account for?
6. What happens if an AA import fails — do we need a rollback mechanism?

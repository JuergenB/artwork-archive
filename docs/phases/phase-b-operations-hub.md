# Phase B: Operations Hub — Admin Panel & Process Monitoring

> **Status:** Planned
> **Last Updated:** 2026-03-09

---

## Problem

There is currently no way for an admin to:
- See the status of the pipeline at a glance
- Trigger enrichment or export runs on demand
- Monitor progress of a running batch
- Review errors without digging into n8n execution logs
- Get a unified view of what's pending, enriched, and exported

The only visibility today is checking Airtable records manually or reading n8n execution history.

---

## Vision

An **Operations Hub** that serves as the admin control panel for the entire Rolling Submissions pipeline. It should provide:

1. **Dashboard view** — counts and status breakdown of artists and artworks across all pipeline stages
2. **Trigger buttons** — one-click to run enrichment, run export, or retry failed records
3. **Live progress** — when a batch is running, show which record is being processed and how many remain
4. **Log viewer** — unified view of import logs, export logs, and error logs
5. **Error management** — flag and resolve records stuck in error states

---

## Implementation Options

### Option A: Airtable Interface

Build directly inside Airtable using its Interface Designer.

**Pros:**
- No additional platform — data is already in Airtable
- Airtable Interfaces support dashboards, filtered views, buttons
- Buttons can trigger n8n webhooks (via Airtable Automations or Script blocks)
- Zero hosting/deployment

**Cons:**
- Limited interactivity — no real-time progress updates (Airtable doesn't push updates)
- Button → webhook is indirect (Airtable Automation → HTTP request → n8n)
- Styling and layout limited to Airtable's Interface Designer
- No true "live" view — user must refresh to see progress

### Option B: Standalone Web Panel (e.g., Retool, Softr, or custom)

**Pros:**
- Full control over UX
- Can poll n8n execution status for live progress
- Richer interactivity

**Cons:**
- Additional platform to maintain
- Authentication and hosting concerns
- More complex to build

### Option C: Airtable Interface + n8n Status Webhook (Hybrid)

Use Airtable Interface for the dashboard and buttons, but add a lightweight n8n workflow that writes progress updates back to a new Airtable table during batch processing.

**Pros:**
- Dashboard stays in Airtable (simple)
- Progress updates written to a "Run Status" table that the Interface can display
- Buttons trigger n8n webhooks
- Near-real-time visibility without external hosting

**Cons:**
- Adds API calls during batch processing (one write per record processed)
- Requires a new Airtable table for run status

---

## Recommended Approach: Option C (Hybrid)

### New Airtable Table: Pipeline Runs

| Field | Type | Purpose |
|-------|------|---------|
| Run ID | singleLineText | Primary field, auto-generated (e.g., `enrich-2026-03-09-001`) |
| Run Type | singleSelect | `Enrichment`, `Export`, `Retry` |
| Status | singleSelect | `Queued`, `Running`, `Completed`, `Failed`, `Cancelled` |
| Started At | dateTime | When the run began |
| Completed At | dateTime | When the run finished |
| Total Records | number | How many records to process |
| Processed | number | How many completed so far |
| Errors | number | How many errored |
| Current Record | singleLineText | Name of record currently being processed |
| Error Details | multilineText | Accumulated error messages |
| Triggered By | singleLineText | Who/what started the run |

### Enrichment Workflow Changes

Add to the SplitInBatches loop in Enrichment V0.6:
1. **On batch start:** Create a Pipeline Run record with status `Running`
2. **After each artist:** Update the Pipeline Run record (increment `Processed`, update `Current Record`)
3. **On completion:** Update status to `Completed`, set `Completed At`
4. **On error:** Increment `Errors`, append to `Error Details`

### Airtable Interface Panels

1. **Dashboard Panel**
   - Summary counts: Pending Imported / Pending Enriched / Exported / Error
   - Grouped by Campaign
   - Chart: submissions over time

2. **Pipeline Runs Panel**
   - Table of recent runs with status badges
   - Expandable detail for error messages
   - Auto-refresh (Airtable Interface limitation: manual refresh or set interval)

3. **Actions Panel**
   - Button: "Run Enrichment" → triggers enrichment webhook
   - Button: "Run Export" → triggers export webhook (Phase C)
   - Button: "Retry Errors" → triggers retry workflow for error-state records

4. **Error Review Panel**
   - Filtered view: Artists/Artworks with `Error - Data` or `Error - Automation` status
   - Inline editing to fix data issues
   - Button: "Clear Error & Retry" → resets status to `Pending - Imported`

---

## Dependencies

- Phase A must be stable (enrichment V0.6 verified working)
- Export workflow (Phase C) must exist before "Run Export" button works
- Error Handler workflow should be activated

---

## Open Questions

1. Should the Pipeline Runs table also track individual record-level outcomes, or just batch-level summaries?
2. How frequently should the Airtable Interface be expected to refresh for "live" updates?
3. Should there be email/Slack notifications when a run completes or errors?
4. Should the "Run Enrichment" button allow selecting specific artists, or always process all pending?
5. Is Airtable Interface Designer sufficient, or does the client need something more polished?

---

## Estimated Work

| Task | Effort |
|------|--------|
| Design and create Pipeline Runs table in Airtable | Small |
| Modify Enrichment V0.6 to write progress updates | Medium |
| Build Airtable Interface (dashboard, runs, actions, errors) | Medium |
| Create "Retry Errors" n8n workflow | Small |
| Testing and refinement | Medium |

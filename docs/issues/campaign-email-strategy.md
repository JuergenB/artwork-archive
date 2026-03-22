# Campaign email strategy: Mailgun transactional + ActiveCampaign marketing via n8n orchestration

## Context

As we add Mailgun for sending submission confirmations and admin notifications (#50, #51), we need a clear strategy for which emails go through which system — especially for semi-marketing emails like "call for artists" announcements.

## Email Channel Strategy

### Mailgun (subdomain: `mail.{domain}.com`) — Transactional Only
- Submission confirmations (submitter emails from #50)
- Admin notification emails (already working via Gmail, migrating to Mailgun)
- Enrichment status updates (future)
- Any automated, event-triggered, single-recipient emails

### ActiveCampaign (root domain) — Marketing / Outreach
- "Call for artists" announcements
- Exhibition opening notifications
- Newsletters and artist community updates
- Any list-based sends requiring unsubscribe management and CAN-SPAM/GDPR compliance

### n8n as Orchestrator — Trigger ActiveCampaign Programmatically
- When a Campaign's status changes to "Open" (or similar) in the Campaigns table, n8n triggers an ActiveCampaign campaign via API
- This gives us the automation benefit without reinventing list management, unsubscribe handling, and compliance
- Campaign table could have fields like `Submission Open Date`, `Call for Artists AC Campaign ID` to configure this per-exhibition

## Why Not Send Marketing Emails Through Mailgun?

1. **Compliance** — Marketing emails require unsubscribe links, list management, and CAN-SPAM/GDPR handling. ActiveCampaign has this built in.
2. **Reputation isolation** — Transactional emails on a subdomain keeps that reputation clean. Marketing sends (which naturally get more complaints) stay on the root domain via ActiveCampaign.
3. **Recipient perception** — `submissions@mail.domain.com` is fine for confirmations but `submissions@domain.com` (via ActiveCampaign) feels more official for outreach.
4. **Volume** — At current scale (~10-15 submissions/month), deliverability is comparable either way, but the separation sets up good habits for growth.

## Deliverability Notes

At our volume, the subdomain vs root domain distinction is minor for deliverability. What actually matters:
- Proper SPF/DKIM/DMARC authentication (required for both channels)
- Consistent sending with low bounce/complaint rates
- Content quality

A properly authenticated `mail.{domain}.com` subdomain will land in inboxes just fine for transactional emails.

## Implementation Ideas

- [ ] Add `Submissions Open` / `Submissions Close` date fields to Campaigns table (if not already present)
- [ ] Add `Call for Artists AC Campaign ID` field to Campaigns table
- [ ] New n8n workflow: watches Campaign status changes → triggers ActiveCampaign campaign send via API
- [ ] Document which email types go through which channel in CLAUDE.md

## Related Issues
- #50 — Submitter confirmation emails (Mailgun)
- #51 — Per-campaign sender configuration (Mailgun)

# Airtable Schema: AA Rolling Submissions

> Base ID: `appDFU2JdAw2Ckax4`
> Retrieved: 2026-03-09 via Airtable Meta API

---

## Table: Artists (`tblZZS5EeWmxmyCTB`) — 32 fields

### Identity
| Field | ID | Type | Notes |
|-------|-----|------|-------|
| Full Name | fldH1OiwMxxrGw5Cx | formula | `TRIM(CONCATENATE(First Name, " ", Last Name))` — **Primary field** |
| First Name | fldt9pyWrNaGeUx5d | multilineText | |
| Last Name | fldfY481ivuBOsrJD | multilineText | |
| Title | fldzYlsL8XYBnXjBQ | multilineText | |
| Nationality | fldddb3JOs9aBTXG4 | multilineText | |
| Email | fldfeSfOl1QIjvLPK | multilineText | |

### Bio & AI
| Field | ID | Type | Notes |
|-------|-----|------|-------|
| Bio | fldhQABTf2ZaQxT3C | multilineText | Artist-entered |
| Artist Statement | fldFsuGbS4IHMPoe4 | multilineText | Artist-entered |
| Artist Profile (AI) | flduxG1Q3519WxJcD | richText | Enrichment output (markdown) |
| Artist Summary (AI) | fldcWHSoLJjKdpk5c | multilineText | One-line summary |
| AI Tags | fldBHNwTYaxKzLAH2 | multilineText | Comma-separated tags |

### Contact
| Field | ID | Type | Notes |
|-------|-----|------|-------|
| Contact Image URL | fld41xPnwSwzEXP6E | multilineText | From Paperform upload |
| Contact Thumbnail | fldPIIEZWarZH3Im9 | multipleAttachments | |

### Address
| Field | ID | Type | Notes |
|-------|-----|------|-------|
| Primary Address | fldfM2sSxtuaJFaAA | multilineText | |
| Address 2 | fldTGl0l6WOEBv6L7 | multilineText | |
| City | fldvWSr7nuGPcuGZc | multilineText | |
| State | fldEoNLssZ1KaUPlr | multilineText | |
| Zip | fld2TYDxetFmZn7R5 | multilineText | |
| Country | fldoVBl8ZE0vbGZib | multilineText | |

### Social
| Field | ID | Type | Notes |
|-------|-----|------|-------|
| Website | fld5zXykNgtpmjx2C | multilineText | |
| Instagram URL | fldutf0zCPDaoh1EW | multilineText | |
| Facebook URL | fldHEQ9KXNoF8mfA0 | multilineText | |
| Twitter URL | flde3RaqpUnhblkwq | multilineText | |
| LinkedIn URL | fldoqpysFxrIpS8DZ | multilineText | |
| Pinterest URL | fld5t3lu9cbovuA9d | multilineText | |

### Internal
| Field | ID | Type | Notes |
|-------|-----|------|-------|
| Notes | fld3IemJFmwu6D2zz | multilineText | |
| Status | fldMfIXMCI5nVtwrF | singleSelect | Choices: In Progress, Pending - Imported, Pending - Enriched, Exported, Needs Review, On Hold, Error - Data, Error - Automation |
| Submission ID (Paperform) | (singleLineText) | singleLineText | |
| Date Imported | (multilineText) | multilineText | |
| Date Exported to AA | (multilineText) | multilineText | |

### Links
| Field | ID | Type | Notes |
|-------|-----|------|-------|
| Artworks | — | multipleRecordLinks | → Artworks (`tblh3npWVZgkWSILm`) |
| Artworks Count | — | count | Auto-count of linked artworks |
| Campaigns | — | multipleRecordLinks | → Campaigns (`tblr0oR74rtvR6LN2`) |

---

## Table: Artworks (`tblh3npWVZgkWSILm`) — 30 fields

### Identity
| Field | Type | Notes |
|-------|------|-------|
| Piece Name | singleLineText | **Primary field** |
| Artist | multipleRecordLinks | → Artists (`tblZZS5EeWmxmyCTB`) |
| First Name (from Artist) | multipleLookupValues | Lookup |
| Last Name (from Artist) | multipleLookupValues | Lookup |
| Artist Email | singleLineText | |

### Artwork Details
| Field | Type | Notes |
|-------|------|-------|
| Type | singleLineText | Book, Ceramic, Collage, Digital, Drawing, etc. |
| Medium | singleLineText | Artist-entered |
| Subject Matter | singleLineText | Artist-entered |
| Description | multilineText | Artist-entered |
| Height (AI) | number | AI-extracted from Description |
| Width (AI) | number | AI-extracted from Description |
| Depth (AI) | number | AI-extracted from Description |
| Price | currency | Retail price |
| Year Created Date | singleLineText | String format: mm/dd/yyyy or yyyy |

### AI-Enriched
| Field | Type | Notes |
|-------|------|-------|
| Tags (AI) | multilineText | AI-generated tags |
| Subject Matter (AI) | multilineText | AI-detected subject |
| Medium (AI) | multilineText | AI-detected medium |
| Relevance Hypothesis (AI) | multilineText | Artwork-to-exhibition theme connection |
| Dimensions Unit (AI) | singleLineText | Unit of extracted dimensions (inches, cm, feet, mm) |

### Files
| Field | Type | Notes |
|-------|------|-------|
| Piece Image URLs | multilineText | Pipe-separated for multiple |
| Piece Thumbnail | multipleAttachments | |
| Additional File URLs | multilineText | Pipe-separated |
| Link to Purchase URL | singleLineText | |

### Grouping
| Field | Type | Notes |
|-------|------|-------|
| Collections | singleLineText | Maps to campaign name |
| Related Campaign | singleLineText | Campaign name (text) |
| Campaign (Linked by Name) | multipleRecordLinks | → Campaigns (`tblr0oR74rtvR6LN2`) |
| Provenance Info | multilineText | |
| Notes | multilineText | |

### Internal
| Field | Type | Notes |
|-------|------|-------|
| Status | singleSelect | Choices: In progress, Pending - Imported, Pending - Enriched, Exported, Needs Review, On Hold, Error - Data, Error - Automation |
| Date Imported | singleLineText | |
| Date Exported to AA | singleLineText | |
| Import Logs | multipleRecordLinks | → Import Logs (`tblRRwlDM1M6j0ifz`) |

---

## Table: Campaigns (`tblr0oR74rtvR6LN2`) — 24 fields

### Campaign Info
| Field | ID | Type | Notes |
|-------|-----|------|-------|
| Campaign Name | fldXAiW8Kg4fXWRNd | multilineText | **Primary field** |
| Campaign Short Name | fldz6RsA61GrDNXbP | formula | |
| Campaign Descriptions | fld4T1DsZ898RJkuD | multilineText | |
| Campaign Logo | flda2UHrhdnd1mnhS | multipleAttachments | |
| Campaign Contact Emails | fld9WkRcNhqqoPaUa | email | Admin notifications |
| Landing Page URL | fldsrUirUG8uCepAW | url | |
| Landing Page Embed Code | fldUOd6A4nWY0ARv6 | formula | Paperform embed |

### Email Templates
| Field | ID | Type | Notes |
|-------|-----|------|-------|
| Admin Notification Subject | fldxCzqAb8CnKK2PM | singleLineText | |
| Admin Notification Body | fldnI0tfyxrEuXZAJ | multilineText | |
| Submitter Thank You Subject | fldMVra0I5YS60d9f | singleLineText | |
| Submitter Thank You Body | fld36DlwRry0Eeand | multilineText | |

### Exhibition Details
| Field | ID | Type | Notes |
|-------|-----|------|-------|
| Official Exhibition Name | fldisPjBI9xFyCqEz | singleLineText | |
| Exhibition Venue | fldaeaAlxldrU9oIv | singleLineText | |
| Exhibition Address | fldaNT4nhBeUbRHi7 | singleLineText | |
| Exhibition Open | fldHqWMAxQB0Ba9E0 | date | Exhibition start date — year used for collections_expand |
| Exhibition Close | fldUDoCPoy59Qn1td | date | Exhibition end date |
| Exhibition URL | fldCtdBCbbmi5L2ll | url | Public exhibition page |

### CRM Integration
| Field | ID | Type | Notes |
|-------|-----|------|-------|
| Active Campaign Lists | fldxC6uLiPyWVhOcS | multipleSelects | |
| Active Campaign Tags | fldrdh6cvgEiNl9Vo | singleLineText | |
| Campaign Slack ID | fldFvLv9jHftNsmMg | multilineText | e.g. #not-real-art-general |

### Links
| Field | ID | Type | Notes |
|-------|-----|------|-------|
| Artworks | fld2K29givCPnqFQ7 | multipleRecordLinks | → Artworks |
| Artists | fldIGnCrToNVsa85m | multipleRecordLinks | → Artists |
| Partner Organizations | flduNSliJgRyZSG1s | multipleRecordLinks | → Partner Organizations |
| Organization_ID (from Partner Organizations) | fld8NqexyNjsxKMyj | multipleLookupValues | Lookup |

---

## Table: Import Logs (`tblRRwlDM1M6j0ifz`) — 10 fields

| Field | Type | Notes |
|-------|------|-------|
| Import ID | multilineText | **Primary field** |
| Timestamp | multilineText | |
| Artist First Name | singleLineText | |
| Artist Last Name | singleLineText | |
| Artist Email | singleLineText | |
| Number of Artworks Imported | multilineText | |
| Artwork IDs Imported | multipleRecordLinks | → Artworks |
| Campaign Name | multilineText | |
| Import Status | multilineText | |
| Error Notes | multilineText | |

---

## Table: Export Logs (`tblI2NDcfb4mQlqvM`) — 8 fields

| Field | Type | Notes |
|-------|------|-------|
| Export ID | multilineText | **Primary field** |
| Timestamp | multilineText | |
| Number of Artists Exported | multilineText | |
| Number of Artworks Exported | multilineText | |
| Campaign Names Exported | multilineText | |
| Export Status | multilineText | |
| Exported File Name | multilineText | |
| Export Notes | multilineText | |

---

## Status Flow

```
Artists:  In Progress → Pending - Imported → Pending - Enriched → Exported
                                                                ↗ Needs Review
                                                                ↗ On Hold
                                                                ↗ Error - Data
                                                                ↗ Error - Automation

Artworks: In progress → Pending - Imported → Pending - Enriched → Exported
          (same status choices as Artists)
```

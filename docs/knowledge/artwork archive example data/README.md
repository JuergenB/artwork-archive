# Artwork Archive Example Data

Data from a successful Artwork Archive bulk upload (~August 2024). Used as format reference for the Phase C export utility (#74).

## Files

| File | Records | Description |
|------|---------|-------------|
| `event-users-report-1722369537377-AA-Export-V2.csv` | ~13,260 artists | Full original artist export (34 AA columns) |
| `event-works-report-1722370126839-AA-export.csv` | ~5,780 artworks | Full original artwork export (64 AA columns) |
| `sample-artists-20-records.csv` | 20 artists | Curated subset: 10 US (varied states) + 10 international (8 countries). Selected for data richness. |
| `sample-artworks-matched.csv` | 95 artworks | All artworks belonging to the 20 sample artists |

## CSV Structure

All files follow AA's import format:
- **Row 1**: Numeric column indices (0, 1, 2, ...)
- **Row 2**: Column names
- **Row 3**: Field instructions/descriptions
- **Row 4+**: Data

Files include a UTF-8 BOM.

## Key Observations

- **Phone formats**: AA accepted wide variation — `+1 323-823-0201`, `+17089856018`, `+49 172 4183031`, etc.
- **State field**: Original export had AI-generated state codes from zip codes (unreliable for international). Our current intake collects state directly via Paperform.
- **Artworks per artist**: Typically 3-5 in this dataset
- **Status values used**: `available`, `not_for_sale`, `in_progress` (artworks)
- **Date formats**: `mm/dd/yyyy` and `yyyy` (year-only) both present

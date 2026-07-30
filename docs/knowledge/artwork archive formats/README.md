# Artwork Archive import templates

The `.xlsx` files Artwork Archive supplies for bulk import. Everything the export
pipeline knows about AA's column contract is derived from these — never
hand-written.

## Which folder is live

**Exactly one dated folder sits at the top level, and it is always the live one.
Everything else lives in `superseded/`.**

Right now that is **`April 2026/`**:

| Entity  | File                                                    | Cols | AA last revised | sha256 |
|---------|---------------------------------------------------------|------|-----------------|--------|
| artist  | `ArtworkArchive-ContactsImportTemplate.xlsx`            | 40   | 2024-09-10      | `7858f71d05fb` |
| artwork | `ArtworkArchive-CollectorOrgVersionPieceImportTemplate.xlsx` | 69 | 2026-01-14   | `ec747ba30ad0` |

Byte-identical copies live at `app/lib/export/templates/` — that is what the
Excel writer actually opens at runtime, appending data rows from row 4 so AA's
index/header/helper rows survive untouched. The two locations must never drift;
the sha256 in the JSON fixtures is what proves they haven't.

## ⚠️ Do not rename the dated folder

`scripts/extract-aa-template.py` derives `provenance.revisionLabel` from the
**parent directory name** and `provenance.repoPath` from the path. Both are
curator-facing: they render in the export preview
(`app/app/dashboard/export/export-preview.tsx`) and are embedded in the
provenance line of the email to AA (`app/app/api/export/generate/route.ts`).

Renaming `April 2026/` to `current/` would make the curator's screen read
*"current · revised by AA 2026-01-14"*, which is strictly less information than
it shows today. The date in the folder name **is** the label. Leave it alone.

Note the folder name records **when we received** the template; `revisedAt`
records when **AA last edited** it. They are different dates and the second one
is the one that matters when AA claims to have shipped an update.

## When AA sends a revised template

1. Create a new dated folder for the month you received it, e.g. `August 2026/`.
2. Move the previous dated folder's contents into `superseded/<Month-Year>.zip`
   and delete the loose folder. One dated folder at top level, always.
3. Copy the new `.xlsx` files to `app/lib/export/templates/`, replacing the old
   ones (same filenames, or update `provenance.fileName` via step 4).
4. Re-run the extractor for each entity:

   ```bash
   python3 scripts/extract-aa-template.py \
     "docs/knowledge/artwork archive formats/August 2026/ArtworkArchive-ContactsImportTemplate.xlsx" \
     artist app/lib/export/__fixtures__/aa-template-artist.json

   python3 scripts/extract-aa-template.py \
     "docs/knowledge/artwork archive formats/August 2026/ArtworkArchive-CollectorOrgVersionPieceImportTemplate.xlsx" \
     artwork app/lib/export/__fixtures__/aa-template-artwork.json
   ```

5. Run the contract test and fix whatever it reports:

   ```bash
   cd app && npx vitest run lib/aa-columns.test.ts
   ```

6. Update the table above.

Never edit `app/lib/aa-columns.ts` by hand to make the test pass — the test
failing *is* the deliverable, it tells you exactly which headers AA changed.

## superseded/

| Archive | Contents | Why superseded |
|---------|----------|----------------|
| `December-2025.zip` | `AA-Artist-Template.xlsx` (40 cols), `AA-Artworks-Template.xlsx` (68 cols) | AA revised the pieces template mid-January 2026: added `Sale Location` at index 38 and renamed four columns. Our first export was built against this version and **AA rejected it**. Kept only as the record of what changed. |

Zipped deliberately — it makes these hard to open by accident and keeps the
directory listing honest about how many live templates there are (two).

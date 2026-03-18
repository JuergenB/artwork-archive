# AA Export — Standing Instructions

## Rule 1: Read code before answering

**NEVER answer questions about how something works from memory alone.** Read every file in the chain first. Memory and plan files may be stale — the code is the source of truth. When the user asks "how does X work?", read the actual implementation files before responding.

---

## Rule 2: GitHub Issues are the source of truth

**At the start of every session, run this first — before anything else:**

```bash
gh issue list --repo JuergenB/artwork-archive --state open --limit 100
```

**When a design or feature is discussed:** Create a GitHub issue immediately with the full spec. Design documents belong in GitHub Issues, not in conversation history.

**When closing an issue:** Add a comment summarising what was built and which files changed.

---

## Rule 3: Internal docs first

The `docs/` folder (in project root) contains all curated knowledge. Read it before any web search.

---

## Rule 4: Never ask the user to do what you can do yourself

CLI tools are pre-approved: `git`, `gh`, `npm`, `npx`, `node`, `python3`, `curl`, `vercel`, `lsof`, `kill`, `jq`, `open`, `tree`.
Airtable tables/fields: use the Metadata API directly, never ask the user to create them manually.

---

## Rule 5: Execute ALL user instructions in a single pass

When the user gives multiple instructions in one message, implement ALL of them before responding. Do not skip any.

---

## Dev Environment

- **Port:** 3015 (`npm run dev`)
- **Stack:** Next.js 16, TypeScript, Tailwind v4, Airtable SDK 0.12.2, shadcn/ui, Auth.js 5
- **Auth:** NextAuth Credentials provider | `AUTH_USERS` env: `id:email:password:displayName:role` comma-separated
- **Repo:** github.com/JuergenB/artwork-archive
- **User Timezone:** America/New_York (Eastern Time)

---

## Key Files

- `auth.ts` — Auth.js 5 config (email + password, role in JWT)
- `lib/airtable/client.ts` — Lazy-init Airtable client, fetchAll<T>, fetchById<T>, typed transforms
- `lib/types.ts` — All domain types (Artist, Artwork, Campaign, PartnerOrg, FieldMapping, ExportLog, User)
- `types/next-auth.d.ts` — Session type extension (displayName, role)
- `components/app-sidebar.tsx` — Sidebar navigation

---

## Airtable

- **Base ID:** `appDFU2JdAw2Ckax4` (AA Rolling Submissions)
- **Tables:**
  - Artists: `tblZZS5EeWmxmyCTB`
  - Artworks: `tblh3npWVZgkWSILm`
  - Campaigns: `tblr0oR74rtvR6LN2`
  - Partner Organizations: `tbl0GhG4KxfuYDKaE`
  - Pipeline Actions: `tblPLE3Kt16Blqsjr`
  - Pipeline Runs: `tblhF8aI7tf2wPWyo`
  - Field Mappings: TBD
  - Export Logs: TBD
  - Users: TBD
- **API key** is in `.env.local`. Use Bash+curl for all schema changes — NEVER ask the user to edit Airtable manually.
- **Metadata API:** `GET/PATCH https://api.airtable.com/v0/meta/bases/{baseId}/tables` — bearer auth with `AIRTABLE_API_KEY`.

---

## Key Architectural Rules

- Airtable client is lazy-init (env checked at query time, not import)
- Image URLs must use Paperform S3/CDN URLs (permanent). Never Airtable attachment thumbnails (expire).
- Transforms are self-contained — no chaining needed
- `title_case` is for addresses only — never artist names

---

## Session Rules (non-negotiable)

1. **Read code before answering.** Do not answer from memory. Read the actual files first.
2. **Execute ALL user instructions.** Do not silently drop any. Confirm each was done.
3. **Convert timestamps to ET.** API timestamps are UTC. User is in America/New_York.
4. **Close issues immediately** when implementing code is committed.
5. **Save important discoveries to memory immediately.** Do not wait until end of session.

# [Project Name] — Standing Instructions

## Rule 1: Read code before answering

**NEVER answer questions about how something works from memory alone.** Read every file in the chain first. Memory and plan files may be stale — the code is the source of truth. When the user asks "how does X work?", read the actual implementation files before responding.

---

## Rule 2: GitHub Issues are the source of truth

**At the start of every session, run this first — before anything else:**

```bash
gh issue list --repo [OWNER]/[REPO] --state open --limit 100
```

**When a design or feature is discussed:** Create a GitHub issue immediately with the full spec. Design documents belong in GitHub Issues, not in conversation history. Conversation history is lost when context compresses. GitHub Issues are permanent.

**When closing an issue:** Add a comment summarising what was built and which files changed.

---

## Rule 3: Internal docs first

The `docs/` folder contains all curated knowledge. Read it before any web search.

---

## Rule 4: Never ask the user to do what you can do yourself

CLI tools are pre-approved: `git`, `gh`, `npm`, `npx`, `node`, `python3`, `curl`, `vercel`, `lsof`, `kill`, `jq`, `open`, `tree`.
Airtable tables/fields: use the Metadata API directly, never ask the user to create them manually.

---

## Rule 5: Execute ALL user instructions in a single pass

When the user gives multiple instructions in one message (e.g., "move X above Y, left-align Z, make W more subtle"), implement ALL of them before responding. Do not skip any. If you're unsure about one, implement the ones you understand and ask about the ambiguous one — but never silently drop instructions.

---

## Dev Environment

- **Port:** [PORT] (`npm run dev`)
- **Stack:** Next.js App Router, TypeScript, Tailwind v4, Airtable, shadcn/ui
- **Auth:** NextAuth custom credentials | `AUTH_USERS` env: `id:email:password:Display Name` comma-separated
- **Repo:** github.com/[OWNER]/[REPO]
- **User Timezone:** America/New_York (Eastern Time). Convert all API/UTC timestamps to ET before discussing with user.

---

## Key Files

<!-- List architecturally significant files here as the project grows. Examples: -->
<!-- - `lib/airtable/client.ts` — lazy init, all CRUD -->
<!-- - `app/api/...` — API routes -->
<!-- - `components/...` — key UI components -->

---

## Airtable

- **Base ID:** [BASE_ID]
- **Tables:** [list tables as they are created]
- **API key** is in `.env.local`. Use Bash+curl for all schema changes — NEVER ask the user to edit Airtable manually.
- **Metadata API:** `GET/PATCH https://api.airtable.com/v0/meta/bases/{baseId}/tables` — bearer auth with `AIRTABLE_API_KEY`.

---

## Key Architectural Rules

- Airtable client is lazy-init (env checked at query time, not import)
- AI prompts must inject knowledge docs from `lib/ai/knowledge.ts` if model lacks domain data
- [Add project-specific rules as they emerge]

---

## Session Rules (non-negotiable)

1. **Read code before answering.** Do not answer from memory. Read the actual files first.
2. **Execute ALL user instructions.** Do not silently drop any. Confirm each was done.
3. **Convert timestamps to ET.** API timestamps are UTC. User is in America/New_York.
4. **Close issues immediately** when implementing code is committed.
5. **Save important discoveries to memory immediately.** Do not wait until end of session.

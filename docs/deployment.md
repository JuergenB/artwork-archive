# AA Export — Vercel Deployment Guide

## Prerequisites

Before deploying to Vercel, you need:

1. **Vercel account** linked to the GitHub repo
2. **Airtable PAT** (Personal Access Token) with read/write access to the AA Rolling Submissions base
3. **Airtable tables created** — Field Mappings, Export Logs, and Users tables must exist before the app can use them (auth works without these, but export features won't)
4. **Auth credentials** — at least one user in `AUTH_USERS` format

---

## Environment Variables

All env vars must be set in Vercel project settings. **Use `printf '%s'` not `echo`** when setting secrets via CLI — `echo` adds a trailing newline that corrupts auth tokens.

### Required for auth + basic app

| Variable | Value | Notes |
|----------|-------|-------|
| `AUTH_SECRET` | `openssl rand -base64 32` | Generate fresh for production |
| `AUTH_USERS` | `1:kirsten@example.com:PASSWORD:Kirsten:curator,2:admin@example.com:PASSWORD:Admin:admin` | `id:email:password:displayName:role` |
| `NEXT_PUBLIC_APP_NAME` | `AA Export` | Shown in browser tab + login |

### Required for Airtable data access

| Variable | Value | Notes |
|----------|-------|-------|
| `AIRTABLE_API_KEY` | `pat19mKr...` | Personal Access Token |
| `AIRTABLE_BASE_ID` | `appDFU2JdAw2Ckax4` | AA Rolling Submissions |
| `AIRTABLE_ARTISTS_TABLE_ID` | `tblZZS5EeWmxmyCTB` | |
| `AIRTABLE_ARTWORKS_TABLE_ID` | `tblh3npWVZgkWSILm` | |
| `AIRTABLE_CAMPAIGNS_TABLE_ID` | `tblr0oR74rtvR6LN2` | |
| `AIRTABLE_PARTNER_ORGS_TABLE_ID` | `tbl0GhG4KxfuYDKaE` | |
| `AIRTABLE_PIPELINE_ACTIONS_TABLE_ID` | `tblPLE3Kt16Blqsjr` | |
| `AIRTABLE_PIPELINE_RUNS_TABLE_ID` | `tblhF8aI7tf2wPWyo` | |
| `AIRTABLE_FIELD_MAPPINGS_TABLE_ID` | TBD | Create table first |
| `AIRTABLE_EXPORT_LOGS_TABLE_ID` | TBD | Create table first |

### Setting via Vercel CLI

```bash
# IMPORTANT: Use printf, not echo (trailing newline corrupts secrets)
printf '%s' 'YOUR_SECRET_HERE' | vercel env add AUTH_SECRET production
printf '%s' 'pat19mKr...' | vercel env add AIRTABLE_API_KEY production

# Non-secret values can use regular add
vercel env add AIRTABLE_BASE_ID production
# Then type: appDFU2JdAw2Ckax4

# For AUTH_USERS (contains colons, wrap in quotes)
printf '%s' '1:kirsten@example.com:pass:Kirsten:curator,2:admin@example.com:pass:Admin:admin' | vercel env add AUTH_USERS production
```

---

## Deployment Steps

### First-time setup

1. **Link the project:**
   ```bash
   cd app
   vercel link
   ```
   - Select the team/account
   - When asked for root directory, enter `app` (or set in Vercel dashboard)

2. **Set root directory** in Vercel project settings → General → Root Directory: `app`

3. **Set all environment variables** (see tables above)

4. **Deploy:**
   ```bash
   vercel --prod
   ```

### Subsequent deploys

Push to `main` branch — Vercel auto-deploys if GitHub integration is connected.

Or manually:
```bash
cd app && vercel --prod
```

---

## Deployment Phases

### Phase 1: Auth only (now)
- Set: `AUTH_SECRET`, `AUTH_USERS`, `NEXT_PUBLIC_APP_NAME`
- Skip all `AIRTABLE_*` vars
- Result: Login works, dashboard loads, but no data from Airtable
- Good for: Verifying auth flow, CI/CD pipeline, basic smoke test

### Phase 2: Read-only data (after Airtable tables created)
- Add all `AIRTABLE_*` vars
- Result: Full data access, field mappings visible, export logs visible
- Good for: Curator review, testing transforms

### Phase 3: Full export (after export pipeline built)
- All vars set, export API endpoint active
- Result: End-to-end export workflow

---

## Gotchas

- **`printf '%s'` not `echo`**: `echo` adds `\n` which corrupts `AUTH_SECRET` and causes auth failures that are extremely hard to debug
- **Root directory**: Must be `app`, not repo root — the Next.js project lives in `/app`
- **Build command**: Default `next build` works — no custom build command needed
- **Output directory**: Default `.next` works
- **Node.js version**: 18.x or 20.x (Next.js 16 requirement)
- **Airtable PAT scope**: Must include `data.records:read` and `data.records:write` for the AA Rolling Submissions base
- **AUTH_USERS format**: Colons separate fields within a user, commas separate users. No spaces around delimiters.

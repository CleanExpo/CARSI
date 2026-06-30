# Security remediations

## `121-supabase-rls-remediation.sql` — #121 Supabase advisors

**Status: DRAFT — review + founder approval required before applying to prod.**

CARSI's Supabase project (`ofzafxvxobjggjisrbsa`) is used purely as hosted
Postgres behind Prisma; the app has no Supabase client SDK and does not use
PostgREST. But PostgREST + the public anon key are enabled by default, so 21
`public` tables (incl. `lms_google_oauth_tokens`) were reachable by anyone with
the anon key. This migration locks the public surface without touching the app.

### Why it's app-safe (verified against the live catalog)
- Prisma connects as role `postgres`, which has `rolbypassrls=true` and owns
  every table → bypasses RLS entirely.
- `service_role` (agent-framework writers) also bypasses RLS.
- No `@supabase/supabase-js` dependency, no browser client, no `.from()/.rpc()`.

So enabling RLS / dropping anon policies only removes the public (anon /
authenticated) exposure.

### What it does
- **Tier 0:** enable RLS (deny-all) on the 21 RLS-disabled tables.
- **Tier 1:** drop the `USING(true)` policies wrongly granted to `{public}` on
  7 audit/agent tables; remove the 2 anon INSERT policies on `hub_submissions`
  (⚠ confirm no external system writes it via the anon key first).
- **Tier 2:** `agent_run_summaries` view → `security_invoker`.
- **Tier 3/4:** pin `search_path` on 19 functions; revoke EXECUTE on 8
  SECURITY DEFINER functions from anon/authenticated.

### Deferred (separate, higher risk)
`extension_in_public` (pg_trgm/unaccent/vector) and the 729 performance
advisors (unused indexes, duplicate policies, unindexed FKs).

### How to apply (after approval)
Run the whole file (single transaction) via the Supabase SQL editor, or the
Management API query endpoint, then run the verification queries at the bottom
and re-pull `GET /v1/projects/ofzafxvxobjggjisrbsa/advisors/security` (expect
ERROR count → 0). Token: 1Password → `Unite-Group-Infrastructure` →
`SUPABASE_ACCESS_TOKEN`.

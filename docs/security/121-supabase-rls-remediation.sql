-- =====================================================================
-- #121 — CARSI Supabase security-advisor remediation  (DRAFT FOR REVIEW)
-- Project: ofzafxvxobjggjisrbsa (CARSI, ap-northeast-2)
-- Generated: 2026-06-30 from live advisor + pg_catalog introspection
-- APPLIED TO PROD: 2026-06-30 (founder-approved) via Management API query
--   endpoint. Result: security advisors 70 → 31 (ERROR 23 → 0); the 31 remaining
--   are 28 rls_enabled_no_policy (INFO — the intended deny-all state) + 3
--   extension_in_public (WARN — deferred). App verified healthy (prod 200).
--   Tier 4 was corrected post-apply to REVOKE FROM PUBLIC (see note below).
--
-- Apply via Supabase SQL editor or Management API query endpoint.
-- This file is intentionally NOT in prisma/migrations (RLS is not
-- Prisma-managed; some tables belong to the agent/audit framework).
--
-- WHY THIS IS SAFE FOR THE APP (verified, not assumed):
--   * CARSI has NO @supabase/supabase-js dependency, no browser Supabase
--     client, no .from()/.rpc() calls. It does not use PostgREST.
--   * All app DB access is via Prisma, which connects as role `postgres`.
--   * `postgres` has rolbypassrls=true AND owns every table here, so it
--     bypasses RLS entirely. Enabling RLS / dropping anon policies has
--     ZERO effect on the application; it only closes the public
--     (anon / authenticated / PostgREST) exposure surface.
--   * `service_role` also has rolbypassrls=true (agent-framework writers
--     using the service key keep working).
--
-- Run inside one transaction so a failure rolls back cleanly.
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------------
-- TIER 0 (P0 / ERROR) — 21 public tables with RLS disabled.
-- Enabling RLS with NO policy => deny-all to anon/authenticated, while
-- postgres/service_role (BYPASSRLS) are unaffected. Closes the anon
-- read/write exposure, incl. the lms_google_oauth_tokens leak
-- (also the lone `sensitive_columns_exposed` finding — same table).
-- ---------------------------------------------------------------------
DO $$
DECLARE t text;
DECLARE tables text[] := ARRAY[
  'lms_bundles','lms_learning_pathways','lms_learning_pathway_courses',
  'lms_course_prerequisites','lms_migration_jobs','lms_xp_events',
  'lms_user_levels','lms_cec_reports','lms_course_ideas',
  'lms_course_idea_votes','lms_rpl_portfolios','lms_bundle_courses',
  'lms_google_oauth_tokens','lms_user_sessions','lms_lesson_views',
  'lms_notifications','lms_student_risk_scores','lms_utm_captures',
  'lms_audit_log','lms_push_subscriptions','alembic_version'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname='public' AND c.relname=t AND c.relkind='r') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      -- Defence in depth: also revoke direct grants from the API roles.
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- TIER 1 (P0 / WARN) — 9 "rls_policy_always_true" tables.
-- These already have RLS ON but carry a USING(true) policy granted to
-- {public}, so they were named "Service role full access" yet actually
-- allowed EVERYONE. service_role bypasses RLS, so dropping the policy
-- leaves the intended service-role writers working and removes the hole.
-- (Agent/audit-framework tables — not the CARSI LMS.)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role has full access to audit_alerts"        ON public.audit_alerts;
DROP POLICY IF EXISTS "Service role has full access to audit_evidence"      ON public.audit_evidence;
DROP POLICY IF EXISTS "Service role has full access to audit_runs"          ON public.audit_runs;
DROP POLICY IF EXISTS "Service role has full access to audit_schedules"     ON public.audit_schedules;
DROP POLICY IF EXISTS "Service role has full access to friction_analyses"   ON public.friction_analyses;
DROP POLICY IF EXISTS "Service role has full access to route_audit_results" ON public.route_audit_results;
DROP POLICY IF EXISTS "Service role has full access to verification_results" ON public.verification_results;

-- hub_submissions: KEEP the correctly-scoped service_role policies that
-- already exist; remove ONLY the two anon/public INSERT policies.
-- ⚠ CONFIRM BEFORE APPLYING: if any EXTERNAL system writes hub_submissions
--   directly via the public anon key (PostgREST), these are an intentional
--   ingestion path and must NOT be dropped. CARSI itself does not use them.
DROP POLICY IF EXISTS "Anon can submit to hub"        ON public.hub_submissions;
DROP POLICY IF EXISTS "hub_submissions_public_insert" ON public.hub_submissions;

-- ---------------------------------------------------------------------
-- TIER 2 (ERROR) — security_definer_view: agent_run_summaries.
-- Switch to security_invoker (runs with the querying role's rights, not
-- the view owner's) and strip anon/authenticated access.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='agent_run_summaries' AND c.relkind='v') THEN
    EXECUTE 'ALTER VIEW public.agent_run_summaries SET (security_invoker = true)';
    EXECUTE 'REVOKE ALL ON public.agent_run_summaries FROM anon, authenticated';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- TIER 3 (WARN, hardening) — pin search_path on the 19 flagged functions
-- (covers overloads via pg_proc loop). Pinned to `public, pg_catalog`
-- which matches current behaviour (extensions still live in public — see
-- the deferred section below), so no functional change.
-- ---------------------------------------------------------------------
DO $$
DECLARE r record;
DECLARE fns text[] := ARRAY[
  'update_updated_at_column','handle_new_user','match_documents',
  'cleanup_expired_evidence','notify_agent_run_status_change',
  'get_active_agent_runs','increment_memory_access','find_similar_memories',
  'prune_stale_memories','update_content_tsvector','hybrid_search',
  'aggregate_hourly_metrics','lms_handle_updated_at','lms_is_admin',
  'lms_is_instructor','lms_is_enrolled','lms_has_active_subscription',
  'handle_user_update','handle_user_delete'
];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname = ANY(fns)
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_catalog', r.sig);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- TIER 4 (WARN) — revoke EXECUTE on SECURITY DEFINER functions from the
-- public API roles (8 functions flagged for both anon + authenticated).
-- The app calls these server-side as postgres; PostgREST RPC by anon/
-- authenticated is not used. NOTE: these functions hold EXECUTE via the
-- implicit PUBLIC grant, so we must REVOKE FROM PUBLIC (revoking from anon/
-- authenticated alone is a no-op). postgres (owner) + service_role keep their
-- explicit grants, so the app and service-role access are unaffected.
-- ---------------------------------------------------------------------
DO $$
DECLARE r record;
DECLARE fns text[] := ARRAY[
  'get_active_agent_runs','handle_new_user','handle_user_delete',
  'handle_user_update','lms_has_active_subscription','lms_is_admin',
  'lms_is_enrolled','lms_is_instructor'
];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname = ANY(fns)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

COMMIT;

-- =====================================================================
-- DEFERRED — NOT in this migration (higher blast radius, do separately):
--   extension_in_public (pg_trgm, unaccent, vector). Moving these to a
--   dedicated `extensions` schema can break unqualified references in
--   functions/indexes (e.g. match_documents/hybrid_search use vector).
--   If done later, also add `extensions` to the Tier-3 search_path.
--
--   Performance advisors (729): mostly low priority — 199 unused_index,
--   365 multiple_permissive_policies (many resolve once the always-true
--   policies above are dropped), 39 unindexed_foreign_keys. Triage
--   separately; not security-blocking.
-- =====================================================================

-- ---------------------------------------------------------------------
-- POST-APPLY VERIFICATION (run read-only after applying):
--   -- expect 0 rows: public tables still without RLS
--   SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
--   WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity;
--   -- expect 0 rows: any remaining USING(true) policy granted to public/anon
--   SELECT tablename, policyname FROM pg_policies
--   WHERE schemaname='public' AND qual='true' AND roles && '{public,anon,authenticated}';
--   -- then re-run: GET /v1/projects/ofzafxvxobjggjisrbsa/advisors/security
--   -- expect security ERROR count 0, and the 70 → near-0.
-- ---------------------------------------------------------------------

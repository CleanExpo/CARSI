# Current State

> Updated: 17/03/2026 AEST

## Active Task

Staging branch merged into main. Ready to resume CARSI feature development.

## Completed This Session

- Committed local uncommitted changes (Stripe hardening, performance indexes, CI fixes)
- Merged origin/staging (21 commits) into main
- Resolved conflicts: podcast/page.tsx (took staging version), CLAUDE.md (kept main version)
- Renumbered Alembic migrations: 007_google_oauth_tokens→010, 008_performance_indexes→011
- Fixed lint errors: shared.ts→shared.tsx (JSX extension), unused provider param
- Migration chain now: 001→002→003→004→005→006→007→008→009→010→011

## New Features Available (from staging merge)

- Podcast Directory (`/podcast`, `routes/podcasts.py`)
- YouTube Channel Directory (`/youtube`, `routes/youtube.py`)
- News Feed (`/news`, `routes/news.py`, `apps/news-worker/`)
- Job Board (`/jobs`, `routes/jobs.py`)
- Industry Calendar (`/calendar`, `routes/events.py`)
- Research Articles CMS (`/research`, `routes/articles.py`)
- Professional Directory stub (`/professional-directory`)
- Centralised JSON-LD schema module (`apps/web/lib/schema/`)
- Next.js API proxy routes (LMS checkout, Stripe webhook, credential verification)

## Next Steps

1. Re-seed local database (carsi_dev is fresh — no seed data yet)
2. Continue CARSI feature development (check Linear for next phase)

## Last Updated

17/03/2026 AEST (session end)

---
description: Run the CARSI Verification Gate on a finished course and seed it into the database; record evidence and compound learnings.
argument-hint: --slug=<slug>
---

# /course-ship — verification gate + seed

The terminal stage: prove the course is correct and on-spec, then import it. **Never claim Done
on partial verification** (`docs/agent-framework/CARSI_VERIFICATION_GATE.md`,
`skills/verification/verification-first.skill.md`).

**Args:** `$ARGUMENTS`

## Procedure
1. **Validate the catalogue.** Confirm `data/seed/courses-catalog.json` passes `isCoursesCatalogFile`; the course slug is unique; every lesson has a non-empty `contentBody`; media URLs (thumbnail + per-lesson audio) are present where expected.
2. **Verification Gate — run and report honestly:**
   - `npm run type-check` — **mandatory**, always.
   - `npm run lint` — when source changed (e.g. the new voiceover script or `brand-video-assistant.ts` edits).
   - `npm run test:unit` — when `src/lib` changed.
   Paste failing output rather than summarising it away.
3. **Seed.** `npm run db:seed-courses` (needs `DATABASE_URL`). It upserts the course and replaces its modules/lessons. **If `DATABASE_URL` is absent, stop and report Blocked** — the catalogue change is committed but unimported; do not claim the course is live.
4. **Publish decision.** Leave `isPublished` false until the owner approves going live (the public `/courses` list and pricing are gated on it).

## Compound (close the loop)
- If a Linear MCP card exists for this course, update it with the evidence (gate output, seeded slug, asset URLs).
- If you discovered a durable rule (a quiz-shape gotcha, a brief-quality lesson), propose it into `docs/agent-framework/*` or a skill, and bump `skills/INDEX.md` "Last Updated".

## Output
The Verification Gate results, the seeded slug (or **Blocked** reason), and any compounding
follow-ups. This completes the `/course` loop.

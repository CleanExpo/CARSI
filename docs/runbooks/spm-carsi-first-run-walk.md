# SPM — CARSI first-run onboarding walk (GP-591)

Stranger → first course. Run this against **staging or local** with a fresh email each time.

## Preconditions

- Database migrated; at least one **published free** course (DECISIONS #21 target: `ozone-and-hydroxyl-generators-what-the-evidence-says` when live).
- Mail provider configured if you complete guest enrolment (welcome email).

## Walk (≈15 min)

1. **Landing** — Open `/`. Confirm hero says “IICRC CEC Accredited provider” (provider standing, not “7 IICRC disciplines”).
2. **Pathways** — `/onboarding` → redirects to `/pathways`. Heading: “A structured path, not a pile of courses”. Click **Courses** → `/courses`.
3. **Catalogue** — Filters update the list; pick a **free** course or cheapest paid course for the test.
4. **Register** — `/signup?next=/courses/<slug>` → `/register` with `next` preserved. Create account (unique email).
5. **Enrol** — Complete guest-free or paid checkout per course type; land in learner dashboard with enrolment visible.
6. **First lesson** — Open course; at least one lesson loads without 403.

## Automated coverage

- `src/lib/first-run-redirects.test.ts` — `/signup` and `/onboarding` redirects.
- `e2e/first-run-aliases.spec.ts` — register/pathways smoke.
- `e2e/spm-carsi-first-run.spec.ts` — stranger pathways → catalogue CTA.

## Done when

- Walk completed once on production-like env with notes (blockers filed as separate GP items).
- No step returns 403/500 for an entitled stranger path documented above.

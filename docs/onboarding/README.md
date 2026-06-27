# CARSI Maintenance Company Onboarding

> **Going live?** Start at [`HANDOFF.md`](./HANDOFF.md) — the operator runbook for seeding,
> smoke-testing, the access-control decision, publishing, and the deferred builds (subscription
> billing, company placeholders). It covers everything that must run against production.

The umbrella brand for CARSI Maintenance Company's staff onboarding programs. Each program inducts new
technicians, supervisors and facilities staff to a single standard for safe, professional, consistent
service delivery across sensitive sites — schools, childcare, education, public buildings, commercial
and high-traffic facilities.

## Programs

| Program | Folder | LMS course slug | Status |
| --- | --- | --- | --- |
| Professional Floor Care & Operational Readiness | [`floor-care/`](./floor-care/) | `floor-care-onboarding-operational-readiness` | Draft (publish via `floor-care/publish-runbook.md`) |

_More onboarding programs will sit under this brand as they are built._

## Commercial model

- **Pricing:** AUD **$1,295/month + GST**, **unlimited students** (organisation subscription).
- **What it covers:** organisation-wide access to the onboarding course(s) under this brand, no
  per-seat limit.
- **Provisioning:** organisation subscription — provisioned for the client, not sold via individual
  self-checkout. Recurring billing (Stripe subscription) is **not yet wired**; that is a separate build
  (the course is `isFree`/`$0` in the catalogue so the UI never shows a misleading one-off price or
  opens self-checkout). The real terms are recorded on the course in `meta.pricing`.

## Branding convention (for future onboarding courses)

So programs group cleanly under one brand, every CARSI Maintenance Company Onboarding course uses:

- **`title`** — `CARSI Maintenance Company Onboarding — <Program Name>`
- **`category`** — `CARSI Maintenance Company Onboarding` (the umbrella grouping)
- **`tags`** — include `CARSI Maintenance Company Onboarding` plus subject tags
- **`meta.brand`** — `CARSI Maintenance Company Onboarding`
- **`meta.company`** — `CARSI Maintenance Company`
- **`meta.pricing`** — the org-subscription terms (see the floor-care course for the shape)

> **Future:** once two or more onboarding courses exist, consider grouping them into a single
> `LmsLearningPathway` (seeded via the pattern in `scripts/seed-phase2-pathways-quizzes.ts`). A pathway
> is premature for one course, so the `category` + `meta.brand` convention is the umbrella for now.

## Guardrails (all programs)

Australian English; **no overclaiming** of accreditation, insurer recognition, or compliance authority,
and **no medical claims** — floor/site care **supports** hygiene, **reduces** soil load and **helps
manage** contaminants. The SDS/TDS and the relevant standard are always the authority over anything in
these docs.

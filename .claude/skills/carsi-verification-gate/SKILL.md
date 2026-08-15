---
name: carsi-verification-gate
description: Use before marking ANY code-modifying pass Done in CARSI, and whenever touching course copy, catalogue data, SEO/schema surfaces, or IICRC/CEC wording. Runs the licence-critical guard scripts (IICRC terminology, CEC approvals, designations, Australian English, standards claims) plus type-check, and reports pass/fail evidence rather than asserting success.
license: UNLICENSED
metadata:
  owner: CARSI
  risk: licence-critical
---

# CARSI verification gate

Run this before any pass is marked Done. `npm run type-check` is mandatory on every pass; the
rest scale with what was touched. Full rationale for each rule lives in
`docs/agent-framework/CARSI_VERIFICATION_GATE.md` — read it only when a check fails and you need
the *why*.

## Always

```bash
npm run type-check
```

## Scale with what changed

| You touched | Run |
|---|---|
| Any source file | `npm run lint` |
| Logic / lib | `npm run test:unit` |
| User-facing flows | `npm run test:e2e` |
| UI / markup | `npm run test:a11y` |

## Licence-critical guards — run whenever copy, catalogue data, schema or SEO surfaces changed

These protect CARSI's standing as an IICRC CEC provider. A failure here is a **release blocker**,
not a warning.

```bash
npm run check:iicrc-terminology   # "IICRC CEC Accredited" wording; never bare "IICRC Accredited"
npm run check:designations        # no WRT/ASD/AMRT/FSRT/CCT/TCST branding on CARSI courses
npm run check:cec                 # CEC hours come only from data/seed/cec-approvals.json
npm run check:cec-surfaces        # no CEC claims leaking onto unapproved surfaces
npm run check:iicrc-compliance
npm run check:standards-claims    # S-standard claims cited nominatively only
npm run check:au-english          # Australian English across content surfaces
npm run check:sources             # source citations present and resolvable
```

## Rules that no script catches — check by eye

1. **Auth on protected APIs.** Any new route under `app/api/admin/**` (or otherwise non-public)
   must load a session and return `401` before doing work. Public routes must be *intentionally*
   public.
2. **Bounded `findMany`.** New or edited Prisma list queries that grow with data must pass `take`,
   unless the set is provably small and fixed.
3. **New courses ship `cecHours: 0`.** In `data/seed/courses-catalog.json`. Only the founder flips
   a course to approved hours, and only after IICRC approval. Never rely on duration inference.
4. **`iicrcDiscipline: null`** on CARSI courses; the credential belongs in `meta.designation`.

## Reporting

Do not assert success. Paste the command and its actual exit output for every check you ran, and
state explicitly which checks you skipped and why. If a licence-critical guard fails, stop and
report — do not work around it.

---
name: carsi-verification-gate
description: Verifies a CARSI pass before it is marked Done — required for any code-modifying pass, and for any change to course copy, catalogue data, SEO/schema surfaces, or IICRC/CEC wording. Runs type-check plus the licence-critical guard scripts (IICRC terminology and compliance, CEC approvals and surfaces, designations, Australian English, standards claims, source citations), carries the six mandatory manual rules from CARSI_VERIFICATION_GATE.md that no script can catch, and reports pass/fail evidence rather than asserting success.
license: UNLICENSED
metadata:
  owner: CARSI
  risk: licence-critical
---

# CARSI verification gate

Run this before any pass is marked Done. `npm run type-check` is mandatory on every pass; the
scripted checks scale with what was touched.

**`docs/agent-framework/CARSI_VERIFICATION_GATE.md` is the authority, and every code-modifying
pass must apply all six of its manual rules.** `docs/AGENTS.md` requires it. This skill is an
index over that checklist, never a replacement for it — four of the six rules (raw-SQL
interpolation, leaked `error.message` in 5xx, upload content sniffing, paid/AI entitlement
gating) cannot fail any script, so an agent that only reads this file when a script fails would
never apply them at all.

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
| Course records, CEC eligibility, DTOs, rendering, raw CEC fields or `iicrcDiscipline` — **even in pure source/logic** | the full licence-critical block below |

## Licence-critical guards

Run these whenever copy, catalogue data, schema or SEO surfaces changed — **and whenever a
source-only change touches course records, CEC eligibility, DTOs, rendering, raw CEC fields or
`iicrcDiscipline`.** A logic change alone can create the leak: a function deriving CEC
eligibility from `iicrcDiscipline` is caught by `check:cec-surfaces` and by nothing else, so
"it was only logic" is not a reason to skip this block.

These protect CARSI's standing as an IICRC CEC provider. A failure here is a **release blocker**,
not a warning.

```bash
npm run check:iicrc-terminology   # "IICRC CEC Accredited" wording; never bare "IICRC Accredited"
npm run check:designations        # no WRT/ASD/AMRT/FSRT/CCT/TCST branding on CARSI courses
npm run check:cec                 # CEC hours come only from data/seed/cec-approvals.json
npm run check:cec-surfaces        # no CEC claims leaking onto unapproved surfaces
npm run check:iicrc-compliance
npm run check:standards-claims    # repository scan — the mechanical FLOOR, not the full gate.
                                  # It does not catch an uncited standards claim in new brand
                                  # copy; see the pre-publish gate below.
npm run check:au-english          # Australian English across content surfaces
npm run check:sources             # ADVISORY scorecard: classifies cited domains by tier and
                                  # reports an authority ratio. It exits 0 on warnings, performs
                                  # no network resolution, and does not require a citation to be
                                  # present. Read its output; never treat exit 0 as "sources are
                                  # verified". Pass --enforce to fail on unvetted domains.
```

## Pre-publish gate — any brand copy that names a standard

`check:standards-claims` scans the repository. It will **not** stop new copy asserting what a
standard requires. Before such copy publishes on ANY surface (course, blog, social, email), run
the strict text gate on the copy itself:

```bash
npm run verify:standards-claim -- "<the exact copy>"
```

Positive control — the strict form exits 1 on an uncited claim that the repository scan lets
through. Canonical failing cases live in `scripts/check-standards-claims.test.mjs`; take one
from there and pass it via `--text` to prove the gate still bites before you trust a green run.

> Scope note: `SCANNED_DIRS` is `app/ src/ templates/ docs/marketing/ docs/content/
> public/courses/` — `.claude/` is **not** among them, so this file is never scanned and a green
> `check:standards-claims` says nothing about it. If that scope ever widens, add this SKILL.md to
> `EXEMPT` in the script, as `CLAUDE.md` already is, since both only *describe* the rule.

A positive claim must cite a section that exists in the licensed index (`lib/standards`), never a
scrape and never an absence claim. The gate is a FILTER, not a guarantee: a regex cannot verify a
standard's content, so a standards claim in brand copy is an L2 irreversible-reputation action
that **also requires human sign-off**. Never publish it on an un-gated autonomous action. This
rule exists because of the 2026-07-15 false-claim incident; CLAUDE.md is the authority.

## Rules that no script catches — check by eye

All six mandatory rules from `docs/agent-framework/CARSI_VERIFICATION_GATE.md`. No script can
fail on any of them, so each must be checked deliberately on every code-modifying pass.

1. **Auth on protected APIs.** Any new route under `app/api/admin/**` (or otherwise non-public)
   must load a session and return `401` before doing work. Public routes must be *intentionally*
   public.
2. **Bounded Prisma `findMany`.** New or edited list queries that grow with data must pass
   `take`, unless the set is provably small and fixed.
3. **No raw-SQL string interpolation.** Never build SQL by concatenating or interpolating
   values; use parameterised queries.
4. **No leaked `error.message` in 5xx responses.** Return a generic message to the client and
   log the detail server-side.
5. **Upload validation by content sniffing**, not the declared MIME type alone.
6. **Subscription / credit / Stripe gating on paid and AI actions.** A paid or AI-billable path
   must verify entitlement before doing the work.

Two CARSI data rules on top of those six:

7. **New courses ship `cecHours: 0`** in `data/seed/courses-catalog.json`. Only the founder
   flips a course to approved hours, and only after IICRC approval. Never infer from duration.
8. **`iicrcDiscipline: null`** on CARSI courses; the credential belongs in `meta.designation`.

## Reporting

Do not assert success. Paste the command and its actual exit output for every check you ran, and
state explicitly which checks you skipped and why. If a licence-critical guard fails, stop and
report — do not work around it.

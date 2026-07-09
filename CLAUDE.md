@../Unite-Hub/.portfolio/PORTFOLIO.yaml

## Identity (SSOT)
**Canonical name:** CARSI
**Aliases:** "Online Training LMS"
**Canonical local path:** `D:$canon`
**GitHub:** `CleanExpo/CARSI`

> Registry: see `D:\Unite-Hub\.portfolio\PORTFOLIO.yaml` (single source of truth)

---# CLAUDE.md

Project-specific guidance for CARSI.

## Compound Engineering loop

Autonomous and semi-autonomous work follows the continuous ship loop in
`docs/agent-framework/COMPOUND_ENGINEERING_LOOP.md` (Plan → Work → Review →
Compound → Kanban movement). Every code-modifying pass must pass the
`docs/agent-framework/CARSI_VERIFICATION_GATE.md` checklist, and `npm run
type-check` is mandatory before any pass is marked Done.

## Course production — Australian-produced (MUST)

**Every CARSI course, module, lesson, quiz, trailer and piece of course marketing is
Australian-produced. This is non-negotiable.** CARSI operates in the Australian market:
Australian English spelling (odour, colour, metre, mould, licence/practise, -ise), Australian
power (**230 V / 50 Hz, 10 A GPO, RCD/safety switch, AS/NZS** — never 115 V / US 15 A circuits),
**metric units** (metres, m², litres, m³/h — imperial only in parentheses), products **available
in Australia** in 240 V form (with a dated availability check), **AS/NZS + Safe Work Australia**
standards (IICRC framed in the AU context), and **AUD** pricing. US/UK spelling, voltages, or
US-only products are defects — fix before publish. Full standard + checklist:
`.claude/skills/carsi-course-production/SKILL.md` (invoke it for any course work).

## IICRC CEC terminology — licence-critical (MUST)

**CARSI is accredited as an IICRC CEC provider — it is not accredited to deliver IICRC courses or
certification.** In any public, marketing, SEO, schema, email or in-app selling copy, describe
what CARSI offers as "IICRC CEC Accredited courses" / "IICRC CEC Accredited" / "IICRC
Continuing Education Credit (CEC) courses". The word "Accredited" must always appear together
with "CEC" (e.g. "IICRC CEC Accredited") — **never** bare "IICRC Accredited" and **never**
"IICRC Course Accredited" / "IICRC-accredited course(s)", both of which wrongly imply IICRC
accredits the course or certification itself rather than CARSI's standing as a CEC provider.
**Never** write copy implying CARSI delivers "IICRC courses", "IICRC certification course(s)",
"IICRC-certified course(s)", or "get IICRC certified with CARSI". Also avoid bare "IICRC
[discipline] training" (e.g. "IICRC FSRT training") or "[discipline] certification covers…" when
describing CARSI's own course content — use "[discipline]-aligned CEC training" instead, so it's
clear CARSI's course aligns to the discipline rather than being the IICRC certification. IICRC
certification is obtained only through IICRC-approved schools and examinations — CARSI courses
earn CECs toward maintaining an existing IICRC certification. Referencing a student's own
existing IICRC certification (recert reminders, member number, CEC tracking) and discipline
descriptors like "WRT/ASD/AMRT-aligned" are fine. Selling CARSI as delivering IICRC certification
can cost the licence to sell courses — treat it as a release blocker. Enforced by
`npm run check:iicrc-terminology`.

**CEC hours require per-course IICRC approval (founder directive 2026-07-09).** A course may only
show CEC hours (badge, filter, schema, marketing, video/infographic frames) after it has been
submitted to and approved by the IICRC — the founder confirms this per course. Every NEW course
MUST ship with `cecHours: 0` in `data/seed/courses-catalog.json` (the explicit "not CEC-approved"
opt-out; `resolveCecHours` then never derives a value from duration/prose/meta). Only the founder
flips a course to its approved hours. Never rely on the legacy duration-derived fallback for new
content — deriving a CEC claim for an unapproved course is a licence-critical defect.

## IICRC / CEC — root cause + enforcement (systemic, applies to every future course/project)

Two incidents recurred: (1) IICRC/S-standard/CEC framing templated onto courses that are **not**
IICRC-related (the CCW truckmount course), and (2) specific CEC-hour claims rendered for courses
the IICRC has not approved (22 of 25 catalogue courses, via duration inference). Both share one
root cause: **IICRC/CEC framing was fail-OPEN — present by default and removed by exception.** The
standing fix inverts that to **fail-CLOSED — absent by default, added only by explicit approval:**

- **CEC is fail-closed.** `resolveCecHours` / `resolveCatalogCecHours` / `resolveLmsCourseCecHours`
  return CEC hours ONLY for an explicit, founder-set positive `cecHours`. There is no fallback to
  duration, prose, meta or reviewer/professional assignment. Absence of an approval yields **no
  CEC**, never a derived one. Do not re-introduce any inference path.
- **IICRC framing is opt-in per course.** Reference IICRC, an S-standard, or CEC hours only on a
  course that genuinely maps to an IICRC discipline. Non-restoration courses (vehicle/truckmount,
  floor-care, facilities/biosecurity, admin, product training) carry **no** IICRC/S-standard/CEC
  content; if a disclaimer is needed, write "not IICRC CEC accredited" (never the bare literals
  "IICRC-accredited course" / "IICRC certification course", even when negated).
- **Two CI guards enforce this — do not weaken them.** `npm run check:iicrc-terminology` (narrow
  selling-phrase guard) and `npm run check:iicrc-compliance` (the backstop: scans all course-content
  and marketing surfaces — `data/seed`, `public/courses`, `docs/marketing`, `docs/content` — for
  stray IICRC placements, banned "IICRC-approved"/"certified with CARSI" phrasing, and unapproved
  CEC-hour claims). A specific CEC-hour claim only passes once the founder adds the slug to
  `CEC_APPROVED_SLUGS` in `scripts/check-iicrc-compliance.mjs`. Fix a false positive by tightening
  the rule's allow-list, never by disabling the rule.

## Continual Learning

This repo emits signal to `.harness/learning/*.jsonl` for the weekly distillation routine (RA-1745). If you notice something the system should learn from, append a structured entry — do not stop work to reason about meta-rules. Schema and consumer per RA-1745.

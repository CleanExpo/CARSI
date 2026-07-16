<!-- Unite-Hub (CleanExpo/Unite-Hub) held the cross-repo portfolio registry; decommissioned 2026-06-20. No active replacement registry is wired here. -->

## Identity (SSOT)
**Canonical name:** CARSI
**Aliases:** "Online Training LMS"
**Canonical local path:** `D:$canon`
**GitHub:** `CleanExpo/CARSI`

> Registry: previously `D:\Unite-Hub\.portfolio\PORTFOLIO.yaml` (single source of truth); Unite-Hub decommissioned 2026-06-20, no active replacement wired here.

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
"IICRC-certified course(s)", or "get IICRC certified with CARSI".

**CARSI designation rule (founder 2026-07-10 — MUST).** CARSI issues its OWN credentials — the
**CARSI Southern Hemisphere Restoration Designations** (e.g. "CARSI Water Restoration Practitioner",
"CARSI Mould Remediation Practitioner") — the way the RIA issues its own designations rather than
teaching IICRC's. CARSI courses are therefore **never** branded with IICRC Registered-Training-School
discipline **designations/acronyms** (WRT/ASD/AMRT/FSRT/CCT/TCST) and **never** described as
"[discipline]-aligned". Set `iicrcDiscipline: null` and carry the credential in `meta.designation`.
You MAY still *reference* an IICRC discipline/certification third-person (e.g. "FSRT is an IICRC
certification covering…", a student's own recert / member number / CEC tracking), and you MAY cite an
IICRC S-standard **nominatively** ("aligned to ANSI/IICRC S500") — only using an IICRC discipline
acronym to name/brand a CARSI course is banned. The dual value stays: a CARSI designation that **also
earns IICRC CECs**. IICRC certification is obtained only through IICRC-approved schools and
examinations — CARSI courses earn CECs toward maintaining an existing IICRC certification. Selling
CARSI as delivering IICRC certification
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
  return CEC hours ONLY from the CEC approvals registry (`data/seed/cec-approvals.json` — the SSOT,
  one entry per IICRC-confirmed approval, validated by `npm run check:cec`) or an explicit,
  founder-set positive `cecHours`. There is no fallback to duration, prose, meta or
  reviewer/professional assignment (those branches were deleted 2026-07-09). Absence of an approval
  yields **no CEC**, never a derived one. Do not re-introduce any inference path. Submission packs
  for per-course approval: `npx tsx scripts/generate-cec-submission.ts <slug>`.
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

## IICRC standards IP + AI use — prohibited (MUST)

Per the IICRC's published AI Use Policy and copyright terms on its official standards store
(iicrc.gilmoreglobal.com), and its brand/trademark enforcement:

- **Never feed IICRC standard text into any AI tooling.** The IICRC prohibits entry of its
  standards and related intellectual property into any form of AI tool, and prohibits creating AI
  derivatives of its published and draft standards. This binds every CARSI content pipeline
  (course-asset-kit, AI course creation, prompt contexts, RAG/embedding corpora) — violation risks
  access suspension and legal action against the licence holder.
- **Never reproduce standard text beyond a brief, attributed reference.** Standards are
  copyright-protected and not printable ("printing limited to small sections for reference only").
  Courses may reference a standard nominatively ("aligned to ANSI/IICRC S500:2021") — never paste
  its sections, tables or procedures. The course-kit excerpt heuristic
  (`src/lib/course-kit/standards-excerpt.ts`, `scanCourseForStandardExcerpts`) flags suspected
  pasted standard text at scaffold time — treat a hit as a release blocker until cleared.
- **Never use IICRC logos or marks without written permission.** The "IICRC" wordmark is
  nominative-use only; logo rights attach to Certified Firms/Registrants under signed agreements,
  and the IICRC publicly enforces violations (its "Invalid Firms" list). CARSI currently uses no
  IICRC mark — keep it that way unless the founder holds written permission.

## Continual Learning

This repo emits signal to `.harness/learning/*.jsonl` for the weekly distillation routine (RA-1745). If you notice something the system should learn from, append a structured entry — do not stop work to reason about meta-rules. Schema and consumer per RA-1745.

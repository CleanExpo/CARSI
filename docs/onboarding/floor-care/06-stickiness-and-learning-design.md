# Stickiness & Learning Design — Maintenance Onboarding as a Must-Have

> How the CARSI Maintenance Company Onboarding subscription (AUD $1,295/month + GST, unlimited
> students) becomes a **must-have** for the client company, not a nice-to-have — by turning a
> "watch-and-finish" course into a **verified-competency + training-records system** woven into the
> company's compliance, hiring and client obligations. Australian-produced throughout
> (see `.claude/skills/carsi-course-production/SKILL.md`).

## The four must-have hooks (founder-approved)

1. **Compliance & training-records backbone** — the subscription holds each company's staff
   competency records, WHS/SDS training evidence and supervisor sign-offs. Cancelling = losing the
   audit trail they need for insurance, WHS due-diligence, and school/childcare/aged-care contract
   compliance. *Strongest B2B lock-in.*
2. **Client-facing "CARSI-certified staff" credential** — certified staff the company markets to win
   and keep contracts. Cancelling = losing the credential they sell on.
3. **Continuous fresh content (monthly)** — Toolbox Talks + seasonal/regulatory refreshers keep the
   subscription delivering new value, not a one-off course.
4. **Operational embedding** — every new hire is onboarded through it (high turnover = constant
   need); supervisors track progress/gaps; it's woven into daily ops.

## Learning methods layered into the course
- **Retrieval practice** — a Knowledge Check on every module (drives the records + recall).
- **Scenario-based decisions** — a realistic Australian site dilemma per module ("a class is due in
  and the floor's just been sealed…") — the biggest engagement lift.
- **Practical demonstration + supervisor sign-off** — competence, not attendance; verified on a real
  or mock job; evidence recorded.
- **Role-based pathways** — new-starter vs supervisor, mapped to the 30/60/90-day pathway.
- **Microlearning / spaced repetition** — Toolbox Talks (5-minute refreshers), dripped monthly.
- **Capstone competency assessment** — Module 12, end-to-end, gates the certificate.

## Built into the course now (content, via admin)
- All 12 modules rebuilt to full program depth: Learning objective · Why it matters · Key lessons ·
  **Scenario** · Practical demonstration · **Knowledge Check** · **Supervisor sign-off & evidence**,
  from `01-module-structure.md` + `03-assessment-framework.md` + `standards/` + `checklists/`.
- Pass standards surfaced (80–90%; safety/reputation-critical = 100% on critical items;
  automatic-fail acts named).
- Role framing + the 30/60/90 pathway surfaced in Module 1.
- **Toolbox Talks** first batch (microlearning) — a companion stream, built as an increment.

## Platform roadmap (needs engineering — the deeper lock-in)
| Feature | Hook served | Notes |
|---|---|---|
| Graded quizzes (`LmsQuiz`/`LmsQuizQuestion`) wired to each module's Knowledge Check | 1 | Reuse `scripts/seed-floor-care-quizzes.ts` pattern; makes completion gating + records real |
| Per-company **training-records dashboard + export** (who's completed what, dates, assessor, pass %) | 1 | The compliance/audit/insurer artefact — the core cancel-cost |
| **CARSI-certified** credential + shareable badge + public verification page | 2 | Issued on Module-12 capstone pass |
| **Monthly Toolbox-Talk drip** + reminders/notifications | 3 | Turns the sub into recurring value |
| **Supervisor dashboard** (team progress, gaps, sign-off queue) + new-hire auto-enrolment | 4 | Operational embedding |
| **Recertification** expiry tracking + refresher prompts | 1,3 | Recurring compliance need |

## Success measure
The client company can't confidently prove its floor-care staff are trained/competent for insurers,
auditors, or school/childcare/aged-care contracts **without** the subscription — and its supervisors
run onboarding and daily competency through it. That is the shift from would-like-to-have to
must-have.

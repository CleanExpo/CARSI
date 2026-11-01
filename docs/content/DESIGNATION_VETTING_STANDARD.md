# CARSI Designation Vetting & Quality-Assurance Standard

**Status:** v0 draft, 2026-11-01. Owner: founder. The bar every **CARSI Southern Hemisphere
Restoration Designation** course clears so it can **stand up to any scrutiny** and be built to a
standard that could **earn formal registration** if and when that path is pursued.

This sits on top of `docs/content/COURSE_STANDARD.md` (structure + the 14 depth floors) and the
`carsi-course-production` skill (Australian production + licence). Course Standard v1 proves a
course is *deep and well-formed*; **this standard proves it is *true, defensible and vetted*.**

## Principle — build the substance, claim only what's earned

CARSI's strength is its **own** designations and catalogue, built on research deep enough to
survive challenge. Two claim disciplines bind this whole standard:

- **IICRC/peer bodies:** CARSI is an **IICRC CEC Accredited provider**; it is not positioned as
  replacing or outranking IICRC/RIA/ISSA/IAQ. Lead by depth ("beyond the standard"), never rivalry.
- **"Registered" is a regulated status.** In the Australian VET system these are distinct steps:
  **ASQA (or a state course-accreditation body) accredits a course**, and a **Registered Training
  Organisation (RTO) that holds the course in its scope delivers the training and issues the
  nationally recognised qualification or statement of attainment**. We may build a course *to a
  standard that could support* accreditation and RTO delivery, but **no public, marketing or course
  copy claims "registered", "nationally recognised", "RTO" or "accredited qualification" until that
  status is actually held or granted.** Until then the credential is the **CARSI designation**
  which is **approved for IICRC CECs** only where that specific course is recorded in the approvals
  registry.

## The five vetting stages

A designation course is "vetted" only when all five are evidenced, with a receipt kept in the
course's `data/courses/<slug>/vetting/` folder. Reuse the existing engines — do not rebuild them.

| # | Stage | What it means | Reuse |
| --- | --- | --- | --- |
| 1 | **Deep research** | Every substantive claim traces to a **primary source** — peer-reviewed literature, published science, a named AU/international standard (nominative), or a regulator record. Discovery tools (e.g. Google Scholar) help *find* sources but are never cited *as* the source; the evidence receipt cites the underlying paper/standard/regulator. No trade-press paraphrase as a basis for a published claim. | `deep-research` skill; the Evidence Engine ingest + A1–C3 grades (BACKLOG #21–28) |
| 2 | **Cross-research** | Each key claim is corroborated by **≥2 independent** sources; disagreements are surfaced and resolved, not hidden. Each claim resolves with an evidence receipt to **VERIFIED or JUSTIFIED** — a **GAP is non-passing**: it must be rewritten, removed or substantiated before go-live, never shipped. | `course-truth` skill; `check:sources` |
| 3 | **Cross AU / International quality & skills check** | The course is mapped against both the **Australian** frame (AS/NZS, Safe Work Australia, state regulators) **and** the relevant **international** reference (e.g. nominative ANSI/IICRC S-standards, ISO) — agreements and the AU-specific deltas both stated. Skills/competencies are mapped explicitly. | Course Standard v1 `australian` floor; standards section indexes (`lib/standards/*`) |
| 4 | **Industry peer challenge** | A qualified **SME / practitioner** adversarially reviews the course for correctness and real-world defensibility — "would this survive a challenge from a senior tech, a builder, an insurer, or a regulator?". Findings tracked to closure. | SME sign-off (already gated); `persistent-subagents` adversarial review where available |
| 5 | **Full vetting & sign-off** | All standards-claim gates pass; every claim has its receipt and resolves to VERIFIED/JUSTIFIED (no open GAP); peer-challenge findings are closed; founder signs off. Only then does the course carry its designation live. | `verify:standards-claim`, `check:iicrc-*`, `check:cec`, `check:cec-surfaces` (structural CEC-leak backstop), Course Standard v1 audit (`check:course-standard`), founder gate |

## Registrability pathway (goal, not a claim)

Building to stages 1–5 is what makes a course *registrable-ready*. Pursuing formal registration
(ASQA/VET accreditation, or recognition by another body) is a **separate, founder- and
legal-gated** project — scoped when the catalogue and evidence base justify it. It is captured as a
BACKLOG Discovery, not started here. **Nothing about registration is claimed publicly until
granted.**

## What ships vs what is gated

- **Ships (per course):** the vetting receipts in `data/courses/<slug>/vetting/`, the evidence
  layer in the lessons, and the CARSI designation — once stages 1–5 are complete and signed off.
- **Gated:** SME/peer review, founder sign-off, any CEC claim (per-course IICRC approval), media
  spend, seeding, publishing, and any pursuit of formal registration.

## Guards that enforce the claim disciplines

`check:iicrc-terminology`, `check:iicrc-compliance`, `check:cec`, `check:cec-surfaces`,
`check:cec-course-brand`, `verify:standards-claim`, `check:au-english`, and `check:course-standard`.
Absence claims about a
standard remain **banned**; positive claims cite a section that exists in the licensed index; and
no IICRC standard text is ever entered into any AI tool (IICRC AI-use policy).

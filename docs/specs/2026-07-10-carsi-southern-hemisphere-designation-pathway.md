# SPM Spec — CARSI Southern Hemisphere Restoration Designations: Data Model, Learner Pathway & Separate UX

**Status:** DRAFT — awaiting founder approval to build Phases 2–4
**Date:** 2026-07-10 · **Owner:** Phill McGurk (founder) · **Author:** Claude (Opus 4.8)
**Depends on:** Phase 1 (PR #538 — de-IICRC catalogue + CARSI designations + guard) — merged
**Linear:** GP-465 (epic) + new tickets to be cut per phase

---

## Executive Read (start here)

- **Decision:** Build CARSI its own **designation experience** — a learner *pathway* (roadmap to a credential) with its own screens, distinct from today's flat course grid. This is what turns "a list of courses" into "a credential program people enrol in and complete".
- **Why it matters:** The RIA and IICRC don't sell courses — they sell *designations* people put after their name and employers recognise. Phase 1 gave us the credentials (CARSI Water Restoration Technician, etc.). Phases 2–4 give them somewhere to *live* and a journey learners follow to earn them — the difference between a training catalogue and a recognised credentialing body.
- **Risk:** Low-to-moderate. All new, additive, and shipped behind a feature flag on **draft** data — nothing public changes until you flip it. The one real cost is build effort (a genuine frontend project), which is why it's spec-first.
- **What I'd do next:** Approve Phase 2 (data model — small, safe, unlocks everything). Review the pathway UX mock in Phase 4 before I build the screens. Everything stays founder-gated for publish.
- **Our divergence from the obvious:** The obvious move is "reskin the course grid into groups." We're **not** doing that — a designation is a *journey with a defined end state (the credential)*, and grouping a grid doesn't create that. The pathway model is the defensible choice; the reskin looks similar but doesn't deliver a credential experience.

---

## 1. Task being planned

- **Original request (founder, 2026-07-10):** "We need to be building our own (Like RIA) Designation Courses generated and created for the Southern Hemisphere" and "We are building a separate and our own User Experience and Pathway."
- **Interpreted task:** Stand up the product layer for CARSI's own credential program: (a) a data model that represents designations and the pathway to earn them; (b) a learner pathway/roadmap; (c) a separate designation-led UX distinct from the existing course grid.
- **Target outcome:** A learner can discover a CARSI designation, see the path to earn it, progress through it, and receive the CARSI credential (which also earns IICRC CECs) — as a first-class experience, not a filtered course list.

## 2. Current context

- **Repo:** CARSI (`main = prod`, DO deploy-on-push). Next.js App Router, Prisma, existing LMS (courses, modules, lessons, quizzes, enrolments, credential verification at `/verify/credential/[credentialId]`).
- **Phase 1 shipped (PR #538):** 11 flagship courses carry `meta.designation` + `meta.designationProgram`; `iicrcDiscipline` null catalogue-wide; enforcement guard live.
- **Already exists (reuse, don't rebuild):** enrolment + progress tracking, quiz engine + pass logic, credential issue + public verify page, course-asset kits, `CourseTextThumbnail`.
- **Unknown / to confirm during build:** exact enrolment→completion schema fields; whether credentials are per-course today or can be raised to per-designation.

## 3. Problem statement

- **User (two):** (1) restoration technicians/companies in AU/NZ who want a recognised local credential; (2) the founder, who needs CARSI to read as a *credentialing body*, not a course shop.
- **Pain:** Today the site is a flat course catalogue; there is no "designation" a learner works toward, no roadmap, no sense of a program. The credential is a by-product of finishing one course.
- **Why now:** Phase 1 created the designations; without a pathway/UX they're just longer course titles.

## 4. Desired outcome

- **Learner-facing:** "Earn the CARSI Water Restoration Technician designation" → a clear pathway (what to complete, where you are, what's left) → completion → CARSI credential + IICRC CECs.
- **System:** designations are first-class entities with an ordered pathway of courses/steps; progress rolls up to the designation; credential issues at designation completion.
- **Must not happen:** no publish of drafts without founder go; no CEC-hour claims without per-course IICRC approval; no IICRC discipline acronyms reintroduced (guard enforces).

## 5. Scope

**In scope (Phases 2–4)**
- Phase 2 — Designation **data model**: a `designations` definition (slug, name, program, description, ordered `pathwaySteps[]` referencing course slugs, completion rule, credential template) + rollup of learner progress to designation level.
- Phase 3 — **Learner pathway**: roadmap view + "you are here" progress + next-step CTA + designation completion → credential issue.
- Phase 4 — **Separate designation UX**: designation index ("Designations" surface), designation detail/landing page, enrolment into a designation (not just a course), designation-aware credential + verify.

**Out of scope (now)**
- Tiered ladders (Foundational→Advanced→Master) — founder chose single-tier for launch.
- Post-nominal letters — founder chose full-word designations.
- Paid pricing/checkout changes (courses remain free/internal until founder decides).
- Migrating older WP-import courses into designations (Phase 1 only de-IICRC'd them).

**Assumptions**
- Single designation per discipline (as decided). Dual framing "CARSI designation + earns IICRC CECs" (as decided).
- Designations map to the 9 flagship credential courses; Asbestos Awareness + Psychrometry are supporting (no standalone designation).

**Constraints**
- `main = prod`; ship behind a feature flag; drafts stay `isPublished:false`, `cecHours:0`.
- Prod DB unreachable locally — data changes via founder's authed admin session or seed→PRE_DEPLOY.
- No IICRC standard text into AI / no reproduction (AI Use Policy).

## 6. Existing capability review

| Capability | Location | Reuse? | Notes |
|---|---|---|---|
| Enrolment + progress | LMS core | Yes | Roll up per-course progress to designation |
| Quiz + pass (80%/3 attempts) | quiz engine | Yes | Unchanged |
| Credential issue + verify | `/verify/credential/[id]` | Yes | Extend to designation-level credential |
| Course thumbnails | `CourseTextThumbnail` | Yes | Reuse for designation cards |
| Designation fields | `meta.designation*` (Phase 1) | Yes | Promote from meta → first-class model |

## 7. Specialist board (condensed)

| Lens | Finding | Recommendation |
|---|---|---|
| Product | Designation = the sellable unit; pathway is the retention loop | Build pathway, not a grid reskin |
| Architect | Reuse enrolment/credential; add a thin designation layer over course slugs | Avoid a parallel content system |
| UX | Roadmap + "you are here" + single next-step CTA is the core | Prototype the pathway view before coding screens |
| Security | Credential issuance must be tamper-evident; verify is public | Keep issuance server-side; sign credential id |
| QA | Progress rollup + completion edge cases (partial, re-attempt) | Unit-test rollup; stress partial/duplicate completion |
| Devil's advocate | Could a grouped grid suffice? | No — no credential journey; but ship flagged + small |

## 8. Judge challenge

| Category | Score | Notes |
|---|---:|---|
| First-source evidence | 22/25 | Built on shipped Phase 1 + existing LMS |
| Clear user/business problem | 19/20 | Credentialing body vs course shop |
| Reuse of existing capability | 14/15 | Enrolment/credential reused |
| Security/privacy | 13/15 | Credential integrity to design |
| UX clarity | 9/10 | Needs the pathway mock approved |
| Testability | 9/10 | Rollup + completion testable |
| Cost/control simplicity | 4/5 | Real frontend build; phased + flagged |
| **Total** | **90/100** | **APPROVE BUILD — phased, flag-gated, pathway mock approved before Phase 4 screens** |

## 9. Proposed solution (phased)

- **Phase 2 — Data model.** Add a `data/seed/designations.json` (definition SSOT) + typed loader; each designation = `{slug, name, program, summary, pathwaySteps:[{courseSlug, order, required}], completionRule, credentialTemplate}`. Add progress-rollup helper (given a learner, compute designation % + completed steps). No UI. Unit-tested. **Flagged off.**
- **Phase 3 — Pathway.** A pathway component: ordered steps, per-step status (locked/available/in-progress/complete), "you are here", single next-step CTA; on all-required-complete → issue designation credential. Reuses enrolment/progress + credential issue.
- **Phase 4 — Separate UX.** `/designations` index; `/designations/[slug]` detail/landing (what it is, the pathway, "also earns IICRC CECs", enrol); designation-aware credential + verify page. Distinct visual system from the course grid.

**Failure/rollback:** feature flag off → the existing course grid is unchanged; designations invisible. Data is additive seed; revert = remove seed + flag.

## 10–14. UX / Technical / Security / Verification / Stress (summary)

- **UX states:** empty (no enrolment) → "Start the pathway"; in-progress → roadmap + next step; complete → credential + CEC note; error → graceful retry.
- **Technical:** new seed + loader + rollup lib + 3 routes + components; extend credential model to designation; no breaking changes to course routes.
- **Security:** credential issuance server-side only; signed/opaque credential id; public verify read-only; publish/flag founder-gated.
- **Verification (each phase):** `type-check`, `lint`, `test:unit` (+ new rollup/designation tests), `check:iicrc-terminology/compliance/cec`, `next build`; Phase 4 adds smoke on `/designations`.
- **Stress:** partial completion, re-attempt after fail, duplicate completion (idempotent credential), a designation with a missing/renamed course slug (fail-closed), learner with zero enrolments.

## 15. Acceptance criteria

- [ ] `designations.json` defines the 9 credential designations, each with an ordered pathway of real course slugs; loader is typed + validated.
- [ ] Progress rollup returns correct designation % for: none / partial / all-complete, and is idempotent on duplicate completion.
- [ ] Pathway view renders locked/available/in-progress/complete per step with one next-step CTA.
- [ ] Completing all required steps issues one CARSI designation credential (idempotent) and the verify page shows it, noting IICRC CECs.
- [ ] `/designations` + `/designations/[slug]` exist, are visually distinct from the course grid, and are gated behind the feature flag (off by default).
- [ ] All gates green; no IICRC discipline acronyms (guard); drafts stay unpublished / cecHours 0.

## 16. Goal command (after approval)

```
/execute-goal Implement the accepted spec docs/specs/2026-07-10-carsi-southern-hemisphere-designation-pathway.md, Phase 2 first (designation data model + progress rollup, unit-tested, flag-gated), then Phase 3 (pathway view + designation credential issue), then Phase 4 (/designations UX + verify), each phase its own PR. Completion: all §15 acceptance criteria checkable in code; gauntlet green (type-check, lint, test:unit incl. new rollup/designation tests, check:iicrc-*, next build). Constraints: feature-flagged off by default; no publish; drafts cecHours:0/isPublished:false; no IICRC discipline acronyms; no unrelated files; stop + /session-handoff if blocked on prod DB or founder-gated publish.
```

## 17. Implementation sequence

1. Phase 2 — data model + rollup (PR A). 2. Phase 3 — pathway + credential (PR B). 3. Phase 4 — UX + verify (PR C). Founder reviews the Phase 4 pathway mock before screens are built.

## 18. Session-handoff seed

Phase 1 merged (PR #538): catalogue de-IICRC'd, 11 CARSI designations live in `meta.designation`, guard enforces. Next: Phase 2 data model from this spec. Key files to create: `data/seed/designations.json`, designation loader + rollup lib, then `/designations` routes. Nothing published; all flag-gated.

## 19. Final recommendation

**Proceed to implementation, Phase 2 first** — small, safe, unlocks the program. Bring the Phase 4 pathway mock back for founder sign-off before building the screens.

`SPM spec complete. Next safe action: approve Phase 2 (designation data model) and I build it flag-gated.`

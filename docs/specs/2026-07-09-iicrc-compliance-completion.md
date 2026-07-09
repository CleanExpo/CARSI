# SPM Spec — IICRC Compliance Completion (research-backed)

**Date:** 2026-07-09 · **Status:** Spec only (no build authorised) · **Repo:** CleanExpo/CARSI @ `6be25c1b`
**Research method:** exa MCP web search + fetch of IICRC first sources (iicrc.org, iicrccecevents.com, iicrc.gilmoreglobal.com, restorationindustry.org). Every claim tagged.

## 1. Task being planned

- **Original request:** use the exa MCP + research to find the IICRC-compliance elements missing from CARSI's posture and spec what to include.
- **Interpreted task:** first-source-verify IICRC's actual published rules (CEC provider process, terminology, logo/trademark, standards copyright/AI policy), gap-analyse against CARSI's current controls (terminology guard, CLAUDE.md rule, CEC-hours display, course content), and spec the missing controls.
- **Target outcome:** a build-ready list of compliance elements with evidence, plus founder-decision items that engineering cannot settle.
- **Non-build clarification:** this spec authorises nothing; today's audit already confirmed 0 terminology violations — this is about the elements the audit could not check against IICRC's own rules.

## 2. Current project context

- Repo/branch: CleanExpo/CARSI, `origin/main` @ `6be25c1b` (worktree clean).
- Relevant systems: `scripts/check-iicrc-terminology.mjs` (guard), `src/lib/seed/cec-hours.ts` (derivation fallback, GP-498), `data/seed/courses-catalog.json` (prod copy seed, UNSCANNED by guard), `src/lib/course-kit/*` (AI course asset engine, GP-488), CLAUDE.md IICRC block, `carsi-course-production` skill.
- Known behaviour: 71/80 live course pages show derived CEC hours (2026-07-09 crawl); Bird Flu shows 0 (explicit opt-out, #500/#514).
- Unknowns: which courses hold genuine IICRC approval (founder data, GP-498); whether WP-era lesson bodies reproduce IICRC standard text verbatim.

## 3. Problem statement

- **User:** the founder (licence holder) + every prospective student reading CARSI claims.
- **Pain:** CARSI's compliance rules were written from the founder's knowledge, never verified against IICRC's published rules; the audit flagged gaps (unscanned catalog, derived hours, possible verbatim excerpts) with no first-source rulebook to test against.
- **Business impact:** CEC-provider standing is the licence the business runs on; a rule we never read can still revoke it.
- **Why now:** today's CEC directive + audit exposed the posture; the H5 campaign is about to raise CARSI's public visibility.

## 4. Desired outcome

- Every IICRC-facing claim, display, and content pipeline traceable to a first-source IICRC rule or an explicit founder decision.
- CEC hours displayed only from a recorded approval; a repeatable per-course submission pack matching IICRC's own checklist.
- Standards IP (copyright + AI policy) constraints encoded where content is produced.
- **Must not happen:** silent claim drift (guard gaps), AI pipelines ingesting IICRC standard text, implying School/Instructor status or IICRC endorsement.

## 5. Research findings — the missing elements (all first-source)

**R1 — CARSI's provider standing is verifiable first-source.** [VERIFIED] "CLEANING AND RESTORATION SCIENCE INSTITUTE (CARSI)" appears in the IICRC's official CEC Provider Directory AND its Online CEC Training list (iicrccecevents.com). Nothing on-site cites this today — it is CARSI's strongest legitimate trust signal.

**R2 — CEC approval is per-course with a published submission checklist.** [VERIFIED] IICRC manages CEC course approval via `CECCourse@iicrcnet.org`; required submission: provider name & website, course title, dates & duration, summary & learning objectives, instructor, point of contact, supporting documentation (restorationindustry.org describing the IICRC-managed process; iicrc.org FAQ: "I want to be a CEC provider → contact ceccourse@iicrcnet.org"). Confirms the founder's per-course directive and gives the exact pack to generate.

**R3 — CEC arithmetic is published.** [VERIFIED] 1 CEC = 1 educational/contact hour; technicians need 14 CECs per 4 years (Master/Inspector: per 2 years); max 14 total, training capped at 7 CECs/day in the MRS accepted list (iicrc.org FAQ + /accepted-cecs/). → Displayed hours must be whole numbers ≤ educational hours; any recert copy CARSI publishes must match these numbers.

**R4 — IICRC publishes a provider-content disclaimer.** [VERIFIED] The CEC search tool states the IICRC "does not promote any particular educational provider", disclaims third-party content, and frames provider content as "the provider's individual opinions and not those of the Institute" (iicrccecevents.com). → CARSI must never claim IICRC endorsement/promotion; mirroring this disclaimer on course pages is the compliant posture.

**R5 — IICRC terminology for CEC providers is "approved", not "accredited".** [VERIFIED usage / UNCONFIRMED prohibition] Every IICRC first source found says "approved CEC training", "approved provider and/or sponsor", "CECs accepted"; no IICRC source found calling CEC providers "accredited". CARSI's brand phrase "IICRC CEC Accredited" is not IICRC's own vocabulary. **Founder decision:** confirm the phrase with IICRC or align to "IICRC-approved CEC provider" / "approved for IICRC CECs".

**R6 — Logo/trademark is enforced.** [VERIFIED] IICRC publishes brand guidelines (locked lockup, clear-space, no rearrangement) and a public "Invalid Firms" enforcement list for logo-policy violators; logo rights attach to Certified Firms/Registrants under agreements with use restrictions; Instructors/Schools get Credly digital badges. CARSI currently uses no IICRC mark (audit-verified) — correct; the rule must be encoded so it stays true.

**R7 — Standards copyright + AI Use Policy (the big one).** [VERIFIED] IICRC's official standards store: standards are copyright-protected, NOT printable ("printing limited to small sections for reference only"), and — explicit policy — **"IICRC prohibits the entry of its standards and related intellectual property into any form of artificial intelligence (AI) tools… creating derivatives of IICRC published and draft standards using AI is also prohibited"**, with access suspension + possible legal action (iicrc.gilmoreglobal.com product pages). Consequences:
  - CARSI course production (AI-assisted: course-asset-kit, GP-129 AI course creation) must NEVER feed IICRC standard text into AI tooling or produce AI derivatives of standards; courses may reference standards nominatively, not reproduce them.
  - The WP-era "IICRC and ANSI procedural excerpts" lesson (`introduction-to-water-damage-litigation-support`) must be audited for verbatim standard text.
  - **OUT-OF-SCOPE FOUNDER FLAG (serious):** RestoreAssist's RAG corpus ingested S500:2021 + 11 other standards (~9,438 chunks) into embeddings with AI answering over them — on its face this is in tension with the published AI Use Policy. Founder/legal review needed; not a CARSI engineering item.

**R8 — School/Instructor is a different licence class.** [VERIFIED] IICRC Approved Schools/Instructors have their own policy (advertising §8A.2.6, renewals, insurance, exams) and application track. CARSI is not one; no CARSI copy may imply School/Instructor status. (Policy PDF is behind Dropbox; section contents UNSUPPORTED beyond titles.)

## 6. Existing capability review

| Capability | Location | Reusable? | Notes |
|---|---|---:|---|
| Terminology guard (7 banned patterns, CI + pre-commit) | `scripts/check-iicrc-terminology.mjs` | ✅ | Extend scope + patterns, don't rebuild |
| Course-kit banned-phrase scanner | `src/lib/course-kit/iicrc-phrases.ts` | ✅ | Mirror new patterns there |
| Explicit cecHours opt-out (0) end-to-end | #500/#514, `src/lib/seed/cec-hours.ts` | ✅ | Registry becomes the positive source |
| Deploy-time seeding | PRE_DEPLOY (#495) | ✅ | Registry ships like the catalog |
| `check:standards` validator | `npm run check:standards` | ✅ | Pattern for the new CEC validator |
| Australian-production skill | `carsi-course-production` | ✅ | Add IP/AI rules to it |
| Live-crawl audit script | scratchpad (today) | ✅ | Promote to a repeatable script |

## 7. Specialist board review

| Role | Finding | Risk | Recommendation |
|---|---|---|---|
| Product Manager | R1 (directory listing) is an unused trust asset; R2 pack generator turns GP-498 from "data request" into a workflow | Low | Ship registry + pack generator first — it unblocks the founder |
| Software Architect | Registry-as-SSOT (`data/seed/cec-approvals.json`) matches the existing catalog/seeder shape; derivation retires naturally once registry lands | Low | No schema change; JSON + validator + resolver switch |
| UX/UI Reviewer | Approved courses should show provable standing (directory link, "1 CEC = 1 hr" framing); unapproved show nothing (not "0 CEC") | Med | Add the R4-style disclaimer once, site-wide footer on course pages |
| Security Reviewer | No secrets/PII; guard extensions are static analysis; AI-policy rule is a process control — enforce via skill + CLAUDE.md + course-kit scanner | Low | Encode, don't just document |
| QA/Test Lead | Every element testable: guard fixtures, registry validator unit tests, crawl script re-run | Low | Add the crawl as `scripts/audit-live-iicrc-claims.ts` |
| Devil's Advocate | Two traps: (1) renaming "IICRC CEC Accredited" sitewide on our own initiative could churn the brand needlessly — it's a founder/IICRC call, not code; (2) don't build CEC UI before any approval exists — registry can ship empty | Med | Keep M6 as founder decision; registry ships empty + validator enforces |

## 8. Judge challenge

| Category | Score | Notes |
|---|---:|---|
| First-source evidence | 24/25 | All rules from iicrc.org/official store; School policy §-contents unsupported |
| Clear user/business problem | 20/20 | Licence-critical, founder-directed, audit-exposed |
| Reuse of existing capability | 15/15 | Extends guard/validator/seeder/skill; zero new frameworks |
| Security/privacy safety | 15/15 | Static checks + process rules; nothing external mutated |
| UX clarity | 8/10 | Disclaimer/copy needs founder wording sign-off |
| Testability | 10/10 | Guard fixtures, validator tests, repeatable crawl |
| Cost/control simplicity | 5/5 | JSON + regex + one script |
| **Total** | **97/100** | **APPROVE BUILD** (engineering items only) |

## 9. Proposed solution (smallest safe build: C1–C6)

- **C1 — CEC approvals registry (SSOT).** `data/seed/cec-approvals.json`: per course `{slug, status: approved|submitted|not_submitted, approvedHours, approvedAt, iicrcReference, evidence}`. Seeder/resolvers read hours ONLY from registry (explicit catalog `cecHours` remains the write-path override until migration completes); derivation fallback deleted. Ships empty → all non-approved courses display no CEC claim.
- **C2 — Submission-pack generator.** `scripts/generate-cec-submission.ts <slug>`: emits the exact R2 checklist (title, duration, summary, learning objectives, instructor, contact, docs) from the catalog for `CECCourse@iicrcnet.org`. Founder submits; on approval, registry entry added.
- **C3 — Guard extensions.** Scan `data/seed/**/*.json` + add patterns: `IICRC Approved School|IICRC Approved Instructor|IICRC School` (positive claims), `endorsed by (the )?IICRC|IICRC[- ]endorsed|IICRC partner`, `promoted by (the )?IICRC`. Mirror in `course-kit/iicrc-phrases.ts`.
- **C4 — CEC arithmetic validator.** In `check:standards` or new `check:cec`: every displayed/registry `cecHours` is a whole number ≤ course educational hours (R3); any recert copy matches "14 CECs / 4 years (Master & Inspector: 2 years)".
- **C5 — Standards IP + AI rule encoded.** CLAUDE.md block + `carsi-course-production` skill: no IICRC standard text into AI tools; no AI derivatives of standards; no verbatim reproduction beyond brief attributed reference (R7); IICRC logo/marks never used without written permission — "IICRC" wordmark nominative-only (R6). Course-kit scanner refuses input files containing long verbatim standard blocks (heuristic: cite-density check).
- **C6 — Provider-standing surface + repeatable audit.** Course-page/footer disclaimer mirroring R4 (founder-approved wording), optional link to the IICRC CEC directory (R1); promote today's crawl to `scripts/audit-live-iicrc-claims.ts` (sitemap → banned patterns + numeric-CEC census) for scheduled re-runs.

**Founder-only decisions (not built):** F-A "Accredited" vs IICRC's "approved" wording (R5) — confirm with IICRC or align; F-B the approval list itself (GP-498) + first C2 submissions; F-C RestoreAssist RAG-vs-AI-policy legal review (R7 flag); F-D disclaimer wording sign-off.

Failure flow: registry missing/invalid → build fails via validator (fail-closed). Rollback: registry + guard changes are additive; revert = restore derivation commit (not recommended).

## 10. UX requirements

Course page: approved → "X IICRC CECs (1 CEC per training hour)" + directory-verifiable provider line; not approved → no CEC element at all (never "0 CECs"). Disclaimer footer on `/courses/*` only. No new nav. Copy in Australian English.

## 11. Technical requirements

Files: `data/seed/cec-approvals.json` (new), `scripts/generate-cec-submission.ts` (new), `scripts/audit-live-iicrc-claims.ts` (new), `scripts/check-iicrc-terminology.mjs`, `src/lib/seed/cec-hours.ts` (+tests), `scripts/seed-courses-catalog.ts`, `src/lib/course-kit/iicrc-phrases.ts` (+tests), CLAUDE.md, `.claude/skills/carsi-course-production/SKILL.md`, course page component (disclaimer). No DB schema change (Course.cecHours already exists). No new deps. CI: extend existing check scripts; vitest.

## 12. Security & privacy

No secrets/PII. Static analysis only. Audit script hits only carsi.com.au. Registry is public data (approvals are publishable facts). No external system writes.

## 13. Verification plan

- Static: `npm run type-check && npm run lint && npm run check:iicrc-terminology && npm run check:standards` (guard must FAIL on new-pattern fixtures, PASS on clean tree).
- Unit: registry validator (missing/duplicate/fractional/exceeds-duration), resolver reads registry-only, pack generator output contains all R2 fields, phrase-scanner mirrors.
- Live: `npx tsx scripts/audit-live-iicrc-claims.ts` before/after first registry deploy — expected: numeric-CEC pages drop from 71 to (approved count).
- Evidence before "done": pasted gate outputs + one generated submission pack + crawl diff.

## 14. Loop & stress testing

Empty registry (launch state) → zero CEC claims sitewide; registry entry for unknown slug → validator fails; fractional hours → fails; catalog duplicate slugs → fails; guard fixture file with each new banned phrase → guard fails; crawl against 404/timeout pages → reported not crashed; re-run crawl idempotent.

## 15. Acceptance criteria

- [ ] `cec-approvals.json` exists, validated in CI; display path reads hours only from it; derivation fallback deleted (`resolveCecHours` duration/prose branches removed)
- [ ] With empty registry: 0 of 80 live course pages show a numeric CEC claim (crawl proof)
- [ ] `generate-cec-submission.ts <slug>` emits all seven R2 checklist fields for any catalog course
- [ ] Guard fails on fixtures containing each new banned phrase AND on a banned phrase planted in `data/seed/*.json`; passes on clean tree
- [ ] CEC arithmetic validator rejects fractional/exceeding hours (unit tests)
- [ ] CLAUDE.md + carsi-course-production encode the standards-IP/AI rules verbatim-sourced to R7; course-kit scanner has the verbatim-block heuristic + test
- [ ] Disclaimer component rendered on course pages behind founder-approved copy (flag/PR gate until F-D)
- [ ] `audit-live-iicrc-claims.ts` committed and produces the same census format as today's audit

## 16. Goal command

```text
/execute-goal Implement spec docs/specs/2026-07-09-iicrc-compliance-completion.md items C1–C6 in CARSI.
Completion condition: all §15 acceptance criteria checkable, gates green (type-check, lint, check:iicrc-terminology, check:standards, test:unit), PR(s) CI-green on CleanExpo/CARSI.
Required proof: pasted gate outputs; guard-failure demo on fixtures; generated submission pack for one course; live-crawl census diff after deploy.
Constraints: no unrelated files; no secrets; no destructive ops; display-copy wording (disclaimer, any "Accredited" change) ships only after founder sign-off (F-A/F-D) — build behind that gate; stop and /session-handoff if blocked.
```

## 17. Implementation sequence

1. **Inspect** — cec-hours resolver + seeder read/write paths; course page CEC render sites. Stop if display paths bypass the resolver.
2. **C1+C4** registry + validator + resolver switch (tests first). Gate: unit green.
3. **C3** guard extensions + fixtures. Gate: guard red-on-fixture, green-on-tree.
4. **C2** pack generator. Gate: full-field output for `avian-influenza-…` and one legacy course.
5. **C5** CLAUDE.md/skill/course-kit encodings. Gate: course-kit tests.
6. **C6** crawl script + disclaimer (flag-gated). Gate: crawl census matches today's baseline format.
7. Gauntlet → PR(s) → founder gates F-A–F-D → registry populated per approvals → deploy → post-deploy crawl.

## 18. Session-handoff seed

Planned: research-backed IICRC compliance completion (this file). Key evidence: IICRC AI Use Policy (gilmoreglobal store), per-course CEC submission checklist (CECCourse@iicrcnet.org), CARSI in official provider directory, "approved" vs "Accredited" vocabulary gap, 1 CEC = 1 hour. Deferred: F-A wording call, F-B approvals data, F-C RestoreAssist AI-policy legal review, F-D disclaimer copy. Pickup: run /execute-goal from §16 after founder "go".

## 19. Final recommendation

**Proceed to implementation** (C1–C6, 97/100 APPROVE BUILD) — with the four founder decisions (F-A–F-D) explicitly gated, and the **R7 RestoreAssist flag escalated to the founder today** regardless of whether this spec is built.

SPM spec complete. Next safe action: read the four founder decisions (especially R5 "Accredited vs approved" and the R7 RestoreAssist AI-policy flag), then say "go — build C1–C6" to implement.

# SPM Spec — "Behind Closed Doors" Member-Only Content Engine

> Status: DRAFT for founder acceptance · Author: Claude (SPM) · 2026-07-01
> Evidence: [VERIFIED] repo file:line / Drive / issue · [INFERENCE] reasoned · [UNCONFIRMED] assumption

## 1. Task
Build a members-only **"Behind Closed Doors"** section: ongoing, trusted, verified intelligence that deepens membership value and markets membership. Every item is sourced from trusted primary sources (Drive manual corpus + named sources), expressed in original wording (copyright-safe), and passes **/storm + /judge → human/SME approval** before it ever appears to members. Overseen by a **permanent cron** + a **specialised senior agent**, with free teasers as acquisition hooks.

## 2. Current context
- Repo CleanExpo/CARSI, main @ 28a68e1b (clean). Next.js LMS; main=prod via DO deploy-on-push; carsi-db firewalled locally (writes via app admin/API).
- **Reusable today [VERIFIED]:** editorial content system (`app/(public)/research/[slug]` + `/news`, Article/NewsArticle schema, datePublished/dateModified, bylines); the course **workflow-status approval gate** (`admin-courses-service.ts:309-310` draft→published) = the human-approval pattern; the Drive corpus (IICRC S100–S900 + RIA, all present — proven this session with S500/S520/S540/psychrometry); the Pi-Dev-Ops skills now installed (`/storm`, `/judge`, `marketing-orchestrator`, `scheduled-tasks`, `skill-authoring-standard`); the SEO authority spec + podcast/video engine to compose with.
- **Blocker [VERIFIED]:** **#271 OPEN** — "Yearly + Teams checkout sell access that `has_subscription` stub never grants." The membership *wall* depends on a working entitlement check; #271 must be fixed first or the gate leaks/over-blocks.

## 3. Problem
Members get no ongoing exclusive value beyond courses → weak retention + no compelling "why join now." Free editorial (news/research) doesn't differentiate membership. Competitors/US sources own the authority conversation. Why now: the Drive corpus + the new skills make trusted, verified, repeatable premium content feasible at low marginal cost.

## 4. Desired outcome
- **Members** get a steady stream of exclusive, trusted, cited briefings (the "edge" peers don't have).
- **Prospects** see free teasers that make membership obviously worth it.
- **System** produces this on a cadence, self-verifies (/storm+/judge), and never publishes unverified/copyright-infringing content.
- **Must not happen:** unverified or manual-copied content reaching members (credentialing-brand reputational/legal risk); the gate leaking paid content to non-members; auto-publish without SME sign-off.

## 5. Scope
**In:** the gated "Behind Closed Doors" section; the /storm-/judge verification pipeline (draft→verify→approve→publish); the no-dupes topic ledger; the permanent cron; the senior-agent skill; public teasers + membership CTA.
**Out (this spec):** fixing #271 entitlement (own issue, prerequisite); building a new payments system; auto-posting to socials (that's the marketing engine spec).
**Non-goals:** auto-publishing unverified content; reproducing copyrighted manual prose.
**Assumptions:** [UNCONFIRMED] #271 gets fixed so a reliable `isMember` check exists; SME (founder) reviews each batch.
**Constraints:** CI=type-check+build; carsi-db firewalled; member content irreversible → approval gate.

## 6. Content pillars (founder's 4 + expansion, ROI-ranked)
| Pillar | Why it sells membership | Source | Tier |
|---|---|---|---|
| **Standards Updates** (new IICRC/RIA editions + what changed) | Unique, evergreen, hard to get elsewhere; CARSI owns the corpus | Drive S100–S900, RIA | **P0** |
| **Insurance & Claims** (scoping vs TPAs, AFCA, Senate inquiry, disputes) | Direct $ impact for operators; highly differentiated | ICA, AFCA, gov inquiries, RIA | **P0** |
| **IAQ** (mould/health, testing myths, S520) | High anxiety topic; authority play | S520, ASBB, health sources | **P1** |
| **The 1%'s — wealth without more spend** (margin, pricing, ops leverage) | Strongest *marketing* hook ("get richer, no extra cost") | Business frameworks + field data | **P1** |
| Flooring Industry (S100/S300/S800, subfloor moisture) | Core trade depth | Drive | P1 |
| From-the-Field case studies | Relatability + proof | Real jobs (de-identified) | P2 |
| Tools & Templates (scope sheets, drying logs, CEC/psychrometric calculators) | Tangible utility = retention | CARSI-authored | P2 |
| Regulatory/Compliance (NCC, WHS, state) · Equipment/Tech reviews · Cert/CEC pathways · Market intelligence · Claims-negotiation tactics | Breadth over time | Primary + gov | P3 |

## 7. Specialist board (condensed)
- **PM:** strongest wedge = Standards Updates + Insurance (unique + $); start there, not all 13 pillars. Risk: content treadmill → the cron+agent is what makes it sustainable.
- **Architect:** reuse the editorial Article system + add a membership gate; reuse workflow-status as the approval gate; don't build a new CMS. Risk: #271 gate.
- **UX:** teaser→paywall→member-read flow needs clean empty/locked/loading states + an obvious "unlock" CTA.
- **Security:** the gate is the crux — server-side entitlement check on every member route + API (no client-only gating = IDOR/paid-content leak). Approval gate prevents unverified publish.
- **QA:** every item needs a provenance record + /storm citations + /judge verdict before `published`; test the gate denies non-members (401/redirect) at the API layer.
- **Judge:** big; phase it.

## 8. Judge challenge
| Category | Score | Notes |
|---|--:|---|
| First-source evidence | 22/25 | repo patterns + Drive corpus + #271 all verified |
| Clear problem | 19/20 | retention + acquisition, real |
| Reuse | 13/15 | editorial system + workflow gate + skills reused |
| Security | 11/15 | gate (server-side) + approval gate; #271 is the risk |
| UX | 8/10 | teaser/paywall flow needs care |
| Testability | 9/10 | gate + provenance + /judge verdict all checkable |
| Cost/simplicity | 3/5 | 13 pillars + cron + agent is a lot if done at once |
| **Total** | **85/100** | borderline — **REDUCE SCOPE to phase it**, then it's APPROVE BUILD per-phase |

**Decision: REDUCE SCOPE → APPROVE BUILD Phase 1; cron + senior-agent in Phase 3 after the pipeline is proven.**

## 9. Proposed solution (phased)
**Phase 1 — Gated section + 1 pillar, manual cadence (autonomous build; publish founder-gated):** a `/members/behind-closed-doors` route + `[slug]` detail, server-side member-gated (reusing/awaiting #271 entitlement), reusing the Article content model + workflow-status approval. Seed with **Standards Updates** items (Drive-sourced, original wording), each carrying a provenance record (source + /storm citations + /judge verdict) and published only after approval. Public **teaser** (headline + first ~100 words + "unlock with membership" CTA), indexed for SEO/GEO.
**Phase 2 — The /storm-/judge verification pipeline as a repeatable flow:** commission topic → `/storm` (cited research) → draft (Drive-sourced, original wording) → `/judge` (challenge) → SME approve → publish. A `seen-topics` ledger guarantees no duplicates across cycles.
**Phase 3 — Permanent cron + Senior Agent:** a durable **cloud** schedule (Claude `scheduled-tasks` MCP or DO cron) firing the pipeline on a per-pillar rotation; a **`carsi-behind-closed-doors-editor`** senior-agent skill (authored to `skill-authoring-standard`) that owns the loop: commissions, runs /storm+/judge, enforces Drive-sourcing + copyright, queues for human approval, tracks no-dupes, reports.
**Phase 4 — Membership marketing tie-in:** teasers as acquisition hooks across the SEO programme + the podcast/video engine; "members get this every week" messaging; gated-content count as a sales asset.

- **Permission flow:** every member route + its data API does a **server-side** entitlement check; non-member → teaser + paywall (never the full item).
- **Failure/rollback:** content ships as drafts; nothing auto-publishes; each phase is its own PR; the gate fails *closed* (deny on uncertainty).

## 10–14 (UX/Tech/Security/Verification/Stress) — essentials
- **UX:** entry `/members/behind-closed-doors`; states = locked(teaser+CTA)/empty/loading/error/member-read; single "unlock" CTA.
- **Tech:** new gated routes + content type (reuse Article); server-side `isMember` guard in route + API; provenance fields (source, storm_citations, judge_verdict, approved_by); no-dupes ledger; teaser renderer. Files: `app/(members)/...`, member-gate util, admin approval surface (reuse workflow-status).
- **Security:** server-side gate on route AND API (no client-only); approval-before-publish; provenance/audit per item; copyright check in the pipeline (no verbatim manual prose).
- **Verification:** `type-check`+`build`; unit-test the gate denies non-members (expect 401/redirect at API); assert no item reaches `published` without a /judge verdict + approval; Rich Results/teaser indexable.
- **Stress:** non-member hits member API → denied; duplicate topic → ledger blocks; unverified draft → cannot publish; gate fails closed.

## 15. Acceptance criteria
- [ ] `/members/behind-closed-doors` exists, **server-side gated** — a non-member gets the teaser + paywall, never full content (API-level test proves 401/redirect).
- [ ] Each published item has a provenance record: trusted source(s), `/storm` citations, `/judge` verdict = pass, `approved_by` set; original wording (no manual prose).
- [ ] No item reaches `published` without approval (workflow-status gate enforced).
- [ ] A no-duplicates ledger blocks repeat topics across cycles.
- [ ] (Phase 3) A durable cloud cron fires the pipeline; the `carsi-behind-closed-doors-editor` senior-agent skill exists + is authored to skill-authoring-standard.
- [ ] Public teaser is indexable (feeds SEO/GEO) with a membership CTA.
- [ ] `type-check` + `build` green; #271 entitlement confirmed working before the gate is trusted in prod.

## 16. Goal command
```text
/execute-goal Implement Phase 1 of docs/specs/2026-07-01-behind-closed-doors-members-engine.md — the server-side member-gated "Behind Closed Doors" section + the Standards-Updates pillar seeded from the Drive corpus (original wording, provenance + /storm citations + /judge verdict per item, published only after approval) + public teasers. Completion: non-member is denied full content at the API layer (test proves it); ≥3 Drive-sourced items exist as approved/published with provenance; teaser route indexable. Proof: type-check + build output, the gate unit test, the provenance records, a sitemap/teaser check. Constraints: no copyrighted manual prose; gate fails closed; no auto-publish; stop + /session-handoff if blocked on #271 entitlement, carsi-db writes, or SME sign-off.
```

## 17–18. Sequence + handoff seed
Phase 1 inspect→build gated section→seed Standards items→verify gate→/judge→handoff. Handoff seed: planned the Behind-Closed-Doors members engine; key = member-gate util + Article reuse + workflow approval + Drive sourcing + provenance; blocker = #271 entitlement; pickup = run the Phase 1 goal once #271 is confirmed.

## 19. Final recommendation
**Build smaller — Phase 1 (gated section + Standards-Updates pillar, founder-gated publish), prove the /storm-/judge pipeline, THEN add the cron + senior agent (Phase 3).** Prerequisite: **#271 entitlement must be fixed** for the wall to be trustworthy.

```text
SPM spec complete. Next safe action: fix #271 entitlement (the gate prerequisite), then run the Phase 1 /execute-goal.
```

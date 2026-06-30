# CARSI — 10-Persona Whole-Product UX + Standards-Coverage Audit

**Date:** 2026-06-30 · **Scope:** live site `https://www.carsi.com.au` (public + authenticated) + curriculum coverage vs the IICRC/RIA source corpus · **Method:** persona walkthroughs via browser, retrieval/code cross-reference, every finding re-verified on prod before reporting (zero-false-positive gate). **Outcome:** 9 issues filed (#296–#304); no code changes in this pass.

Prod is served by **DigitalOcean** (`monkfish-app`, `x-do-app-origin`), healthy, ~79 published courses live.

---

## 1. Judge gate — false positives caught (NOT filed)
Code-level suspicions that **failed live verification** and were dropped:
- `/subscribe` is **not** a dead-end — live it renders a working single **$795/yr Membership** with a functioning "Start Membership" (Stripe-wired); no "not wired" copy.
- `/credentials/[id]` does **not** bounce to `/login` — it redirects to a public 200 verification view.
- `/pricing` **does** link to `/subscribe` ("Choose yearly").
- `/dashboard/certificates` "404" was a wrong URL guess — the real Certificates link (`/dashboard/student/credentials`) works.

---

## 2. Workstream B — Curriculum coverage vs IICRC/RIA Drive corpus
Source of truth: the founder's Google Drive **"IICRC Standards"** + **"RIA Courses"** folders. Mapped against `data/seed/courses-catalog.json`, `data/wordpress-export/courses.json`, `src/lib/lms-seed-catalog.ts`, and live `/courses`.

| Standard (Drive edition) | Status | CARSI evidence |
|---|---|---|
| S100 carpet/textile cleaning (2021) | ✅ Covered | carpet-cleaning-basics, etc. |
| S300 upholstery (2025) | ✅ Covered | upholstery |
| S410 infection control (2025) | ✅ Covered | infection-control-* |
| S500 water damage (5th ed 2021) | ✅ Covered | intro-to-WDR, wrt-water-damage-essentials, ASD suite |
| S520 mould (2024) | ✅ Covered | level-1/2/3-mould, applied-microbial |
| S700 fire & smoke (2025) | ✅ Covered | smokeandsoot |
| S220 hard-surface **inspection** (2021) | ⚠️ Partial | only cleaning courses, no inspection course |
| S400 commercial built env (2025) | ⚠️ Partial | commercial cleaning/maintenance, no dedicated S400 |
| S590 HVAC **assessment** (2023) | ⚠️ Partial | HVAC/IAQ/duct content, no assessment course |
| RIA WLS Manual (2020) | ⚠️ Partial | large-loss courses, no WLS credential ref |
| **S540 trauma & crime scene (2023)** | ❌ **GAP** | no trauma/crime-scene course |
| **S900 drug residue/chemical waste (2025)** | ❌ **GAP** | no meth/clan-lab course |
| **S800 textile floor inspection (2023)** | ❌ **GAP** | carpet courses are cleaning, not inspection |
| **RIA Body of Knowledge** | ❌ **GAP** | zero RIA references anywhere |

**Tally:** 6 covered · 4 partial · 4 gap. Discipline taxonomy also under-built (WRT/CCT label drift; `iicrcDiscipline` set on only 1 of 23 catalogue records; no codes for upholstery/infection/commercial/trauma/drug). → **#296**

---

## 3. Workstream A — Persona walkthrough (live-verified)

### Public surface
| Finding | Issue |
|---|---|
| Privacy/Terms exist but absent from global footer/nav | **#297** |
| `/professional-directory` advertises live NRPG directory, serves stub data | **#298** |
| Hub/legal/event/submit pages indexed in sitemap but orphaned from nav | **#299** |
| `/youtube` "stats sync pending API key" + hub feeds incomplete | **#300** |
| Legacy `/courses/[slug]/quiz/*` route 404s | noted |

### Authenticated (logged-in student)
The authenticated product is **well-built**: polished 6-step onboarding (industry→role→experience→disciplines→goal→reminders) ending in a personalized course recommendation; a complete multi-module **course player** (standards-grounded lessons citing IICRC S500/ASD/RAC/Safe Work Australia, notes editor, "Ask Claire" AI assist, PWA offline tip, module-completion share-post generator); a working **Certificates** page (`/dashboard/student/credentials`) with an "Employer proof pack" (PDF + share link).

### Deep course-completion (CEC moat) — **works**
Completed "Refrigerant Dehumidifiers for Water Loss Restoration" (10 modules) end-to-end → **Certificate of Completion issued** at a verifiable credential URL (`CARSI-24A258F1BFCA`): Discipline "Water Restoration Technician", **4 IICRC CEC hours**, programme level, verified-completion seal, PDF download, authorised signatory. Findings:
- **#301** [P2] No quiz/assessment gates the certificate — issues on read-through alone (CEC integrity).
- **#302** [P2] Certificate name renders as email local-part ("support") — onboarding never captures a learner name; signatory reads "Philip McGurk" (confirm vs "Phill").
- **#303** [P3] Module 10 "What you will learn" (objectives) misordered as the final module.

### Accessibility (Persona 9)
Homepage mostly healthy (single H1, `lang=en-AU`, skip link, all buttons named, images have alt; contrast AA-clean per prior sweep). Gaps → **#304** [P3]: no `<main>`/`<header>` landmarks, heading-order skip (H1→H3), nameless logo link (likely shared-layout, app-wide).

---

## 4. Persona coverage
| Persona | Status |
|---|---|
| 2 Returning student · 4 Subscriber · 5 Employer · 6 CCW · 10 SEO/anon | ✅ Verified |
| 3 Team manager | ✅ Walked (purchase→seats needs payment → #271) |
| 1 First-time tech | ✅ Flow walked (dedicated mobile-viewport visual pass still worthwhile) |
| 7 Start-a-business · 8 B2B industry | ◑ Public pages confirmed; not deeply walked |
| 9 Accessibility | ✅ Homepage audited (authed-layout a11y still worthwhile) |

---

## 5. Issues filed (this audit)
| # | Sev | Title |
|---|---|---|
| 296 | P2 | Curriculum gaps vs IICRC/RIA Drive corpus (S540/S900/S800 + RIA + taxonomy) |
| 297 | P2 | Privacy/Terms missing from global chrome |
| 298 | P2 | /professional-directory serves stub data |
| 299 | P3 | Hub/legal/event/submit pages orphaned from nav |
| 300 | P3 | Industry hub feeds incomplete (/youtube API key) |
| 301 | P2 | CEC certificate issues on read-through with no quiz/assessment |
| 302 | P2 | Certificate uses email local-part as name; signatory spelling |
| 303 | P3 | Course module order: "What you will learn" appears last |
| 304 | P3 | a11y: missing main/header landmarks + heading skip + nameless logo |

Confirmed-but-already-ticketed (not re-filed): #271 (yearly/Teams paid-but-no-access), #135 (contact/subscribe email), #128 (analytics), #295 (roadshow calendar), #63 (pricing elevation), #145 (RPL), #144 (faceted URLs), #207 (catalog cleanup), #69/#70 (dashboard/design), #143 (cert font).

---

## 6. Remaining (not covered this pass)
- **#271 team/yearly paid-but-no-access** — needs a Stripe *test* transaction (not run on live).
- **Mobile-viewport visual** (persona 1) + **deep persona 7/8** walkthroughs.
- **Authenticated-layout accessibility** (vs homepage).

# Licence inventory — IICRC codes, certification, CEC, accreditation, unsold subjects, campaign statistics

Exhaustive pass, 19/10/2026, on `fix/industry-faq-licence-v2` (based on origin/main d49a93de).
Generator: `node scripts/licence-inventory.mjs` (exit 1 on any exposure); every row is in `licence-inventory.csv`.
Enforced by `src/lib/marketing/licence-inventory.test.ts`.

- **Scope is discovered**: every file under `app/`, `src/`, `public/`, and every directory under `docs/`, each
  classified below. A new `docs/` directory fails the gate until it is classified.
- **Terms**: all 36 official IICRC certification codes (any case); `certif`, "certs", "IICRC credentials/creds";
  `CEC`; `accredit`; `board-approved`; IICRC-branded offerings ("IICRC … training/course/credential/bundle");
  repair, colour/dye, upholstery, reinstall; and, in `docs/campaigns` and `docs/marketing`, marketing statistics
  (`N+`, `$NK/M/B`, `N%`, `Nx`).
- **Sentence scope**: rules see only the sentence containing the hit (JSX blocks with inline tags masked), so a
  legitimate phrase elsewhere on the line cannot excuse a claim. TS/TSX is parsed, so only rendered text counts.
- **Exemptions are per line**: `scripts/licence-inventory-reviewed.json` names the file, line, exact text and reason;
  the test fails if an entry no longer matches its line. No file-wide or route-wide allowances remain.

## Counts

| Class | Hits |
| --- | ---: |
| fixed (exposures on origin/main d49a93de under the final rules, removed by this branch) | 959 |
| legitimate (named sentence rule or reviewed line) | 1893 |
| not public (tests, generated, staff, tooling, prompts, identifiers, routing data, markup, URLs) | 3944 |
| owned elsewhere (reviewed line; not edited here; listed for Phill) | 8 |
| exposure remaining | 0 |

## Scope (discovered)

| Directory | Classification | Files | Reason |
| --- | --- | ---: | --- |
| `app/`, `src/`, `public/` | scanned | all | rendered code and public files |
| `docs/agent-framework` | internal | 11 | engineering process for agents |
| `docs/ai-website` | internal | 1 | operations runbook |
| `docs/analytics` | internal | 1 | analytics setup notes |
| `docs/architecture` | internal | 1 | architecture records |
| `docs/audit` | internal | 8 | audit records |
| `docs/audits` | internal | 1 | audit records |
| `docs/campaigns` | scanned | 20 | campaign plans, ad copy and campaign course material |
| `docs/cec-submissions` | internal | 12 | submission packs sent to the IICRC, not published copy |
| `docs/compliance` | internal | 2 | this inventory's own output: it quotes the banned strings as evidence |
| `docs/content` | scanned | 10 | course and social content drafts |
| `docs/course-content` | scanned | 9 | course and workshop material delivered to learners |
| `docs/course-updates` | scanned | 38 | course content updates published to the LMS |
| `docs/courses` | scanned | 3 | course source packs and registers |
| `docs/evidence` | internal | 1 | verification evidence |
| `docs/features` | internal | 2 | feature engineering notes |
| `docs/guides` | internal | 9 | engineering guides (CI, deployment, testing) |
| `docs/internal` | internal | 9 | internal technology notes |
| `docs/marketing` | scanned | 19 | marketing campaigns, ads, lead magnets and partner letters (all subfolders) |
| `docs/migrations` | internal | 1 | database migration records |
| `docs/onboarding` | scanned | 22 | enterprise onboarding programme material delivered to learners |
| `docs/phases` | internal | 1 | project phase records |
| `docs/plans` | internal | 17 | engineering and product plans |
| `docs/qa` | internal | 3 | QA records |
| `docs/reference` | internal | 2 | API and engineering reference |
| `docs/releases` | internal | 1 | release records |
| `docs/reports` | internal | 2 | internal reports |
| `docs/rollback` | internal | 2 | rollback procedures |
| `docs/runbooks` | internal | 9 | operations runbooks |
| `docs/security` | internal | 3 | security records |
| `docs/session-handoffs` | internal | 22 | engineering session handoffs |
| `docs/specs` | internal | 16 | engineering specifications |
| `docs/stability` | internal | 2 | stability records |
| `docs/superpowers` | internal | 2 | agent tooling notes |
| `docs/` root files | internal | — | engineering records (deployment, architecture, process) |

## Per-line exemptions (reviewed)

| File | Line | Class | Reason |
| --- | ---: | --- | --- |
| `src/components/lms/onboarding-flow.tsx` | 119 | legitimate | learner states which IICRC certification they hold (third-person; the question asks about the learner's own certifications) |
| `src/components/lms/onboarding-flow.tsx` | 120 | legitimate | learner states which IICRC certification they hold; CRT is the IICRC colour repair certification, and onboarding routes CRT holders to carpet cleaning |
| `src/components/lms/onboarding-flow.tsx` | 121 | legitimate | learner states which IICRC certification they hold (third-person) |
| `src/components/lms/onboarding-flow.tsx` | 122 | legitimate | learner states which IICRC certification they hold (third-person) |
| `src/components/lms/onboarding-flow.tsx` | 123 | legitimate | learner states which IICRC certification they hold (third-person) |
| `src/components/lms/onboarding-flow.tsx` | 124 | legitimate | learner states which IICRC certification they hold (third-person) |
| `src/components/lms/onboarding-flow.tsx` | 125 | legitimate | learner states which IICRC certification they hold (third-person) |
| `src/components/lms/diagrams/IICRCDisciplineMap.tsx` | 16 | legitimate | the IICRC's own discipline map, framed on /courses as a third-person reference, not CARSI courses |
| `src/components/lms/diagrams/IICRCDisciplineMap.tsx` | 18 | legitimate | the IICRC's own discipline map: what the IICRC CRT certification covers (third-person) |
| `docs/course-content/ccw-workshop/14-add-on-services.md` | 112 | legitimate | add-on service a cleaning business may refer out or offer under the IICRC CRT certification (third-person; the module teaches recognising it, not a CARSI course) |
| `app/(public)/designations/[slug]/page.tsx` | 48 | owned-elsewhere | feat/designations-live owns the designations registry and its alsoEarnsCec flag; reported to Phill |
| `src/components/designations/DesignationCard.tsx` | 32 | owned-elsewhere | feat/designations-live owns the designations registry and its alsoEarnsCec flag; reported to Phill |
| `app/(public)/testimonials/page.tsx` | 21 | owned-elsewhere | reviews thread owns testimonials (brief: do not touch reviews); reported to Phill |
| `app/(public)/testimonials/page.tsx` | 29 | owned-elsewhere | reviews thread owns testimonials; reported to Phill |
| `app/(public)/testimonials/page.tsx` | 36 | owned-elsewhere | reviews thread owns testimonials; reported to Phill |
| `app/(public)/testimonials/page.tsx` | 54 | owned-elsewhere | reviews thread owns testimonials; reported to Phill |

## Fixed, by what the final rules called them on main

| Rule | Hits |
| --- | ---: |
| no rule matches | 785 |
| CEC descriptor scoped to a topic or audience (implies those courses carry CECs) | 120 |
| CARSI offering named with an IICRC code (any modifiers in between) | 25 |
| promises CECs with no approval condition in the same sentence | 16 |
| static CEC course count | 7 |
| sells certification | 4 |
| course-level IICRC approval claim | 1 |
| every course or module promised CECs | 1 |

Files with fixed hits:

- `app/(dashboard)/dashboard/credentials/[credentialId]/page.tsx` — 2
- `app/(dashboard)/dashboard/pathways/page.tsx` — 5
- `app/(public)/about/page.tsx` — 7
- `app/(public)/ai-website/page.tsx` — 3
- `app/(public)/courses/page.tsx` — 2
- `app/(public)/events/ccw-roadshow/success/page.tsx` — 1
- `app/(public)/industries/aged-care/page.tsx` — 11
- `app/(public)/industries/caravan-parks/page.tsx` — 28
- `app/(public)/industries/childcare/page.tsx` — 18
- `app/(public)/industries/commercial-cleaning/page.tsx` — 37
- `app/(public)/industries/construction/page.tsx` — 9
- `app/(public)/industries/data-centres/page.tsx` — 31
- `app/(public)/industries/education/page.tsx` — 20
- `app/(public)/industries/emergency-management/page.tsx` — 34
- `app/(public)/industries/facility-management/page.tsx` — 9
- `app/(public)/industries/food-processing/page.tsx` — 29
- `app/(public)/industries/government-defence/page.tsx` — 18
- `app/(public)/industries/gyms-fitness/page.tsx` — 32
- `app/(public)/industries/healthcare/page.tsx` — 11
- `app/(public)/industries/hospitality/page.tsx` — 18
- `app/(public)/industries/insurance/page.tsx` — 12
- `app/(public)/industries/mining/page.tsx` — 16
- `app/(public)/industries/museums-cultural/page.tsx` — 28
- `app/(public)/industries/ndis-disability/page.tsx` — 26
- `app/(public)/industries/page.tsx` — 6
- `app/(public)/industries/plumbing-trades/page.tsx` — 36
- `app/(public)/industries/property-management/page.tsx` — 17
- `app/(public)/industries/real-estate/page.tsx` — 20
- `app/(public)/industries/retail/page.tsx` — 18
- `app/(public)/industries/strata/page.tsx` — 18
- `app/(public)/industries/transport-logistics/page.tsx` — 31
- `app/(public)/pathways/[slug]/page.tsx` — 1
- `app/(public)/resources/government-restoration-panels/page.tsx` — 1
- `app/(public)/subscribe/layout.tsx` — 1
- `app/(public)/subscribe/success/page.tsx` — 1
- `app/api/lms/[[...path]]/route.ts` — 1
- `app/api/lms/gamification/leaderboard/route.ts` — 1
- `app/opengraph-image.tsx` — 3
- `docs/campaigns/2026-07-04-avian-influenza-readiness-30-day-ecosystem.md` — 2
- `docs/campaigns/aged-care-campaign.md` — 12
- `docs/campaigns/childcare-campaign.md` — 12
- `docs/campaigns/commercial-cleaning-campaign.md` — 15
- `docs/campaigns/construction-campaign.md` — 11
- `docs/campaigns/government-defence-campaign.md` — 12
- `docs/campaigns/healthcare-campaign.md` — 11
- `docs/campaigns/mining-industry-campaign.md` — 12
- `docs/campaigns/property-management-campaign.md` — 14
- `docs/content/podcast-repurposing-engine.md` — 11
- `docs/content/scoping-quoting-course/course-overview.md` — 2
- `docs/course-content/ccw-workshop/14-add-on-services.md` — 2
- `docs/course-content/ccw-workshop/README.md` — 2
- `docs/course-updates/PRICING-AND-NEW-COURSES.md` — 3
- `docs/marketing/association-partnerships.md` — 23
- `docs/marketing/campaigns/cleaning-plus-campaign.md` — 21
- `docs/marketing/ccw-roadshow-campaign.md` — 1
- `docs/marketing/franchise-pilot-offer.md` — 1
- `docs/marketing/google-ads-campaign.md` — 72
- `docs/marketing/industry-icp-database.json` — 34
- `docs/marketing/lead-magnets/government-contractor-guide.md` — 12
- `docs/marketing/linkedin-campaign.md` — 41
- `docs/marketing/synthex-campaign-context.md` — 8
- `public/images/manifest.json` — 1
- `public/llms.txt` — 1
- `public/manifest.json` — 2
- `public/start-smart-readiness.json` — 1
- `src/components/ccw/CcwBusinessCoachingClient.tsx` — 1
- `src/components/ccw/CcwCarsiTruckmountClient.tsx` — 1
- `src/components/ccw/CcwWorkshopClient.tsx` — 3
- `src/components/industries/ContractorAddOns.tsx` — 1
- `src/components/industries/IndustryCourseSection.tsx` — 2
- `src/components/landing/AnimatedHero.tsx` — 1
- `src/components/landing/HomeFeaturedCoursesSection.tsx` — 1
- `src/components/lms/RenewalCockpit.tsx` — 2
- `src/components/lms/diagrams/CertificatePreview.tsx` — 1
- `src/components/lms/diagrams/IICRCDisciplineMap.tsx` — 4
- `src/components/lms/onboarding-flow.tsx` — 1
- `src/components/marketing/about/AboutMissionPillars.tsx` — 1
- `src/components/seo/JsonLd.tsx` — 3
- `src/components/tools/CECCalculator.tsx` — 5
- `src/lib/ai-website/advisor.ts` — 2
- `src/lib/certificate/CertificateArt.tsx` — 1
- `src/lib/customer-journey-loop.ts` — 7
- `src/lib/iicrc-discipline-display.ts` — 2
- `src/lib/marketing/industry-page-data.ts` — 6
- `src/lib/marketing/start-smart.ts` — 4
- `src/lib/schema/organization.ts` — 3
- `src/lib/server/onboarding-pathway.ts` — 2
- `src/lib/server/proof-pack-pdf.ts` — 3
- `src/lib/server/public-catalogue-facts.ts` — 1

## Current hits by class and reason

| Class | Reason | Hits |
| --- | --- | ---: |
| legitimate | third-person IICRC certification: obtained through IICRC schools, held, renewed or required by others | 290 |
| legitimate | licence-compliance note: states what is NOT claimed or branded | 217 |
| legitimate | CARSI-issued certificate (document), not certification | 208 |
| legitimate | conditional or registry-computed CEC | 205 |
| legitimate | provider-level CEC standing | 169 |
| legitimate | catalogue-wide CLAUDE.md descriptor (not scoped to a topic or audience) | 161 |
| legitimate | learner CEC record, tracking and renewal (the learner’s own IICRC certification) | 119 |
| legitimate | internal campaign planning figure (budget, KPI, target, bid, discount, commercial term), not a published claim | 82 |
| legitimate | third-person IICRC certification named with its code | 54 |
| legitimate | colour or dye as a general word (stain chemistry, fluorescence, branding) — no colour-repair offer in the sentence | 54 |
| legitimate | upholstery in the real CCW hands-on workshop, a standard title or a business type (not a course offer) | 44 |
| legitimate | registry-computed CEC value beside the words | 43 |
| legitimate | negated or other-body accreditation | 37 |
| legitimate | explains how CECs work (third-person IICRC process) | 29 |
| legitimate | repair of a building, leak or machine (not a course offer) | 29 |
| legitimate | other bodies’ certification (ISO, HACCP, gas, vehicle, Cert IV) | 29 |
| legitimate | conditional stat chip: the label beside it says CEC hours are on approved courses only | 23 |
| legitimate | IICRC designation name quoted third-person (Color Repair / Carpet Repair and Reinstallation Technician) | 22 |
| legitimate | upholstery cleaning is a CARSI subject (data/seed/courses-catalog.json: introduction-to-upholstery-cleaning-and-drying) | 15 |
| legitimate | prospect search keyword or pain point (third-person research data) | 11 |
| legitimate | reviewed (line): learner states which IICRC certification they hold (third-person) | 10 |
| legitimate | format fact, not a statistic ("100% online") | 9 |
| legitimate | equipment model name (HydraMaster CDS xDrive) | 8 |
| legitimate | month abbreviation "Oct" | 7 |
| legitimate | reviewed (line): add-on service a cleaning business may refer out or offer under the IICRC CRT certification (third-person; the module teaches recognising it, not a CARSI course) | 5 |
| legitimate | reviewed (line): learner states which IICRC certification they hold; CRT is the IICRC colour repair certification, and onboarding routes CRT holders to carpet cleaning | 4 |
| legitimate | reviewed (line): the IICRC's own discipline map: what the IICRC CRT certification covers (third-person) | 3 |
| legitimate | reviewed (line): the IICRC's own discipline map, framed on /courses as a third-person reference, not CARSI courses | 2 |
| legitimate | reviewed (line): learner states which IICRC certification they hold (third-person; the question asks about the learner's own certifications) | 2 |
| legitimate | third-person: the IICRC's own certification training at IICRC-approved schools | 1 |
| legitimate | reinstallation as the IICRC designation name | 1 |
| not-public | code: identifier, comment or type | 1384 |
| not-public | test file | 1116 |
| not-public | generated code | 404 |
| not-public | staff-only admin surface | 310 |
| not-public | routing data: bare discipline code (render sites audited separately) | 269 |
| not-public | code: key, slug, path or URL string | 127 |
| not-public | model instruction (prompt text, not rendered verbatim) | 104 |
| not-public | internal tooling (course production, screencast, audit, video) | 69 |
| not-public | code: Markdown inline code (slug, key or command) | 39 |
| not-public | routing data: bare discipline code list | 38 |
| not-public | URL or site path | 27 |
| not-public | internal ops check (CEC drift report) | 14 |
| not-public | stylesheet | 10 |
| not-public | markup: tag name, attribute or id | 10 |
| not-public | instructor-only surface | 8 |
| not-public | instructor course builder | 8 |
| not-public | code: JSON key | 7 |
| owned-elsewhere | reviewed (line): reviews thread owns testimonials; reported to Phill | 5 |
| owned-elsewhere | reviewed (line): feat/designations-live owns the designations registry and its alsoEarnsCec flag; reported to Phill | 2 |
| owned-elsewhere | reviewed (line): reviews thread owns testimonials (brief: do not touch reviews); reported to Phill | 1 |

## Guard rule — out of scope here

`check:iicrc-terminology` keeps its round-2 rule. Bypass forms (punctuation between code and noun, JSX splits,
entities, zero-width characters, and ordinary modifiers such as "CARSI WRT online course") are covered on this
branch by the inventory's code-named-offering block (sentence scope, up to three modifiers), and the guard itself
is being redesigned on `feat/designations-live` (shared matcher plus rendered-text scan).


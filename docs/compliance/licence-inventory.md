# Licence inventory — IICRC codes, certification, CEC, accreditation and unsold subjects

One exhaustive pass, 18/10/2026 (review of `fix/industry-faq-licence` at ea205ee5). Scope: `app/`, `src/`, `public/`,
`docs/marketing`, `docs/content`. Terms: every official IICRC certification code (any case), `certif` (and "certs",
"IICRC credentials"), `CEC`, `accredit`, `board-approved`, and the unsold subjects repair, colour, upholstery, reinstall.
`data/` (course content) is outside this scope and stays covered by `check:iicrc-compliance`.

Generator: `node scripts/licence-inventory.mjs` (exit 1 on any exposure). Every row: `licence-inventory.csv` in this folder.
TS/TSX is parsed with the TypeScript compiler, so only string literals, template text and JSX text count as copy.
Enforced by `src/lib/marketing/licence-inventory.test.ts`.

## Counts

| Class | Hits |
| --- | ---: |
| fixed (copy changed in this round; classed as exposure by the final rules at ea205ee5) | 323 |
| legitimate (third-person, provider-level, conditional, registry-computed or learner record) | 1316 |
| not public (tests, generated, staff, tooling, prompts, identifiers, routing data) | 3754 |
| owned elsewhere (not edited here; listed for Phill) | 27 |
| exposure remaining | 0 |

## Fixed, by what the final rules called them at ea205ee5

| Rule | Hits |
| --- | ---: |
| no rule matches | 229 |
| CEC descriptor scoped to a topic or audience (implies those courses carry CECs) | 68 |
| promises CECs with no approval condition in the same sentence | 12 |
| static CEC course count | 7 |
| sells certification | 5 |
| course-level IICRC approval claim | 2 |

Files with fixed hits:

- `app/(dashboard)/dashboard/pathways/page.tsx` — 2
- `app/(public)/about/page.tsx` — 4
- `app/(public)/ai-website/page.tsx` — 1
- `app/(public)/industries/aged-care/page.tsx` — 8
- `app/(public)/industries/caravan-parks/page.tsx` — 7
- `app/(public)/industries/childcare/page.tsx` — 4
- `app/(public)/industries/commercial-cleaning/page.tsx` — 8
- `app/(public)/industries/construction/page.tsx` — 2
- `app/(public)/industries/data-centres/page.tsx` — 8
- `app/(public)/industries/education/page.tsx` — 5
- `app/(public)/industries/emergency-management/page.tsx` — 8
- `app/(public)/industries/facility-management/page.tsx` — 6
- `app/(public)/industries/food-processing/page.tsx` — 5
- `app/(public)/industries/government-defence/page.tsx` — 6
- `app/(public)/industries/gyms-fitness/page.tsx` — 9
- `app/(public)/industries/healthcare/page.tsx` — 6
- `app/(public)/industries/hospitality/page.tsx` — 8
- `app/(public)/industries/insurance/page.tsx` — 7
- `app/(public)/industries/mining/page.tsx` — 5
- `app/(public)/industries/museums-cultural/page.tsx` — 4
- `app/(public)/industries/ndis-disability/page.tsx` — 8
- `app/(public)/industries/page.tsx` — 2
- `app/(public)/industries/plumbing-trades/page.tsx` — 7
- `app/(public)/industries/property-management/page.tsx` — 5
- `app/(public)/industries/real-estate/page.tsx` — 8
- `app/(public)/industries/retail/page.tsx` — 5
- `app/(public)/industries/strata/page.tsx` — 5
- `app/(public)/industries/transport-logistics/page.tsx` — 3
- `app/(public)/pathways/[slug]/page.tsx` — 1
- `app/api/lms/[[...path]]/route.ts` — 1
- `app/api/lms/gamification/leaderboard/route.ts` — 1
- `app/layout.tsx` — 2
- `app/opengraph-image.tsx` — 2
- `docs/content/podcast-repurposing-engine.md` — 9
- `docs/content/scoping-quoting-course/course-overview.md` — 2
- `docs/content/scoping-quoting-course/lesson-outlines.md` — 1
- `docs/marketing/association-partnerships.md` — 13
- `docs/marketing/campaigns/cleaning-plus-campaign.md` — 11
- `docs/marketing/google-ads-campaign.md` — 52
- `docs/marketing/industry-icp-database.json` — 13
- `docs/marketing/linkedin-campaign.md` — 24
- `docs/marketing/synthex-campaign-context.md` — 6
- `public/llms.txt` — 1
- `public/manifest.json` — 1
- `src/components/ccw/CcwBusinessCoachingClient.tsx` — 1
- `src/components/ccw/CcwCarsiTruckmountClient.tsx` — 1
- `src/components/ccw/CcwWorkshopClient.tsx` — 2
- `src/components/industries/ContractorAddOns.tsx` — 1
- `src/components/industries/IndustryCourseSection.tsx` — 2
- `src/components/landing/AnimatedHero.tsx` — 1
- `src/components/lms/RenewalCockpit.tsx` — 2
- `src/components/lms/diagrams/CertificatePreview.tsx` — 1
- `src/components/marketing/about/AboutMissionPillars.tsx` — 1
- `src/components/seo/JsonLd.tsx` — 2
- `src/components/tools/CECCalculator.tsx` — 1
- `src/lib/ai-website/advisor.ts` — 2
- `src/lib/certificate/CertificateArt.tsx` — 1
- `src/lib/customer-journey-loop.ts` — 2
- `src/lib/marketing/industry-page-data.ts` — 3
- `src/lib/marketing/start-smart.ts` — 1
- `src/lib/schema/organization.ts` — 2
- `src/lib/server/proof-pack-pdf.ts` — 1

## Current hits by class and reason

| Class | Reason | Hits |
| --- | --- | ---: |
| legitimate | provider-level CEC standing | 166 |
| legitimate | third-person IICRC certification: obtained through IICRC schools, held, renewed or required by others | 153 |
| legitimate | reviewed file: learner’s own CEC record, submission or IICRC renewal (computed per learner) | 134 |
| legitimate | conditional or registry-computed CEC | 114 |
| legitimate | CARSI-issued certificate (document), not certification | 113 |
| legitimate | catalogue-wide CLAUDE.md descriptor (not scoped to a topic or audience) | 108 |
| legitimate | reviewed file: guide to the IICRC certifications government panels ask for (third-person; CARSI named only as CEC training) | 86 |
| legitimate | reviewed file: vehicle, gas and equipment compliance (not IICRC); equipment repair | 86 |
| legitimate | reviewed file: third-person IICRC designation and standard names, quoted from the issuer | 58 |
| legitimate | learner CEC record, tracking and renewal (the learner’s own IICRC certification) | 48 |
| legitimate | reviewed file: cost comparison written to the licence rule: third-person IICRC certification fee vs CARSI courses | 38 |
| legitimate | upholstery in the real CCW hands-on workshop, a standard title or a business type (not a course offer) | 37 |
| legitimate | explains how CECs work (third-person IICRC process) | 21 |
| legitimate | reviewed file: renewal calculator for a learner’s existing IICRC certification; issuer’s names; rule from iicrc.org/ausfaqs | 19 |
| legitimate | reviewed file: survey questions about respondents’ own IICRC certifications (third-person) | 18 |
| legitimate | reviewed file: legal / support process: CEC reporting for a learner’s existing IICRC certification | 17 |
| legitimate | registry-computed CEC value beside the words | 14 |
| legitimate | negated or other-body accreditation | 13 |
| legitimate | third-person IICRC certification named with its code | 13 |
| legitimate | prospect search keyword or pain point (third-person research data) | 12 |
| legitimate | reviewed file: learner states which IICRC certifications they hold (third-person, issuer’s subjects) | 11 |
| legitimate | repair of a building, leak or machine (not a course offer) | 10 |
| legitimate | reviewed file: label rendered only when the course carries approved CEC hours (cec_hours / cecLabel from the registry) | 9 |
| legitimate | reviewed file: quiz distractors and third-person IICRC facts | 6 |
| legitimate | month abbreviation "Oct" | 5 |
| legitimate | colour as a general word (dye stability, colourless gas) | 3 |
| legitimate | IICRC designation name quoted third-person (Color Repair / Carpet Repair and Reinstallation Technician) | 2 |
| legitimate | other bodies’ certification (ISO, HACCP, gas, vehicle, Cert IV) | 1 |
| legitimate | reviewed file: CEC audience line rendered only when the course has cec_hours (an in-force approval) | 1 |
| not-public | code: identifier, comment or type | 1359 |
| not-public | test file | 1057 |
| not-public | generated code | 404 |
| not-public | staff-only admin surface | 309 |
| not-public | routing data: bare discipline code (render sites audited separately) | 276 |
| not-public | model instruction (prompt text, not rendered verbatim; reviewed for licence-safe wording) | 102 |
| not-public | code: key, slug, path or URL string | 88 |
| not-public | internal tooling (course production, screencast, audit, video) | 62 |
| not-public | routing data: bare discipline code list | 38 |
| not-public | internal ops check (CEC drift report) | 14 |
| not-public | URL or site path | 12 |
| not-public | stylesheet | 10 |
| not-public | instructor-only surface | 8 |
| not-public | instructor course builder | 8 |
| not-public | code: JSON key | 7 |
| owned-elsewhere | membership branch owns app/(public)/subscribe/* (brief: do not touch) | 17 |
| owned-elsewhere | reviews thread owns testimonials (brief: do not touch reviews) | 7 |
| owned-elsewhere | feat/designations-live owns the designations registry and its alsoEarnsCec flag | 3 |

## Render audit — where a discipline code reaches the screen

Bare codes (`'WRT'`) are routing data. These are every JSX/server site that rendered a code or an IICRC name:

| Site | Before | Now |
| --- | --- | --- |
| src/components/lms/PathwayAdvisor.tsx (/pathways) | pill printed the code | plain-English subject, de-duplicated; rendered test |
| app/(public)/pathways/[slug]/page.tsx | "IICRC {code}" badge, course badges, "Builds toward {target}" | subject label; target suppressed when it names IICRC, a certification or a code |
| src/components/lms/LearningPathwayCard.tsx, PathwayProgressCard.tsx | printed target_certification | same fail-closed target filter |
| src/components/lms/RecommendationWidget.tsx, CourseSearchBar.tsx | printed iicrc_discipline code | subject label |
| app/(public)/ideas/page.tsx | printed iicrc_discipline code | subject label |
| app/(public)/about/page.tsx | code + IICRC designation name under "IICRC CEC Accredited course catalogue" | CARSI subjects under "Course catalogue by subject" |
| src/components/lms/LinkedInShareButton.tsx | certification name "{course} ({code})" | course title only |
| src/components/tools/CECCalculator.tsx | "Browse {code} Courses"; "To earn your {code} certification, start with the courses below"; wrong names; 14/21 CECs per 3 years | issuer names; IICRC-only certification wording; 14 CECs every four years, two for Master (iicrc.org/ausfaqs) |
| src/lib/certificate/CertificateArt.tsx, diagrams/CertificatePreview.tsx | IICRC designation name as the discipline; "completed the accredited programme" | CARSI subject; "completed the CARSI programme" |
| src/components/industries/DisciplinePill.tsx | "{code} · {label}" | label only |
| app/api/lms/[[...path]]/route.ts (course-page career keywords) | CRT → "Carpet repair technician" | carpet cleaning keywords |
| src/lib/server/onboarding-pathway.ts | CRT → "We prioritised colour repair courses" | CRT holders mapped to carpet cleaning (a subject CARSI sells); tested |
| src/components/lms/onboarding-flow.tsx | "CRT — Carpet" (wrong designation) | "CRT — Colour repair" (the learner's own IICRC certification, third-person) |
| Learner record surfaces (credentials, renewal cockpit, verify, proof pack) | learner's own IICRC discipline | unchanged: third-person, the learner's own certification |

## Owned elsewhere — not edited here

- `app/(public)/designations/[slug]/page.tsx` — feat/designations-live owns the designations registry and its alsoEarnsCec flag
- `app/(public)/designations/page.tsx` — feat/designations-live owns the designations registry and its alsoEarnsCec flag
- `app/(public)/subscribe/layout.tsx` — membership branch owns app/(public)/subscribe/* (brief: do not touch)
- `app/(public)/subscribe/page.tsx` — membership branch owns app/(public)/subscribe/* (brief: do not touch)
- `app/(public)/subscribe/success/page.tsx` — membership branch owns app/(public)/subscribe/* (brief: do not touch)
- `app/(public)/testimonials/page.tsx` — reviews thread owns testimonials (brief: do not touch reviews)
- `src/components/designations/DesignationCard.tsx` — feat/designations-live owns the designations registry and its alsoEarnsCec flag

## Guard bypass forms — out of scope here

`check:iicrc-terminology` keeps the round-2 rule unchanged. The reviewer's bypass forms — "WRT: training",
"WRT/training", a non-breaking hyphen, `<span>WRT</span> training`, and JSX splits, string concatenation, HTML
entities and zero-width characters generally — are out of scope on this branch: the guard is being redesigned on
`feat/designations-live` as a shared matcher plus a rendered-text scan. This inventory covers the copy itself.


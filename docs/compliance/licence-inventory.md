# Licence inventory — IICRC codes, certification, CEC, accreditation, unsold subjects, counted claims

Exhaustive pass, 19/10/2026, on `fix/industry-faq-licence-v2` (based on origin/main 989d8491).
Generator: `node scripts/licence-inventory.mjs` (exit 1 on any exposure); every row is in `licence-inventory.csv`.
Enforced by `src/lib/marketing/licence-inventory.test.ts`.

- **Scope**: every file under `app/`, `src/` and `public/` — the surfaces carsi.com.au serves — including the
  extracted text of every public PDF (`scripts/pdf-text.mjs`). `docs/` is out of scope here: marketing and
  campaign plans are reviewed on `fix/marketing-docs-licence` and stay covered by `check:iicrc-compliance`.
- **Terms**: all 36 official IICRC certification codes (any case); `certif`, "certs", "IICRC credentials/creds";
  `CEC`; `accredit`; `board-approved`; IICRC-branded offerings ("IICRC … training/course/credential/bundle");
  repair, colour/dye, upholstery, reinstall; and counted claims about the world ("537 councils",
  "500+ technicians") on every surface.
- **Sentence scope**: rules see only the sentence containing the hit (JSX blocks with inline tags masked), so a
  legitimate phrase elsewhere on the line cannot excuse a claim. TS/TSX is parsed, so only rendered text counts.
- **Exemptions are per line**: `scripts/licence-inventory-reviewed.json` names the file, line, exact text and reason;
  the test fails if an entry no longer matches its line. No file-wide or route-wide allowances remain.

## Counts

| Class                                                                                           | Hits |
| ----------------------------------------------------------------------------------------------- | ---: |
| fixed (exposures on origin/main 989d8491 under the final rules, removed by this branch)         |  645 |
| legitimate (named sentence rule or reviewed line)                                               | 1207 |
| not public (tests, generated, staff, tooling, prompts, identifiers, routing data, markup, URLs) | 4026 |
| owned elsewhere (reviewed line; not edited here; listed for Phill)                              |    8 |
| exposure remaining                                                                              |    0 |

## Public PDFs

| File                                                                             | Source                                                       | Action                                                                                                    |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `public/downloads/carsi-government-contractor-guide.pdf`                         | `docs/marketing/lead-magnets/government-contractor-guide.md` | regenerated with `node scripts/generate-lead-magnet-pdf.mjs`; text checked against the source by the test |
| `public/courses/ccw-carsi-truckmount/CCW-CARSI-Truckmount-Operations-Course.pdf` | no generator in the repo                                     | text scanned: 0 exposures, kept                                                                           |

## Per-line exemptions (reviewed)

| File                                                 | Line | Class           | Reason                                                                                                                                                 |
| ---------------------------------------------------- | ---: | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/lms/onboarding-flow.tsx`             |  119 | legitimate      | learner states which IICRC certification they hold (third-person; the question asks about the learner's own certifications)                            |
| `src/components/lms/onboarding-flow.tsx`             |  120 | legitimate      | learner states which IICRC certification they hold; CRT is the IICRC colour repair certification, and onboarding routes CRT holders to carpet cleaning |
| `src/components/lms/onboarding-flow.tsx`             |  121 | legitimate      | learner states which IICRC certification they hold (third-person)                                                                                      |
| `src/components/lms/onboarding-flow.tsx`             |  122 | legitimate      | learner states which IICRC certification they hold (third-person)                                                                                      |
| `src/components/lms/onboarding-flow.tsx`             |  123 | legitimate      | learner states which IICRC certification they hold (third-person)                                                                                      |
| `src/components/lms/onboarding-flow.tsx`             |  124 | legitimate      | learner states which IICRC certification they hold (third-person)                                                                                      |
| `src/components/lms/onboarding-flow.tsx`             |  125 | legitimate      | learner states which IICRC certification they hold (third-person)                                                                                      |
| `src/components/lms/diagrams/IICRCDisciplineMap.tsx` |   16 | legitimate      | the IICRC's own discipline map, framed on /courses as a third-person reference, not CARSI courses                                                      |
| `src/components/lms/diagrams/IICRCDisciplineMap.tsx` |   18 | legitimate      | the IICRC's own discipline map: what the IICRC CRT certification covers (third-person)                                                                 |
| `app/(public)/designations/[slug]/page.tsx`          |   48 | owned-elsewhere | feat/designations-live owns the designations registry and its alsoEarnsCec flag; reported to Phill                                                     |
| `src/components/designations/DesignationCard.tsx`    |   32 | owned-elsewhere | feat/designations-live owns the designations registry and its alsoEarnsCec flag; reported to Phill                                                     |
| `app/(public)/testimonials/page.tsx`                 |   21 | owned-elsewhere | reviews thread owns testimonials (brief: do not touch reviews); reported to Phill                                                                      |
| `app/(public)/testimonials/page.tsx`                 |   29 | owned-elsewhere | reviews thread owns testimonials; reported to Phill                                                                                                    |
| `app/(public)/testimonials/page.tsx`                 |   36 | owned-elsewhere | reviews thread owns testimonials; reported to Phill                                                                                                    |
| `app/(public)/testimonials/page.tsx`                 |   54 | owned-elsewhere | reviews thread owns testimonials; reported to Phill                                                                                                    |

## Fixed, by what the final rules called them on main

| Rule                                                                            | Hits |
| ------------------------------------------------------------------------------- | ---: |
| no rule matches                                                                 |  515 |
| CEC descriptor scoped to a topic or audience (implies those courses carry CECs) |   78 |
| CARSI offering named with an IICRC code (any modifiers in between)              |   22 |
| unsold carpet- or colour-repair training offered                                |   14 |
| promises CECs with no approval condition in the same sentence                   |   10 |
| static CEC course count                                                         |    3 |
| sells certification                                                             |    2 |
| every course or module promised CECs                                            |    1 |

Files with fixed hits:

- `app/(dashboard)/dashboard/credentials/[credentialId]/page.tsx` — 2
- `app/(dashboard)/dashboard/pathways/page.tsx` — 5
- `app/(public)/about/page.tsx` — 7
- `app/(public)/ai-website/page.tsx` — 3
- `app/(public)/courses/page.tsx` — 2
- `app/(public)/events/ccw-roadshow/success/page.tsx` — 1
- `app/(public)/industries/aged-care/page.tsx` — 11
- `app/(public)/industries/caravan-parks/page.tsx` — 29
- `app/(public)/industries/childcare/page.tsx` — 18
- `app/(public)/industries/commercial-cleaning/page.tsx` — 37
- `app/(public)/industries/construction/page.tsx` — 9
- `app/(public)/industries/data-centres/page.tsx` — 32
- `app/(public)/industries/education/page.tsx` — 20
- `app/(public)/industries/emergency-management/page.tsx` — 35
- `app/(public)/industries/facility-management/page.tsx` — 9
- `app/(public)/industries/food-processing/page.tsx` — 30
- `app/(public)/industries/government-defence/page.tsx` — 18
- `app/(public)/industries/gyms-fitness/page.tsx` — 32
- `app/(public)/industries/healthcare/page.tsx` — 11
- `app/(public)/industries/hospitality/page.tsx` — 18
- `app/(public)/industries/insurance/page.tsx` — 12
- `app/(public)/industries/mining/page.tsx` — 16
- `app/(public)/industries/museums-cultural/page.tsx` — 28
- `app/(public)/industries/ndis-disability/page.tsx` — 26
- `app/(public)/industries/page.tsx` — 6
- `app/(public)/industries/plumbing-trades/page.tsx` — 37
- `app/(public)/industries/property-management/page.tsx` — 17
- `app/(public)/industries/real-estate/page.tsx` — 20
- `app/(public)/industries/retail/page.tsx` — 18
- `app/(public)/industries/strata/page.tsx` — 18
- `app/(public)/industries/transport-logistics/page.tsx` — 33
- `app/(public)/pathways/[slug]/page.tsx` — 1
- `app/(public)/resources/government-restoration-panels/page.tsx` — 1
- `app/(public)/subscribe/layout.tsx` — 1
- `app/(public)/subscribe/success/page.tsx` — 1
- `app/api/lms/[[...path]]/route.ts` — 1
- `app/api/lms/gamification/leaderboard/route.ts` — 1
- `app/opengraph-image.tsx` — 3
- `public/downloads/carsi-government-contractor-guide.pdf` — 12
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
- `src/lib/marketing/industry-page-data.ts` — 7
- `src/lib/marketing/start-smart.ts` — 4
- `src/lib/schema/organization.ts` — 3
- `src/lib/server/onboarding-pathway.ts` — 2
- `src/lib/server/proof-pack-pdf.ts` — 3
- `src/lib/server/public-catalogue-facts.ts` — 1

## Current hits by class and reason

| Class           | Reason                                                                                                                                                                  | Hits |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---: |
| legitimate      | third-person IICRC certification: obtained through IICRC schools, held, renewed or required by others                                                                   |  238 |
| legitimate      | CARSI-issued certificate (document), not certification                                                                                                                  |  204 |
| legitimate      | conditional or registry-computed CEC                                                                                                                                    |  153 |
| legitimate      | provider-level CEC standing                                                                                                                                             |  124 |
| legitimate      | catalogue-wide CLAUDE.md descriptor (not scoped to a topic or audience)                                                                                                 |  122 |
| legitimate      | learner CEC record, tracking and renewal (the learner’s own IICRC certification)                                                                                        |  102 |
| legitimate      | registry-computed CEC value beside the words                                                                                                                            |   42 |
| legitimate      | upholstery in the real CCW hands-on workshop, a standard title or a business type (not a course offer)                                                                  |   36 |
| legitimate      | explains how CECs work (third-person IICRC process)                                                                                                                     |   27 |
| legitimate      | conditional stat chip: the label beside it says CEC hours are on approved courses only                                                                                  |   23 |
| legitimate      | other bodies’ certification (ISO, HACCP, gas, vehicle, Cert IV)                                                                                                         |   23 |
| legitimate      | negated or other-body accreditation                                                                                                                                     |   18 |
| legitimate      | equipment model name (HydraMaster CDS xDrive)                                                                                                                           |   16 |
| legitimate      | IICRC designation name quoted third-person (Color Repair / Carpet Repair and Reinstallation Technician)                                                                 |   13 |
| legitimate      | repair of a building, leak or machine (not a course offer)                                                                                                              |   12 |
| legitimate      | third-person IICRC certification named with its code                                                                                                                    |   12 |
| legitimate      | reviewed (line): learner states which IICRC certification they hold (third-person)                                                                                      |   10 |
| legitimate      | colour or dye as a general word (stain chemistry, fluorescence, branding) — no colour-repair offer in the sentence                                                      |    7 |
| legitimate      | PDF table row: the IICRC designation name ("… Technician") in the cell before its code                                                                                  |    6 |
| legitimate      | licence-compliance note: states what is NOT claimed or branded                                                                                                          |    5 |
| legitimate      | reviewed (line): learner states which IICRC certification they hold; CRT is the IICRC colour repair certification, and onboarding routes CRT holders to carpet cleaning |    4 |
| legitimate      | reviewed (line): the IICRC's own discipline map: what the IICRC CRT certification covers (third-person)                                                                 |    3 |
| legitimate      | upholstery cleaning is a CARSI subject (data/seed/courses-catalog.json: introduction-to-upholstery-cleaning-and-drying)                                                 |    2 |
| legitimate      | reviewed (line): the IICRC's own discipline map, framed on /courses as a third-person reference, not CARSI courses                                                      |    2 |
| legitimate      | reviewed (line): learner states which IICRC certification they hold (third-person; the question asks about the learner's own certifications)                            |    2 |
| legitimate      | headcount of the guide’s illustrative example business (labelled indicative), not a claim about the world                                                               |    1 |
| not-public      | code: identifier, comment or type                                                                                                                                       | 1406 |
| not-public      | test file                                                                                                                                                               | 1243 |
| not-public      | generated code                                                                                                                                                          |  466 |
| not-public      | staff-only admin surface                                                                                                                                                |  310 |
| not-public      | routing data: bare discipline code (render sites audited separately)                                                                                                    |  262 |
| not-public      | model instruction (prompt text, not rendered verbatim)                                                                                                                  |  105 |
| not-public      | code: key, slug, path or URL string                                                                                                                                     |   93 |
| not-public      | internal tooling (course production, screencast, audit, video)                                                                                                          |   69 |
| not-public      | URL or site path                                                                                                                                                        |   15 |
| not-public      | internal ops check (CEC drift report)                                                                                                                                   |   14 |
| not-public      | stylesheet                                                                                                                                                              |   10 |
| not-public      | markup: tag name, attribute or id                                                                                                                                       |   10 |
| not-public      | instructor-only surface                                                                                                                                                 |    8 |
| not-public      | instructor course builder                                                                                                                                               |    8 |
| not-public      | code: JSON key                                                                                                                                                          |    7 |
| owned-elsewhere | reviewed (line): reviews thread owns testimonials; reported to Phill                                                                                                    |    5 |
| owned-elsewhere | reviewed (line): feat/designations-live owns the designations registry and its alsoEarnsCec flag; reported to Phill                                                     |    2 |
| owned-elsewhere | reviewed (line): reviews thread owns testimonials (brief: do not touch reviews); reported to Phill                                                                      |    1 |

## Guard rule — out of scope here

`check:iicrc-terminology` keeps its round-2 rule. Bypass forms (punctuation between code and noun, JSX splits,
entities, zero-width characters, and ordinary modifiers such as "CARSI WRT online course") are covered on this
branch by the inventory's code-named-offering block (sentence scope, up to three modifiers), and the guard itself
is being redesigned on `feat/designations-live` (shared matcher plus rendered-text scan).

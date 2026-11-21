# GP-525: carpet-course CEC reconciliation

Audit date: 21/11/2026. Branch `claude/gp-525-carpet-cec-reconcile`, based on main `9f709922`.
Linear: GP-525 (Urgent, `needs-phill-signoff`). GitHub mirror: CleanExpo/CARSI#669.

**Scope.** Every carpet, upholstery and textile-floor course, plus the floor-care, truckmount and
CCW workshop courses that sit next to them. Surfaces checked: `data/seed/courses-catalog.json`,
`data/wordpress-export/courses.json`, `data/seed/cec-professional-assignments.json`,
`data/seo/course-cards/*`, the membership catalogue snapshot, `public/courses/**`, carpet pages
under `app/(public)`, the CEC resolvers (`src/lib/seed/cec-hours.ts`,
`src/lib/server/course-cec-hours.ts`), email templates, JSON-LD and `docs/marketing` and `docs/content`.

**Sources of truth.** `data/seed/cec-approvals.json` (38 approved entries). `CEC_APPROVED_SLUGS` in
`scripts/check-iicrc-compliance.mjs` is loaded from that registry at run time
(`loadApprovedSlugsFromRegistry`), so it matches the registry by construction.

**Approval records that cover carpet or upholstery:**

| Registry slug | Hours | Approved | Expires | Reference |
|---|---|---|---|---|
| `introduction-to-basic-carpet-cleaning-and-drying` | 1 | 2024-01-18 | 2027-01-18 | IICRC CEC class listing, batch 2024-01-18 |
| `introduction-to-upholstery-cleaning-and-drying` | 1 | 2024-05-06 | 2027-05-06 | IICRC CEC class listing, batch 2024-05-06 (note: WP slug `upholstery`) |

No other carpet, upholstery or textile slug has an approval record.

## Reconciliation table

Verdicts: **match** (the claim equals the approval record), **mismatch** (the claimed hours differ
from the approval record), **unapproved claim** (CEC hours claimed with no approval record),
**wording breach** (the public-language rule is broken), **no claim** (the course makes no CEC claim
and has no approval record, which is correct).

| # | Slug | Surface / file:line | Claimed CEC hours | Approval record | Verdict |
|---|---|---|---|---|---|
| 1 | `introduction-to-basic-carpet-cleaning-and-drying` | `data/seed/courses-catalog.json:9235` (`cecHours`) | 1 | registry, 1 h, 2024-01-18, expires 2027-01-18 | match |
| 2 | `introduction-to-upholstery-cleaning-and-drying` | `data/seed/courses-catalog.json:9441` (`cecHours`, status draft) | 1 | registry, 1 h, 2024-05-06, expires 2027-05-06 | match |
| 3 | `carpet-cleaning` (WP legacy; `cec-professional-assignments.json:87` aliases it to the LMS slug in row 1) | `data/wordpress-export/courses.json:3145` (`short_description`: "approved for IICRC Continuing Education Credit (CEC): 1 Hour") and `:3155` (`cec_hours: 1`) | 1 | NONE for slug `carpet-cleaning`. Same title and hours as registry row 1, but no exact-slug record. | unapproved claim under the exact-slug rule. Content matches row 1. **Founder decision F1.** |
| 4 | `carpet-cleaning-basics` (WP legacy; live LMS slug `carpet-cleaning-basics-b66757ce`, aliased at `cec-professional-assignments.json:83`) | `data/wordpress-export/courses.json:5185` (`short_description`: "approved for IICRC Continuing Education Credit (CEC) : 3 Hours") and `:5195` (`cec_hours: 3`) | 3 | NONE. No registry entry has a matching title. | unapproved claim. **Founder decision F2.** |
| 5 | `carpet-cleaning-basics` | `data/seed/cec-professional-assignments.json:104` (`"carpet-cleaning-basics": 3`) | 3 (reviewer assignment) | NONE | unapproved value in data. Not rendered: `getProfessionalCecAssignment` has no caller. **Founder decision F3.** |
| 6 | `upholstery` (WP legacy) | `data/wordpress-export/courses.json:2530` (`short_description`: "CEC Credits … 1 Hour") and `:2540` (`cec_hours: null`) | 1 (prose only) | Registry row 2 (1 h), which names WP slug `upholstery` in its note | match on hours and on the registry note. The exact slug differs. **Founder decision F1.** |
| 7 | `tile-cleaning-for-carpet-cleaners` (DB-only LMS course) | `data/seed/cec-professional-assignments.json:109` (`: 1`) | 1 (reviewer assignment) | NONE | unapproved value in data. Not rendered (dead accessor). Its SEO card and membership snapshot carry no CEC. **Founder decision F3.** |
| 8 | `commercial-carpet-core` (DB-only LMS course) | `data/seo/course-cards/commercial-carpet-core.json`, membership snapshot | none | NONE | no claim |
| 9 | `carpet-cleaning-fundamentals` (CARSI Carpet Cleaning Practitioner, draft) | `data/seed/courses-catalog.json:7997` (`cecHours: 0`), `iicrcDiscipline: null`, `meta.designation` set | 0 | NONE | no claim. Correct fail-closed state. S100 and S500 are cited nominatively. |
| 10 | `ccw-2-day-workshop` (unlisted) | `data/seed/courses-catalog.json:12238` (`cecHours: 0`); copy says "carries no IICRC CECs" | 0 | NONE | no claim |
| 11 | `commercial-floor-care-schools-childcare` (draft) | `data/seed/courses-catalog.json:2856` (`cecHours: 0`); "not IICRC CEC accredited" | 0 | NONE | no claim |
| 12 | `ccw-carsi-truckmount-operations` | `data/seed/courses-catalog.json:4710` (`cecHours: 0`); `public/courses/ccw-carsi-truckmount/course-pack.html` has no CEC claim | 0 | NONE | no claim |
| 13 | `floor-care-onboarding-operational-readiness` | `data/seed/courses-catalog.json:3437` (`cecHours: 0`); excluded in `cec-professional-assignments.json` | 0 | NONE | no claim |
| 14 | `neosan-labs-product-training` (product training, mentions carpet) | `data/seed/courses-catalog.json` (`cecHours: 0`) | 0 | NONE | no claim |
| 15 | Carpet workshop page | `src/components/workshop/CarsiWorkshopPage.tsx:75,81,100` | none ("No IICRC CECs are attached") | n/a | no claim. The wording is compliant. |
| 16 | Commercial-cleaning industry page | `app/(public)/industries/commercial-cleaning/page.tsx:42-93` | none (CEC "on approved courses") | n/a | no claim. The wording is compliant. |
| 17 | Carpet topic links | `src/lib/marketing/industry-track1-topics.ts:62,108` (links to row 1) | none | row 1 | no claim. The link goes to an approved course. |
| 18 | Carpet Google Ads (Campaign 5) | `docs/marketing/google-ads-campaign.md:295,298,300,301` | none | n/a | **wording breach, fixed (E1)** |
| 19 | Carpet LinkedIn ads (Segment 4 A/C) | `docs/marketing/linkedin-campaign.md:189,191,193,209` | "Earn real CECs" (unqualified) | n/a | **wording breach, fixed (E2)** |
| 20 | Cleaning Plus nurture and objections | `docs/marketing/campaigns/cleaning-plus-campaign.md:180,194,195` | "with CEC details" (unqualified) | n/a | **wording breach, fixed (E3)** |
| 21 | Government contractor guide | `docs/marketing/lead-magnets/government-contractor-guide.md:73` | none | n/a | factual error, fixed (E4): S300 was labelled "carpet"; it covers upholstery |

**How the code paths behave.** The numeric CEC badges are fail-closed for every row above.
`resolveCecHours`, which serves the WP-export and DB path, returns only `getApprovedCecHours(slug)`
and ignores the stored `cec_hours`. `resolveLmsCourseCecHours` reads only the registry.
`resolveCatalogCecHours` reads the registry first, and an explicit `0` blocks any derived value.
The raw `cec_hours: 1` and `cec_hours: 3` values in the WP export therefore cannot become a CEC
badge, schema value or certificate value.

The risk that remains is the **prose** in the WP `short_description` fields (rows 3, 4 and 6).
`db:seed-wp-export` copies that prose into `lms_courses` whenever it runs, as GP-527 found. These
lines are pinned in `scripts/iicrc-cec-known-exposure.json` and labelled NOT approval. No production
query was run, so whether the prose is live today is unverified.

## Edits made (wording only; no CEC data touched)

No `cecHours` value, approval record, price, `CEC_APPROVED_SLUGS` entry, WP export record or
known-exposure pin was changed. The only `noAiRewrite` course, `ozone-and-hydroxyl-generators-what-the-evidence-says`, is outside this scope and was not touched.

- **E1** `docs/marketing/google-ads-campaign.md` (Campaign 5, carpet cleaning):
  - "IICRC Cleaning Certification — Online" → "IICRC CEC Accredited Cleaning Courses"
  - "Win More Contracts with IICRC Creds" → "… with CARSI Creds"
  - "Stand out … with IICRC certifications. Carpet cleaning …" → "… with verifiable CARSI credentials … from an IICRC CEC Accredited provider"
  - "add IICRC credentials to your business" → "add CARSI credentials …"
  - Each original implied that CARSI delivers IICRC certification.
- **E2** `docs/marketing/linkedin-campaign.md` (Segment 4):
  - Removed an unsourced "3x more contracts" statistic.
  - Removed "IICRC credentials prove your team …" and the unqualified "CARSI delivers 40+ approved online courses". The registry holds 38 approvals, and many of them are on the legacy platform.
  - Replaced "Earn real CECs" with "CEC hours are shown only on courses the IICRC has approved".
  - "certify your entire network" → "train your entire network".
- **E3** `docs/marketing/campaigns/cleaning-plus-campaign.md`:
  - The day-7 email title changed from "The 3 IICRC certs that unlock restoration revenue … with CEC details" to "3 skill areas … CEC hours only where the IICRC has approved the course".
  - Removed "IICRC certification is the #1 requirement … CARSI gets you there faster than any face-to-face course".
  - Removed "CARSI's courses are IICRC board-approved — the same credential standard as any classroom course". It is replaced with the provider-standing statement.
- **E4** `docs/marketing/lead-magnets/government-contractor-guide.md:73`: "S300 (carpet)" → "S100 (carpet) and S300 (upholstery)". This is a nominative scope label only, and it passed `npm run verify:standards-claim`.

Line left in place for the founder: `cleaning-plus-campaign.md:196` compares the subscription
price with "face-to-face IICRC certification training at approved schools". That is a price
comparison, not a delivery claim, so it was not edited. See F4.

## Founder decisions needed

- **F1. Exact-slug mapping for the two approved legacy classes.** The WP slugs `carpet-cleaning` and
  `upholstery` show the same title and the same 1 hour as registry rows `introduction-to-basic-carpet-cleaning-and-drying`
  and `introduction-to-upholstery-cleaning-and-drying`. The upholstery registry note already names
  WP slug `upholstery`. Do you confirm these are the same IICRC-approved classes? If yes, the
  WP-export prose is accurate, but it still lives under unregistered slugs. If no, strip it.
  Approval was not inferred from the matching titles.
- **F2. `carpet-cleaning-basics`, 3 hours: unbacked.** No approval record exists. Choose (a) record
  the real IICRC approval in `cec-approvals.json`, or (b) strip "approved for IICRC Continuing
  Education Credit (CEC) : 3 Hours", the "CEC Credits" category and `cec_hours: 3` from
  `data/wordpress-export/courses.json` and from the live `lms_courses` row for
  `carpet-cleaning-basics-b66757ce`. Its known-exposure pins would then be removed.
- **F3. Stale reviewer CEC assignments.** `cec-professional-assignments.json` assigns `carpet-cleaning-basics: 3`
  and `tile-cleaning-for-carpet-cleaners: 1`. Neither has an approval record. The accessor
  `getProfessionalCecAssignment` has no caller, so nothing renders. Decide whether to delete the
  `assignments` block, which is CEC data and so founder-only.
- **F4. Price comparison wording.** Decide whether `cleaning-plus-campaign.md:196`, which compares the price with IICRC certification training, may stay.

## Guard evidence

All six guards ran on this branch after the edits:

| Command | Exit | Result |
|---|---|---|
| `npm run check:iicrc-terminology` | 0 | passed |
| `npm run check:iicrc-compliance` | 0 | passed; prints the GP-525 known-exposure banner (372 pinned lines in 60 records) |
| `npm run check:cec` | 0 | 38 entries (38 approved); 16 approvals expire within 90 days (warning only) |
| `npm run check:cec-surfaces` | 0 | passed |
| `npm run check:cec-course-brand` | 0 | 38 CEC-approved courses, 166 surfaces, no CCW brand |
| `npm run check:au-english` | 0 | 28 draft files across 7 drafts |

**Planted-input check (a silent guard is not a pass).** `docs/marketing/zz-gp525-plant.md` was
created with "Carpet Cleaning Basics earns 3 IICRC CEC hours. Get IICRC certified with CARSI on
this IICRC-approved course."
- `check:iicrc-compliance` exited **1**. It flagged the "IICRC certified" phrase, the bare "IICRC-approved" and the numbered CEC-hour claim.
- `check:iicrc-terminology` exited **1**.
- The plant was then deleted.

My first rewrite of E3 ("earn IICRC CECs where the IICRC has approved the course") also made
`check:iicrc-terminology` exit 1. It was reworded to provider standing before commit.

**Guard gap found (not fixed here).** A second plant carried the exact breach lines fixed in
E1 and E3: "IICRC Cleaning Certification — Online", "IICRC board-approved — the same credential
standard as any classroom course" and "Stand out from competitors with IICRC certifications.
Carpet cleaning …". `check:iicrc-compliance` **exited 0** on it. The guard does not catch
"IICRC … Certification" used as a product label, "IICRC board-approved", or "IICRC
certifications / credentials" offered as what CARSI delivers. Tightening those rules is
separate guard work for `ci-infra-carsi`.

`npm run type-check` was not run. This pass changes only Markdown and touches no code.

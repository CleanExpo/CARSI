# GP-567 D1 — Reconciled catalogue inventory

Generated `2026-09-07T07:55:49Z` by `scripts/audit/build-inventory.mjs`.
Live snapshot access date: **2026-09-07** (`.audit-cache/`).

## Source counts — observed this run

| Source | Count |
| --- | ---: |
| `live_sitemap_course_urls` | 80 |
| `live_jsonld_itemlist_entries` | 80 |
| `legacy_wordpress_export_records` | 95 |
| `legacy_published` | 84 |
| `seed_catalog_courses` | 71 |
| `total_distinct_slugs` | 182 |

## Counts the card claims — NOT reproduced

GP-567 states **93 planned / 5 seeded** and **31 parity gaps**. This run observed
**71 seed courses** and
**78 legacy-only parity gaps**. The card's figures are
recorded as UNOBSERVED and must not be cited as verified until reconciled.

## Reconciliation status counts

| Status | Count | Meaning |
| --- | ---: | --- |
| `LEGACY_ONLY_PARITY_GAP` | 78 | In the WordPress legacy only — the parity-gap class |
| `LIVE_AND_SEED_NOT_IN_LEGACY` | 45 | Live and seeded, no legacy record |
| `SEED_ONLY_NOT_LIVE` | 24 | In the repo seed only — not live, no legacy record |
| `LIVE_ONLY` | 18 | Live with no local source record at all |
| `LIVE_AND_LEGACY_NOT_SEEDED` | 15 | Live and in legacy, but absent from the repo seed catalogue |
| `ALL_THREE` | 2 | Live, in the WordPress legacy, and in the repo seed |

**Total distinct courses across all three sources: 182.**

## Every course, one status each

| Slug | Status | Legacy CEC hrs | Legacy IICRC discipline | Seed CEC hrs |
| --- | --- | ---: | --- | ---: |
| `adjusters` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `admin-sole-trader` | LEGACY_ONLY_PARITY_GAP | 4 | — | — |
| `advanced-applied` | LEGACY_ONLY_PARITY_GAP | — | ASD | — |
| `advancedstructural` | LEGACY_ONLY_PARITY_GAP | — | ASD | — |
| `affiliate-membership` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `agi-smallbusiness` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `air-movers-for-professional-restoration-specs-selection-on-site-assessment` | LIVE_ONLY | — | — | — |
| `air-quality-and-odour` | LEGACY_ONLY_PARITY_GAP | — | OCT | — |
| `air-quality-and-odour-identification-and-deodorisation-essentials` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `antiques` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `applied-microbial` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `asbestos` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `asbestos-awareness-for-restoration-technicians` | SEED_ONLY_NOT_LIVE | — | — | 0 |
| `asd-structural-drying-core` | LIVE_ONLY | — | — | — |
| `assessing-indoor-environment-conditions` | SEED_ONLY_NOT_LIVE | — | — | 0 |
| `asthmaallergy` | LEGACY_ONLY_PARITY_GAP | 6 | — | — |
| `avian-influenza-awareness-restoration-iaq-facilities` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `biologicalcontaminants` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `carpet-cleaning` | LEGACY_ONLY_PARITY_GAP | 1 | — | — |
| `carpet-cleaning-basics` | LEGACY_ONLY_PARITY_GAP | 3 | — | — |
| `carpet-cleaning-basics-b66757ce` | LIVE_ONLY | — | — | — |
| `carpet-cleaning-technician-fundamentals` | SEED_ONLY_NOT_LIVE | — | — | 0 |
| `carsi-chatgpt-ebook` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `carsi-maintenance-toolbox-talks-monthly-refreshers` | LIVE_ONLY | — | — | — |
| `category-3-sewage-black-water-remediation` | SEED_ONLY_NOT_LIVE | — | — | 0 |
| `cct-commercial-carpet-core` | LIVE_ONLY | — | — | — |
| `ccw-carsi-truckmount-operations` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `chat-gpt` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `collaborative-development-your-personal-ai-assistant` | LIVE_AND_LEGACY_NOT_SEEDED | — | — | — |
| `commercial-floor-care-schools-childcare` | SEED_ONLY_NOT_LIVE | — | — | 0 |
| `complex-water-losses` | LEGACY_ONLY_PARITY_GAP | — | WRT | — |
| `controlled-drying` | LEGACY_ONLY_PARITY_GAP | — | ASD | — |
| `dehumidifiers` | LEGACY_ONLY_PARITY_GAP | — | WRT | — |
| `difficult-materials` | LEGACY_ONLY_PARITY_GAP | — | ASD | — |
| `documenting-and-reporting-air-quality-improvements` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `donning-and-doffing-ppe` | LIVE_AND_LEGACY_NOT_SEEDED | 1 | — | — |
| `drying-healthcare` | LEGACY_ONLY_PARITY_GAP | — | ASD | — |
| `drying-techniques` | LEGACY_ONLY_PARITY_GAP | 1 | ASD | — |
| `drying-transportation` | LEGACY_ONLY_PARITY_GAP | — | ASD | — |
| `dryingprotocol` | LEGACY_ONLY_PARITY_GAP | — | ASD | — |
| `duct-cleaning` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `dust-and-particulates-in-indoor-air-control-and-cleaning-strategies` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `dust-particulates-in-indoor-air` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `educational` | LEGACY_ONLY_PARITY_GAP | — | ASD | — |
| `exterior-envelope-drying` | LEGACY_ONLY_PARITY_GAP | — | ASD | — |
| `fire-smoke-damage-restoration-fundamentals` | SEED_ONLY_NOT_LIVE | — | — | 0 |
| `floor-care-onboarding-operational-readiness` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `forensic` | LEGACY_ONLY_PARITY_GAP | — | WRT | — |
| `foundation-membership` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `free-library` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `fsrt-fire-smoke-restoration-core` | LIVE_ONLY | — | — | — |
| `fundamental-business-framework` | LIVE_AND_LEGACY_NOT_SEEDED | — | — | — |
| `glass-cleaning-course` | LIVE_AND_LEGACY_NOT_SEEDED | 1 | — | — |
| `heat-drying` | LEGACY_ONLY_PARITY_GAP | — | ASD | — |
| `hospitality` | LEGACY_ONLY_PARITY_GAP | — | ASD | — |
| `hvac-systems-and-indoor-air-quality` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `hvac-systems-and-indoor-air-quality-what-every-technician-should-know` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `hvacsystems` | LEGACY_ONLY_PARITY_GAP | — | ASD | — |
| `industrial-2` | LEGACY_ONLY_PARITY_GAP | — | ASD | — |
| `infection-control-in-child-care` | LIVE_AND_LEGACY_NOT_SEEDED | 3 | — | — |
| `infectious-control-for-the-business-owner` | LIVE_AND_LEGACY_NOT_SEEDED | 7 | — | — |
| `infrared` | LEGACY_ONLY_PARITY_GAP | — | ASD | — |
| `initial-inspection-report-course` | LEGACY_ONLY_PARITY_GAP | 1 | — | — |
| `insurance-adjusters-and-their-roles` | LIVE_ONLY | — | — | — |
| `introduction-to-advanced-applied-structural-drying` | LIVE_ONLY | — | — | — |
| `introduction-to-advanced-drying-equipment-and-methods` | ALL_THREE | 1 | ASD | 1 |
| `introduction-to-advanced-structural-drying-concepts` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-air-quality-fundamentals` | ALL_THREE | — | — | 1 |
| `introduction-to-applied-microbial-remediation` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-applied-structural-drying` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-asbestos-asbestos-awareness` | LIVE_ONLY | — | — | — |
| `introduction-to-basic-carpet-cleaning-and-drying` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-biological-contaminants-and-treatments` | SEED_ONLY_NOT_LIVE | — | — | 1 |
| `introduction-to-consulting-for-complex-water-losses` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-controlled-environment-drying-methods` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-creating-a-clean-air-environment` | LIVE_AND_LEGACY_NOT_SEEDED | — | — | — |
| `introduction-to-creating-a-clean-air-environment-best-practices-for-final-cleara` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-developing-a-drying-protocol` | SEED_ONLY_NOT_LIVE | — | — | 1 |
| `introduction-to-digital-moisture-mapping` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-drying-difficult-materials` | SEED_ONLY_NOT_LIVE | — | — | 1 |
| `introduction-to-drying-educational-and-institutional-sites` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `introduction-to-drying-health-care-facilities` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `introduction-to-drying-hospitality-and-lodging-sites` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `introduction-to-drying-industrial-and-manufacturing-sites` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `introduction-to-drying-techniques-and-equipment` | SEED_ONLY_NOT_LIVE | — | — | 1 |
| `introduction-to-drying-transportation-and-vehicles` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `introduction-to-exterior-envelope-drying-strategies` | SEED_ONLY_NOT_LIVE | — | — | 1 |
| `introduction-to-forensic-investigations-for-water-losses` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-hvac-systems-and-drying-strategies` | SEED_ONLY_NOT_LIVE | — | — | 1 |
| `introduction-to-iaq-and-mould` | LIVE_ONLY | — | — | — |
| `introduction-to-iaq-and-mould-understanding-airborne-spread` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `introduction-to-iaq-and-mould-understanding-airborne-spread-and-containment` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-improving-indoor-air-quality-after-water-damage` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-improving-indoor-air-quality-after-waterdamage` | LEGACY_ONLY_PARITY_GAP | — | WRT | — |
| `introduction-to-infrared-thermography-for-drying` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `introduction-to-large-loss-drying-projects` | SEED_ONLY_NOT_LIVE | — | — | 1 |
| `introduction-to-monitoring-air-quality-job-site` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `introduction-to-monitoring-air-quality-on-the-job-site` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-mould-identification-and-remediation` | SEED_ONLY_NOT_LIVE | — | — | 1 |
| `introduction-to-odour-control-and-removal-techniques` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-porous-materials-drying` | SEED_ONLY_NOT_LIVE | — | — | 1 |
| `introduction-to-project-management-for-water-losses` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-psychrometry-and-the-drying-process` | SEED_ONLY_NOT_LIVE | — | — | 1 |
| `introduction-to-psychrometry-science-and-calculations` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-recovery-of-submerged-items-and-contents` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `introduction-to-residential-duct-cleaning` | LIVE_ONLY | — | — | — |
| `introduction-to-restoration-of-antiques-and-fine-furnishings` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `introduction-to-safety-procedures-for-water-damage-work` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-smoke-and-soot-damage-restoration` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-structural-drying-concepts` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-ultraviolet-light-and-fluorescence` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `introduction-to-upholstery-cleaning-and-drying` | SEED_ONLY_NOT_LIVE | — | — | 1 |
| `introduction-to-using-personal-protective-equipment` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-water-damage-estimating` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-water-damage-in-commercial-buildings` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-water-damage-litigation-support` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `introduction-to-water-damage-marketing-and-sales` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-water-damage-principles` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-water-damage-restoration` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `introduction-to-water-damage-restoration-course` | LEGACY_ONLY_PARITY_GAP | 1 | WRT | — |
| `introduction-to-water-extraction-methods` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 1 |
| `job-safety-and-environmental-analysis-jsea-course` | LIVE_AND_LEGACY_NOT_SEEDED | 1 | — | — |
| `large-loss-mastery-course` | LIVE_ONLY | — | — | — |
| `large-loss-mastery-course-split-payment` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `large-loss-mastery-super-course` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `largelossdrying` | LEGACY_ONLY_PARITY_GAP | — | ASD | — |
| `laser-measure` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `level-1-mould-remediation` | LEGACY_ONLY_PARITY_GAP | 2 | — | — |
| `level-1-mould-remediation-2cc96b85` | LIVE_ONLY | — | — | — |
| `level-2-mould-remediation` | LEGACY_ONLY_PARITY_GAP | 4 | AMRT | — |
| `level-2-mould-remediation-30ee3492` | LIVE_ONLY | — | — | — |
| `level-3-mould-remediation` | LEGACY_ONLY_PARITY_GAP | 5 | AMRT | — |
| `level-3-mould-remediation-c5797369` | LIVE_ONLY | — | — | — |
| `litigation-support` | LEGACY_ONLY_PARITY_GAP | — | WRT | — |
| `marketing-course` | LEGACY_ONLY_PARITY_GAP | 1 | — | — |
| `membership` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `microbe-clean-basic-understanding-course` | LIVE_AND_LEGACY_NOT_SEEDED | 5 | — | — |
| `moisture-mapping` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `moisture-meter-course` | LIVE_AND_LEGACY_NOT_SEEDED | 3 | — | — |
| `moisture-mould-and-indoor-air-quality-understanding-the-link` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `mould-identification` | LEGACY_ONLY_PARITY_GAP | 1 | AMRT | — |
| `mould-remediation-fundamentals` | SEED_ONLY_NOT_LIVE | — | — | 0 |
| `neosan-labs-product-training-course` | LEGACY_ONLY_PARITY_GAP | 5 | — | — |
| `odour-control` | LEGACY_ONLY_PARITY_GAP | 1 | OCT | — |
| `porous-drying` | LEGACY_ONLY_PARITY_GAP | 1 | ASD | — |
| `psychrometry-building-science-for-drying` | SEED_ONLY_NOT_LIVE | — | — | 0 |
| `psychrometry-drying` | LEGACY_ONLY_PARITY_GAP | 1 | ASD | — |
| `refrigerant-dehumidifiers-for-water-loss-restoration` | LIVE_ONLY | — | — | — |
| `restoration-project-management-premium` | LIVE_ONLY | — | — | — |
| `risk-assessment-course` | LIVE_AND_LEGACY_NOT_SEEDED | 2 | — | — |
| `safe-work-method-statements-swms-course` | LIVE_AND_LEGACY_NOT_SEEDED | 1 | — | — |
| `safety-data-sheet-sds-course` | LIVE_AND_LEGACY_NOT_SEEDED | 2 | — | — |
| `safety-procedures` | LEGACY_ONLY_PARITY_GAP | 1 | WRT | — |
| `science` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `smokeandsoot` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `social-media-marketing` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `standard-operating-procedures-sop-course` | LIVE_AND_LEGACY_NOT_SEEDED | 1 | — | — |
| `structural-drying` | LEGACY_ONLY_PARITY_GAP | 1 | ASD | — |
| `structural-drying-2` | LEGACY_ONLY_PARITY_GAP | 1 | ASD | — |
| `structural-drying-fundamentals` | SEED_ONLY_NOT_LIVE | — | — | 0 |
| `submerged-items-recovery` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `technician-flow-chart` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `tile-cleaning-for-carpet-cleaners` | LIVE_ONLY | — | — | — |
| `timber-drying` | LEGACY_ONLY_PARITY_GAP | — | ASD | — |
| `timber-floor` | LEGACY_ONLY_PARITY_GAP | — | ASD | — |
| `timber-floor-assessment-restoration` | SEED_ONLY_NOT_LIVE | — | — | 0 |
| `trauma-crime-scene-decontamination-fundamentals` | SEED_ONLY_NOT_LIVE | — | — | 0 |
| `ultraviolet` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `upholstery` | LEGACY_ONLY_PARITY_GAP | — | ASD | — |
| `using-air-scrubbers-and-afds` | LEGACY_ONLY_PARITY_GAP | — | — | — |
| `using-air-scrubbers-and-afds-to-improve-job-site-air-quality` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |
| `using-atp-to-create-protocols` | LIVE_AND_LEGACY_NOT_SEEDED | 1 | — | — |
| `using-ppe` | LEGACY_ONLY_PARITY_GAP | 1 | — | — |
| `water-damage` | LEGACY_ONLY_PARITY_GAP | 1 | WRT | — |
| `water-damage-commercial` | LEGACY_ONLY_PARITY_GAP | 1 | WRT | — |
| `water-damage-estimating` | LEGACY_ONLY_PARITY_GAP | 1 | WRT | — |
| `water-damage-marketing` | LEGACY_ONLY_PARITY_GAP | — | WRT | — |
| `water-damage-restoration-fundamentals` | SEED_ONLY_NOT_LIVE | — | — | 0 |
| `water-extraction` | LEGACY_ONLY_PARITY_GAP | 1 | WRT | — |
| `water-losses` | LEGACY_ONLY_PARITY_GAP | — | WRT | — |
| `whs-fundamentals-for-restoration-and-cleaning-professionals` | SEED_ONLY_NOT_LIVE | — | — | 0 |
| `wrt-water-damage-essentials` | LIVE_AND_SEED_NOT_IN_LEGACY | — | — | 0 |


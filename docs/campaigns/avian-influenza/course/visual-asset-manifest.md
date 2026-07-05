# Visual Asset Manifest — Australian H5 Readiness Course

## Status

OpenAI image generation produced a clean course visual set for review and CARSI LMS implementation. These assets are intended to be copied into:

`public/images/campaigns/avian-influenza/course/`

## Generated image set

| Asset | Intended use | Public path |
| --- | --- | --- |
| `public-reporting-process-infographic.png` | Module 1 process visual | `/images/campaigns/avian-influenza/course/public-reporting-process-infographic.png` |
| `australian-coastal-seabird-editorial-hero.png` | Course landing hero | `/images/campaigns/avian-influenza/course/australian-coastal-seabird-editorial-hero.png` |
| `facility-inspection-exclusion-zone.png` | Module 2 / Module 3 field-readiness visual | `/images/campaigns/avian-influenza/course/facility-inspection-exclusion-zone.png` |
| `restoreassist-field-documentation-workflow.png` | Module 5 documentation workflow | `/images/campaigns/avian-influenza/course/restoreassist-field-documentation-workflow.png` |
| `assessment-screen-ui-concept.png` | Quiz / assessment UI direction | `/images/campaigns/avian-influenza/course/assessment-screen-ui-concept.png` |
| `course-landing-page-ui-concept.png` | LMS landing page UI direction | `/images/campaigns/avian-influenza/course/course-landing-page-ui-concept.png` |
| `lesson-dashboard-ui-concept.png` | Lesson player UI direction | `/images/campaigns/avian-influenza/course/lesson-dashboard-ui-concept.png` |

## WebP variants

Each asset also ships as a WebP conversion (sharp, quality 82) at the same public path with a `.webp` extension — 56–139 KB each versus 1–2 MB for the PNG originals. Prefer the `.webp` path when embedding directly; pages using `next/image` can keep referencing the PNG and let Next.js optimise delivery.

## Course placement plan

1. Hero: `australian-coastal-seabird-editorial-hero.png`
2. Module 1: `public-reporting-process-infographic.png`
3. Module 2 / 3: `facility-inspection-exclusion-zone.png`
4. Module 5: `restoreassist-field-documentation-workflow.png`
5. Quiz: `assessment-screen-ui-concept.png`
6. LMS landing: `course-landing-page-ui-concept.png`
7. Lesson player: `lesson-dashboard-ui-concept.png`

## UI/UX requirements from generated layouts

- Premium government-adjacent training look.
- Navy, teal, white and restrained gold palette.
- Strong above-the-fold reporting action.
- Left-side module navigation for lesson player.
- Right-side field record checklist where relevant.
- Mobile-first stacked layout.
- Large typography, clear hierarchy and WCAG AA contrast.
- No fake portrait.
- No panic imagery.
- No graphic animal imagery.
- No unsupported product claims in the UI.

## Review action

Fabel should review visual tone and brand quality. Opus should review source fidelity, professional boundaries and implementation risk.

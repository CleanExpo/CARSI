# Visual Asset Manifest — Australian H5 Readiness Course

## Status

OpenAI image generation has produced a clean course visual set for review. The current chat environment cannot upload binary image files directly to GitHub or Linear because the signed upload host could not be resolved from the execution container. The assets have therefore been packaged as a downloadable review bundle and documented here for the CLI/Fabel/Opus workflow.

## Generated image set

| Asset | Intended use | Notes |
| --- | --- | --- |
| `public-reporting-process-infographic.png` | Module 1 process visual | Four-step public reporting pathway. Clean and non-graphic. |
| `australian-coastal-seabird-editorial-hero.png` | Course landing hero or awareness banner | Editorial coastal Australia visual. No distress imagery. |
| `facility-inspection-exclusion-zone.png` | Module 2 / Module 3 visual | Professional facility inspection and access-control context. |
| `restoreassist-field-documentation-workflow.png` | Module 5 documentation diagram | Field evidence, PPE, checklist and completion-report workflow. |
| `assessment-screen-ui-concept.png` | Quiz / assessment UI direction | Clean assessment dashboard concept. |
| `course-landing-page-ui-concept.png` | LMS landing page UI direction | Premium course landing page concept with Synthex agency footer. |
| `lesson-dashboard-ui-concept.png` | Lesson player UI direction | Multi-column course lesson layout with checklist and resources. |

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

## CLI action

When the CLI has repo filesystem access, copy the approved PNG assets into:

`public/images/campaigns/avian-influenza/course/`

Then update the LMS import plan and course seed to reference those final public paths.

## Review action

Fabel should review visual tone and brand quality. Opus should review that visuals do not imply authority replacement, disease diagnosis, product endorsement or panic framing.

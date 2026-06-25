---
description: Enforce locked CARSI design tokens, en-AU tone, and no-overclaiming guardrails across a course's content and media before shipping.
argument-hint: --slug=<slug>
---

# /course-brand — brand & tone gate

A review pass (mostly read + targeted fixes) that makes a course look and read like CARSI
before `/course-ship`.

**Args:** `$ARGUMENTS`

## Load first
- `skills/design/design-system.skill.md` — locked tokens. Read `app/globals.css` (carsi-blue `#2490ed`, carsi-orange `#ed9d24`, glassmorphism surfaces) and `tailwind.config.ts`. No generic template UI, no forbidden patterns.
- `skills/australian/australian-context.skill.md` — en-AU spelling, AUD, DD/MM/YYYY, AU examples.

## Checks (flag failures back to the owning stage)
1. **Thumbnail:** text-free and overlay-safe — the app composites the title + discipline wash + dark vignette via `src/components/lms/CourseTextThumbnail.tsx`. The upper-left third must stay calm/dark; discipline accent must match `iicrcDiscipline`.
2. **Copy:** course title/description and every lesson `contentBody` use en-AU spelling and AU-relevant examples/regulators. AUD pricing, DD/MM/YYYY dates.
3. **No overclaiming** (same guardrail as `src/lib/brand-video-assistant.ts`): do not assert IICRC / insurer / NRPG / compliance authority; frame AI + training as decision *support*, not a replacement for standards or qualified professionals.
4. **Voice/video tone:** narration and any brand video are calm, practical, evidence-led; each ends on one clear next action; captions + transcript exist for video.
5. **Consistency:** load `/courses` mentally — does this course sit in the same visual family while clearly reflecting its own subject?

## Output
A pass/fail checklist. For each fail, the exact file + the upstream command to re-run
(`/course-develop` for copy, `/course-media` for assets). When all pass → `/course-ship`.

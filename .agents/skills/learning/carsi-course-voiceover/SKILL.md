---
name: carsi-course-voiceover
description: Plans and generates en-AU lesson narration for CARSI via ElevenLabs and Cloudinary. Use for voice briefs, narration scripts, and spend-capped generation.
---

# CARSI Course Voiceover

## When to use

Trigger terms: `voiceover`, `elevenlabs`, `narration`, `voice:plan`, `voice:generate`.

## Engineering principle

See `../../references/engineering-principle.md`.

## Workflow

1. Read `../../references/engineering-principle.md`.
2. Load authoritative docs from `../../references/authoritative-docs.md` for this task.
3. Inspect existing implementation before adding patterns or dependencies (`../../references/approved-libraries.md`).
4. Define acceptance criteria and which quality gates apply (`../../references/quality-gates.md`).
5. Implement minimal diff; verify before marking done.

## Focus for this discipline

- scripts/generate-course-voiceover.ts
- data/voice/course-voice-briefs.json
- docs/agent-framework/COURSE_CREATION_PIPELINE.md

## Acceptance criteria

- Outcome stated for restoration professionals and business metrics.
- No new dependencies without `approved-libraries.md` checklist.
- Applicable gates from `../../references/quality-gates.md` executed or explicitly deferred with reason.

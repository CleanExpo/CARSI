---
description: Write lesson content (HTML bodies, quizzes, resources) into a CARSI course skeleton, fact-checked against the research pack.
argument-hint: --slug=<slug>
---

# /course-develop — lesson content

Fill the empty skeleton from `/course-construct` with **teachable, verified lesson content**.

**Args:** `$ARGUMENTS`

## Load first
- `skills/verification/truth-finder.skill.md` — re-check every factual claim against the research pack; do not introduce unverified facts.
- `skills/australian/australian-context.skill.md` — en-AU spelling, AU examples, AUD, DD/MM/YYYY.
- `skills/verification/error-handling.skill.md` for any procedural/safety guidance tone.

## Procedure
1. **Read** `data/courses/<slug>/research.md` (the verified source) and the course's lessons in `data/seed/courses-catalog.json`.
2. **Confirm conventions first (don't assume):** open a seeded course that already has a quiz and a content-rich lesson; reuse its `contentType` value and `resources` JSON shape exactly.
3. **Author each lesson's `contentBody`** as HTML (`<p>…</p>`, lists, headings) matching the existing seeded lessons' formatting. Ground every claim in the research pack; keep guardrails (no overclaiming IICRC/insurer/compliance authority).
4. **Quizzes:** author quiz lessons in the existing convention (same `contentType`/`resources` storage you confirmed in step 2). Keep questions answerable from the lesson content.
5. **Resources:** populate the lesson `resources` array (`[{ label, url }]`) with genuinely useful links/downloads. Leave room for the audio narration entry that `/course-media` adds (`kind: 'audio'`).
6. **Set `isPreview`** on intro/sample lessons so the public course page has a free preview.

## Verification
- Every lesson has a non-empty `contentBody`; no placeholder/Lorem text.
- Quiz shape matches the existing convention (verified in step 2).
- File passes `isCoursesCatalogFile`; `npm run type-check` is green.

**Output:** the updated catalogue + a content coverage summary. Then `/course-media`.

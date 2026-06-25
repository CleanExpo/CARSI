---
name: course-thumbnails
category: design
version: 1.0.0
description: Design, generate and import on-brand, text-free course thumbnail backgrounds via OpenAI gpt-image-1 → Cloudinary → the course catalogue.
author: Unite Group
priority: 4
auto_load: false
triggers:
  - course thumbnail
  - generate thumbnails
  - course images
  - regenerate thumbnails
  - course cover image
requires:
  - design/design-system.skill.md
  - australian/australian-context.skill.md
---

# Course Thumbnails Skill

Generate **simple, effective, on-brand** thumbnail backgrounds for CARSI courses. The work
is split so the judgement stays with Claude and the spend stays deterministic:

- **You (this skill)** read each course and author a creative **brief** that demonstrates a
  clear understanding of the course subject, its IICRC discipline/category, and the learner
  benefit. Briefs live in `data/thumbnails/course-thumbnail-briefs.json` (committed).
- **`scripts/generate-course-thumbnails.ts`** consumes the briefs: builds a prompt, calls
  OpenAI `gpt-image-1`, uploads to Cloudinary, and writes the URL into the catalogue.

## Critical constraint — generate TEXT-FREE backgrounds

The app composites the thumbnail itself. `src/components/lms/CourseTextThumbnail.tsx` paints
the image `object-cover` at **16:10**, lays a heavy dark vignette
(`black/58 → black/28 → black/68`) + a discipline-coloured wash over it, and renders the
course **title in white** on top. So every generated image must be:

- **Text-free** — no words, letters, numbers, logos, watermarks, signage, UI, or readable
  displays. (The script also appends this exclusion in code, but author it into the brief too.)
- **Overlay-safe** — keep the upper-left third calm, darker and uncluttered for the white
  title; push the focal subject toward the lower-right; tolerate the dark vertical vignette
  without losing the subject.

## Preflight (the operator confirms once)

- `OPENAI_API_KEY` set **and** the OpenAI org is **API-verified for `gpt-image-1`** (image
  generation is gated on org verification — confirm before a batch run, not mid-batch).
- Cloudinary configured (`CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`).
- This is an **authoring tool run manually** — never in CI or app runtime; it spends money.

## Procedure

1. **Gather course data.** Read `data/seed/courses-catalog.json` (per course: title,
   description, `category`, `iicrcDiscipline`, and module/lesson titles). Read
   `src/lib/iicrc-discipline-display.ts` for discipline labels and the `DISCIPLINE_ACCENTS`
   palette in `CourseTextThumbnail.tsx` to translate the discipline hex into colour words.
2. **Scaffold briefs.** `npm run db:thumbnails:plan` writes one skeleton per course (slug,
   title, a guessed discipline, a default negative prompt). Re-running never overwrites an
   authored brief unless `--force`.
3. **Author each brief (the core step).** Fill `concept`, `motifs`, `palette`, `mood`,
   `style`, `composition`, `negativePrompt`, `authorNote`. Ground `motifs` in the course's
   ACTUAL content (e.g. WRT → moisture meter, air movers, tide line; FSRT → soot-stained then
   restored surfaces; IR thermography → false-colour heat map of a damp wall; UV → fluorescing
   traces in a darkened room). The `authorNote` records *why* the motifs fit the subject +
   benefit. Apply the rubric below.
4. **Dry-run a prompt (free).** `npm run db:thumbnails:generate -- --slug=<slug> --dry-run`
   prints the assembled prompt — no API/Cloudinary/DB. Tighten the brief if it reads generic
   or risks text/logos.
5. **One real generation.** `... --generate --slug=<slug> --yes` → open the returned Cloudinary
   URL; confirm it is text-free, on-brand, correctly composed, 1536×1024.
6. **Review — BLOCKING gate before the batch.** Apply the rubric; re-author and regenerate
   weak images with `--generate --slug=<slug> --force --yes`.
7. **Batch generate.** `npm run db:thumbnails:generate -- --yes` (skips the already-done test
   course; a hard cap of 25/run + write-after-each protect against runaway spend).
8. **Import + verify.** Default persistence writes `thumbnailUrl` into the seed JSON; run
   `npm run db:seed-courses` to import into the DB. Verify rendering (below).

### Brief-quality rubric (all must hold)

- **Specific, not generic** — a reviewer could guess the course/discipline from the image
  alone; motifs trace to *this* course, not "abstract restoration imagery".
- **Text-free by construction** — `negativePrompt` excludes text/words/letters/numbers/logos/
  watermarks/signage/UI/readable-displays (and human faces by default).
- **Overlay-safe composition** — calm/darker upper-left, off-centre/lower focal mass; survives
  the dark vignette + white title without losing the subject or hurting contrast.
- **On-brand palette** — aligned to the discipline accent; professional Australian training
  tone; no neon, no stocky cliché.
- **Benefit-bearing mood** — conveys competence, safety, trust or career progression — not
  just "a thing on a table".
- **Style fit** — `photoreal` for hands-on technical disciplines; `abstract-conceptual`
  acceptable where literal imagery is weak (business/compliance).

## Verification

1. **Render check** — point a local course card at the new URL (it flows `thumbnail_url` →
   `CourseCard` → `CourseTextThumbnail backdropImageSrc`). At the `aspect-[16/10]` container
   with `object-cover`, confirm the subject survives the crop, the vignette keeps the white
   title readable, and the discipline pill / price badge stay legible. Spot-check the `hero`
   and `admin` variants (same component).
2. **Contrast** — the white title + text-shadow must read over the busiest area; if any image
   is too bright top-left, re-author `composition` and regenerate.
3. **Cohesion** — load `/courses` and scan the grid: thumbnails should feel like one family
   while each clearly reflects its own subject.

## Flags reference (`scripts/generate-course-thumbnails.ts`)

`--plan` · `--generate` · `--dry-run` · `--slug=<slug>` · `--limit=N` · `--force` ·
`--from-db` (default source = seed JSON) · `--persist=seed|db|both` (default `seed`) · `--yes`
(skip the interactive spend confirmation). Env: `OPENAI_IMAGE_MODEL` (default `gpt-image-1`),
`THUMBNAIL_MAX_GENERATIONS` (default 25). Resumable run state:
`data/thumbnails/course-thumbnail-results.json` (gitignored).

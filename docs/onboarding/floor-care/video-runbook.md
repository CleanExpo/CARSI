# Lesson Video Runbook — Floor Care Onboarding

How to render per-lesson training videos for the course, with subtitles, using the in-repo pipeline.
This **extends** the existing HeyGen brand-video pipeline rather than adding a parallel one.

> **Where this runs:** it is a spend-bearing **authoring tool** — run it **manually** on a machine with
> the API keys set (your Claude CLI box, or Rana's environment), **never in CI or the app runtime**.
> It cannot run in the cloud authoring sandbox (no keys there).

## What's built (merged)

- **Scripts authored:** `data/video/course-lesson-video-briefs.json` — **27 lesson video scripts**, one
  per `text` lesson of `floor-care-onboarding-operational-readiness` (the 11 quiz/knowledge-check
  lessons are intentionally skipped). en-AU, ~90–110 words, each ending on one next action; no
  overclaiming.
- **Generator:** `scripts/generate-course-lesson-videos.ts` (npm `video:lessons:plan` /
  `video:lessons:generate`). Mirrors the course-voiceover tool: `--plan` / `--generate`, `--dry-run`,
  `--slug`, `--limit`, `--force`, `--yes`, a hard cap (`LESSON_VIDEO_MAX_GENERATIONS`, default 50), a
  resumable results manifest, and an interactive spend confirmation.
- **Types/contract:** `src/lib/video/course-lesson-video-briefs-types.ts`.
- **Reuses:** the HeyGen v3 render shapes from `scripts/automate-brand-videos.ts`,
  `uploadVideoToCloudinary` (`src/lib/server/cloudinary-upload.ts`), and the catalogue `resources` field
  — no Prisma schema change.

## How it works

For each authored brief the generator: builds an **SRT** caption track from the script → renders a
HeyGen avatar video (with captions requested) → polls until complete → downloads the MP4 → uploads it
to Cloudinary (`carsi/course-video`) → writes a `{ kind: 'video', url, captionsUrl, language }` entry
into that lesson's `resources` in `data/seed/courses-catalog.json`. Re-runs skip lessons already done.

## Prerequisites

```bash
# Required env (set on the machine that runs the render):
HEYGEN_API_KEY=…          HEYGEN_AVATAR_ID=…       # avatar to present
HEYGEN_VOICE_ID=…         # optional; else HeyGen default voice
CLOUDINARY_CLOUD_NAME=…   CLOUDINARY_API_KEY=…     CLOUDINARY_API_SECRET=…
# Optional tuning: LESSON_VIDEO_RESOLUTION (1080p), LESSON_VIDEO_ASPECT_RATIO (16:9),
#   LESSON_VIDEO_BACKGROUND (#060a14), LESSON_VIDEO_MAX_GENERATIONS, LESSON_VIDEO_POLL_*.
npm ci && npx prisma generate && npm run type-check    # the gate (run once on a keyed/networked box)
```

## Steps

```bash
# 1. (Already done) Scaffold briefs. Re-run only to pick up new lessons:
npm run video:lessons:plan -- --slug=floor-care-onboarding-operational-readiness

# 2. DRY RUN — review every HeyGen request + script. No API calls, no spend:
npm run video:lessons:generate -- --slug=floor-care-onboarding-operational-readiness --dry-run

# 3. Pilot a few before committing to all 27 (recommended):
npm run video:lessons:generate -- --slug=floor-care-onboarding-operational-readiness --limit=2
#    Review the two Cloudinary MP4s on the course; check the avatar, captions, tone, branding.

# 4. Generate the rest (resumable; skips the pilot two):
npm run video:lessons:generate -- --slug=floor-care-onboarding-operational-readiness --yes

# 5. Import the new video links into the DB:
npm run db:seed-courses        # (against the target DATABASE_URL)
```

The generated SRT tracks are also written to `output/course-video/captions/<lessonId>.<locale>.srt`.

## Subtitles & languages

- **Now (English + subtitles):** every video is rendered en-AU with an English SRT caption track
  (requested from HeyGen and built locally). `captionsUrl` is stored on the lesson resource when HeyGen
  returns one.
- **Expand later (other languages):** the contract is language-ready — each brief carries a `locale`,
  and a rendered video is stored per language (`LessonVideoResource.language`), so multiple language
  tracks coexist on one lesson. To add a language: duplicate the briefs with a translated `script` and
  the new `locale` (a translation pass can automate this), then `video:lessons:generate` again. Nothing
  built today is thrown away.

## Safety

- Always `--dry-run` first; pilot with `--limit`; the hard cap blocks accidental bulk spend.
- Idempotent: the results manifest (`data/video/course-lesson-video-results.json`) means re-runs only
  render what failed or is new.
- This writes video URLs into the catalogue JSON; commit that change so a re-seed keeps the links.

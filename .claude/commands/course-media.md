---
description: Produce branded media for a CARSI course — thumbnail (gpt-image-1), voice narration (ElevenLabs), and optional brand/lesson video (HeyGen). Spend-bearing; always dry-run first.
argument-hint: --slug=<slug> [--thumbnail] [--voice] [--video]
---

# /course-media — branded media production

Generate the media for a course. **This spends real money** (OpenAI / ElevenLabs / HeyGen +
Cloudinary). Every API path has a free `--dry-run` you MUST run and review before generating,
and each generator has a hard cap + resumable manifest. If no sub-flag is given, do thumbnail +
voice; treat video as opt-in.

**Args:** `$ARGUMENTS`

## Preflight (confirm once, before any spend)
- Keys present for the flows you'll run: `OPENAI_API_KEY` (+ org verified for `gpt-image-1`), `ELEVENLABS_API_KEY` (+ `ELEVENLABS_VOICE_ID`), `HEYGEN_API_KEY`.
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` set (all media uploads land in Cloudinary).
- These are **authoring tools — run manually, never in CI/runtime**.

## 4a. Thumbnail — `gpt-image-1` (reuse `skills/design/course-thumbnails.skill.md`)
1. `npm run db:thumbnails:plan` (scaffold/merge briefs in `data/thumbnails/course-thumbnail-briefs.json`).
2. **Author the brief** for `<slug>` per the skill (text-free, overlay-safe, discipline palette in words).
3. `npm run db:thumbnails:generate -- --slug=<slug> --dry-run` → review the prompt.
4. `npm run db:thumbnails:generate -- --slug=<slug> --yes` → open the Cloudinary URL; confirm text-free, on-brand, 1536×1024. Writes `thumbnailUrl` into the seed JSON.

## 4b. Voice — ElevenLabs (skill `skills/content/course-voiceover.skill.md`)
1. `npm run voice:plan -- --slug=<slug>` (scaffold one brief per lesson in `data/voice/course-voice-briefs.json`).
2. **Author each lesson's narration `script`** (calm, en-AU, evidence-led; mirror the lesson `contentBody`, end on the next action).
3. `npm run voice:generate -- --slug=<slug> --dry-run` → review the TTS request (voice id, settings, text). No spend.
4. `npm run voice:generate -- --slug=<slug> --yes` → playable Cloudinary MP3 per lesson, written into each lesson's `resources` (`kind: 'audio'`). Hard cap `VOICE_MAX_GENERATIONS`.

## 4c. Video — HeyGen (reuse the repo pipeline, NOT the HyperFrames MCP)
> The HyperFrames MCP `compose`/`render_video` tools are **disabled on CLI agents**; only its read tools (status) work. Use the repo's own HeyGen pipeline.
1. Append a course-scoped entry to `brandVideoScripts` in `src/lib/brand-video-assistant.ts` (id, audience, format, script, CTA, captions required).
2. `npm run video:brand:plan` → writes transcripts/SRT/job manifests to `output/brand-video/`.
3. `BRAND_VIDEO_IDS=<id> HEYGEN_API_KEY=… npm run video:brand:generate` → MP4 + captions. Store finals per the production pack (`public/marketing/video/`, transcript `.md`, caption `.srt`).
- For product walkthroughs instead of an avatar, use `npm run video:demo:*` (`skills/content/demo-screencasts.skill.md`).

## Verification
- Thumbnail renders on the course card (vignette keeps the white title readable); text-free.
- Each narrated lesson has a playable audio URL in `resources`; dry-run showed correct voice/settings; cap respected.
- Brand video has captions + transcript; no unsupported compliance/accreditation claims.
- After media writes, run `npm run db:seed-courses` (ship stage) to import the new URLs.

**Output:** per-asset status (path/URL) + which seed fields changed. Then `/course-brand`.

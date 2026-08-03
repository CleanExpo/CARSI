# Course intro videos — render handoff

**Status (2026-07-16):** All 32 intro scripts authored, the audio-driven render pipeline built, and
the write-back proven. The render runs in **CI** (where the secrets live) via a manual workflow.

## Pipeline (natural delivery — Phill's real voice, no time-boxing)

Per course, from `data/video/course-intro-video-briefs.json`:
1. **ElevenLabs TTS** in Phill's voice (`Hywjw1pu9qLxpN2CqxU1`, model `eleven_multilingual_v2`) →
   natural-prosody MP3 (human pauses, rhythm, tempo — the words are never clipped to a timeframe).
2. Upload MP3 to Cloudinary → public audio URL.
3. **HeyGen** `POST /v3/videos` `{type:avatar, avatar_id, audio_url}` — the Phill avatar lip-syncs to
   the audio; **video length follows the speech** (no forced duration, no cut-off sentences).
4. Poll → download MP4 → Cloudinary → results map → `apply-intro-video-urls.ts` writes
   `introVideoUrl` (+ `meta.introVideoUrl`).

## How to render (GitHub → Actions → "Course intro videos" → Run workflow)

Run **on the `feat/course-completion-wave0-1` branch**:
1. **mode = dry-run** — free preview, prints the per-course plan. Confirms secrets/branch are right.
2. **mode = generate, limit = 1** — renders ONE course (validate Phill's avatar + voice + pacing).
   Review the result in Cloudinary / the updated `introVideoUrl`.
3. **mode = generate, limit = 40** — batch the rest (idempotent: skips done courses). The workflow
   commits the rendered URLs back to the branch and the gate reaches **37/37**.

## Secrets (GitHub Actions repo secrets — already used by the media/brand workflows)

`HEYGEN_API_KEY`, `HEYGEN_AVATAR_ID`, `ELEVENLABS_API_KEY`, `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. The workflow preflights these before spending.

## Assumptions to confirm on the first (limit=1) run

- **`HEYGEN_AVATAR_ID` = the Phill McGurk avatar.** If the repo secret points at a different avatar,
  set the correct HeyGen avatar look id there (or per-brief `avatarId`) before batching.
- The `--generate` path (ElevenLabs + HeyGen audio_url) is grounded in the current API docs but is
  first exercised live on this run — which is exactly why step 2 renders a single video first.

## Local ($0) verification already done

`npx tsx scripts/generate-course-intro-videos.ts --dry-run` (32 courses) and the write-back glue
(mock URLs on all 32 → gate 37/37, reverted). No secrets touch a dev box.

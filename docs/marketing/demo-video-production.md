# Demo Video Production Runbook (SYNTHEX marketing assets)

> Operator runbook for producing CARSI demo/marketing videos: narrated HeyGen avatar videos
> composited over real-product screen recordings driven by the seeded demo account.
>
> Asset/campaign usage: `docs/marketing/synthex-campaign-context.md` → "Video Assets".
> Deploy secrets: `docs/PRODUCTION_DEPLOY.md`.

This is an **authoring-time** workflow — run manually by a maintainer, never in CI and never
by the running app. It drives a real browser, calls HeyGen, and spends Cloudinary.

## What it produces

A finished demo video stacks three layers (FFmpeg):

1. **Main video** — a `.webm` screencast of the seeded demo account walking a real route
   (Playwright `recordVideo`).
2. **PiP avatar + audio** — a HeyGen avatar video ("Claire") scaled into a corner; its audio
   is the voiceover. Paired to a flow by `brandVideoScriptId`.
3. **Captions** — the brand pipeline's `.srt`, soft-muxed.

Flows with `brandVideoScriptId: null` are **silent b-roll** (transcode only).

## Prerequisites

| Requirement | How |
| --- | --- |
| App running | `npm run dev` (or point `DEMO_RECORD_BASE_URL` at a deployed preview) |
| Demo account seeded | `npm run db:seed-courses` then `npm run db:seed-e2e-user` (creates `student@carsi.com.au`, enrolled in the first catalogue course) |
| HeyGen secret | `HEYGEN_API_KEY` (+ optional `HEYGEN_AVATAR_ID`, `HEYGEN_VOICE_ID` for avatar mode) |
| Cloudinary secrets | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| FFmpeg | bundled via `@ffmpeg-installer/ffmpeg` (installed with `npm ci`); or set `FFMPEG_PATH` |

Optional overrides (safe defaults — see `.env.example`): `DEMO_RECORD_BASE_URL`
(`http://localhost:3000`), `DEMO_VIDEO_MAX` (12), `DEMO_PIP_MARGIN` (24),
`DEMO_STUDENT_EMAIL`/`DEMO_STUDENT_PASSWORD`.

## End-to-end production (one walkthrough)

```bash
# 1. Seed + run the app (separate terminal for `npm run dev`)
npm run db:seed-courses && npm run db:seed-e2e-user

# 2. Generate the paired HeyGen avatar (drives the narration + audio of the PiP)
npm run video:brand:generate -- --ids=learner-day-three-nudge
#    → output/brand-video/videos/learner-day-three-nudge.mp4 (+ captions/*.srt)

# 3. Record → composite → upload the demo flow
npm run video:demo:generate -- --id=lesson-player-walkthrough
#    → output/demo-screencast/final/lesson-player-walkthrough.mp4 → Cloudinary
#    add --persist to also write the URL into the flow's LmsLesson.contentBody
```

### Phase-by-phase (for review/debugging)

```bash
npm run video:demo:plan                                   # validate the flow manifest
npm run video:demo:record   -- --id=<flow>                # capture the screencast (.webm)
npm run video:demo:composite -- --id=<flow>               # FFmpeg PiP composite (.mp4)
npm run video:demo:upload   -- --id=<flow> [--persist]    # Cloudinary (+ optional lesson write)
```

Useful flags: `--dry-run` (print resolved steps + the FFmpeg command, no browser/spend),
`--id=<flow>` / `--limit=N` to scope, `--force` to re-record, `--yes` for non-interactive
upload confirmation, `DEMO_CURSOR=0` to disable the synthetic cursor.

Composite audio flags (see "Artlist audio" below): `--voiceover=<file>`, `--music=<file>`,
`--music-gain=<0..1>`.

## Current flows (`src/lib/screencast/demo-flows.ts`)

| Flow id | Purpose | Avatar (`brandVideoScriptId`) |
| --- | --- | --- |
| `lesson-player-walkthrough` | `lesson-walkthrough` | `learner-day-three-nudge` |
| `welcome-public-tour` | `marketing-reel` | `carsi-public-introduction` |
| `dashboard-broll` | `brand-broll` | _none (silent)_ |
| `pathways-tour` | `marketing-reel` | `pathways-advisor-intro` |
| `course-catalogue-discipline-tour` | `brand-broll` | _none (silent)_ |

## Artlist audio (licensed music bed / voiceover)

For ad creative you can mux in **Artlist** assets (royalty-free music + AI voiceover). A
**Pro/Max** Artlist license covers **paid ads** on Facebook/Instagram/LinkedIn; the basic
Social license does not. Keep the per-asset Artlist license certificate on file.

No API is required — download the files from the Artlist web app and pass them at composite
time:

```bash
# Keep the HeyGen avatar visual, but use an Artlist voiceover + music bed for audio:
npm run video:demo:composite -- --id=welcome-public-tour \
  --voiceover=assets/artlist/reel-vo.mp3 --music=assets/artlist/bed.mp3 --music-gain=0.18

# Fully Artlist audio with NO avatar (use a silent b-roll flow):
npm run video:demo:composite -- --id=course-catalogue-discipline-tour \
  --voiceover=assets/artlist/reel-vo.mp3 --music=assets/artlist/bed.mp3
```

Behaviour:

- `--voiceover` **overrides** the avatar's own audio as the narration track.
- `--music` is **looped** and mixed underneath at `--music-gain` (default `0.18`).
- The video (screencast) length governs the final cut (`-shortest`); the music bed loops to
  cover it, so the bed can be shorter than the video.
- With no audio flags, behaviour is unchanged (avatar audio for paired flows, silent for b-roll).

## Authoring a new flow

1. Pick/author the narration: reuse a script in `src/lib/brand-video-assistant.ts` or add one.
2. Add a `DemoFlow` to `src/lib/screencast/demo-flows.ts` — steps target **real routes /
   selectors** (verify against the app and `e2e/*.spec.ts`); size `wait` dwells to roughly the
   narration length so the avatar isn't cut off (the composite ends with `-shortest`).
3. `--dry-run`, then `--record` one and scrub the `.webm`; then `--composite` and review the
   PiP framing + caption sync; then `--generate`.

Full guidance + rubric: `skills/content/demo-screencasts.skill.md`.

## Output locations

- Raw screencasts: `output/demo-screencast/raw/<flow>.webm`
- Final composites: `output/demo-screencast/final/<flow>.mp4`
- Resumable status: `output/demo-screencast/results.json`
- Hosted assets: Cloudinary folder `carsi/demo-videos`

(`output/demo-screencast/` is gitignored.)

## Guardrails

- Authoring tool only — never wired into CI or app runtime.
- Idempotent/resumable — recorded flows skip unless `--force`; per-flow status written after
  each step; failed runs exit non-zero.
- Capped — `DEMO_VIDEO_MAX` (default 12) and `--limit=N` bound a run.
- Playwright shows no mouse cursor — use a `highlight` step to draw the eye to a target.

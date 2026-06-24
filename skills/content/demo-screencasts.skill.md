---
name: demo-screencasts
category: content
version: 1.0.0
description: Capture real-product screen recordings with the seeded demo account and composite a HeyGen avatar as a picture-in-picture overlay → Cloudinary → lessons/brand videos.
author: Unite Group
priority: 5
auto_load: false
triggers:
  - demo video
  - screen recording
  - product walkthrough
  - lesson walkthrough video
  - screencast
  - demo account video
requires:
  - design/design-system.skill.md
  - australian/australian-context.skill.md
---

# Demo Screencasts Skill

Turn the **real CARSI product** into video by driving the **seeded demo account** through a
scripted journey, recording the screen, and compositing a narrated **HeyGen avatar** as a
picture-in-picture corner. Like the thumbnail and brand-video tools, the work is split so the
judgement stays with Claude and the spend/mechanics stay deterministic:

- **You (this skill)** author one `DemoFlow` per video in
  `src/lib/screencast/demo-flows.ts` — the steps the demo account performs, paired with a
  narration script. This is where the understanding of the user journey lives.
- **`scripts/generate-demo-videos.ts`** consumes the flows: records with Playwright,
  composites with FFmpeg, uploads to Cloudinary, and optionally writes the URL into a lesson.

The footage feeds three uses, set per flow via `purpose`: in-lesson **walkthroughs**, B-roll
to **enrich brand videos**, and a standalone **marketing reel**.

## How the pieces fit

A finished demo video is three layers stacked by FFmpeg:

1. **Main video** — a screencast (`.webm`) of the demo account walking a real route, captured
   by Playwright's `recordVideo`. Reuses the seeded session from `e2e/auth.setup.ts`.
2. **PiP avatar + audio** — an existing HeyGen avatar `.mp4` from the brand-video pipeline
   (`output/brand-video/videos/<script>.mp4`), scaled into a corner; its audio becomes the
   voiceover. A flow references it by `brandVideoScriptId` (see `src/lib/brand-video-assistant.ts`).
3. **Captions** — the `.srt` the brand pipeline already emits, soft-muxed into the MP4.

A flow with `brandVideoScriptId: null` is **silent B-roll** — transcoded only, for hand-editing.

## Prerequisites (operator)

- The app is running at `DEMO_RECORD_BASE_URL` (default `http://localhost:3000`).
- The demo account is seeded: `npm run db:seed-courses` then `npm run db:seed-e2e-user`
  (creates `student@carsi.com.au`, enrolled in the first catalogue course).
- For any non-silent flow, the paired avatar exists — run
  `npm run video:brand:generate -- --ids=<brandVideoScriptId>` first (needs `HEYGEN_*`).
- `@ffmpeg-installer/ffmpeg` is installed (bundled binary) **or** `FFMPEG_PATH` points at a
  system `ffmpeg`.
- For `--upload`: `CLOUDINARY_*` configured.

## Procedure

1. **Confirm the journey.** Decide which user flow to show and which narration pairs with it.
   Reuse an existing `brandVideoScript`, or add one to `src/lib/brand-video-assistant.ts` if
   the walkthrough needs its own voiceover.
2. **Author the `DemoFlow`** in `src/lib/screencast/demo-flows.ts`:
   - `steps` target **real routes/selectors** that exist in the app (verify against the page
     components / existing `e2e/*.spec.ts`). Prefer stable selectors
     (`a[href*="/lessons/"]`, `button[type="submit"]`, role/text engines).
   - Size the `wait` dwells so they **sum to roughly the narration length** — the composite
     ends with the narration (`-shortest`), so under-running cuts the audio and over-running
     wastes footage.
   - Set `purpose`, `auth` (`student` reuses the session; `guest` records logged-out), `pip`
     (corner away from primary content + the title), and `lessonId` if it should embed.
3. **Plan / dry-run (free):** `npm run video:demo:plan` then
   `npm run video:demo:record -- --id=<flow> --dry-run` — read the resolved steps; confirm
   selectors/routes and dwell ≈ narration.
4. **Record one:** `npm run video:demo:record -- --id=<flow>` → open
   `output/demo-screencast/raw/<flow>.webm`; confirm a clean journey, no error screens.
5. **Composite one:** `npm run video:demo:composite -- --id=<flow>` → open
   `output/demo-screencast/final/<flow>.mp4`; review against the rubric (**blocking gate**).
6. **Batch / ship:** `npm run video:demo:generate -- --id=<flow>` (record→composite→upload).
   Add `--persist` to write the URL into the flow's lesson; `--yes` for non-interactive runs.
7. **Verify persistence:** if persisted, load the lesson and confirm it plays the new URL.

## Flow rubric (all must hold before shipping)

- **Selectors exist** — every `click`/`highlight` targets a real element; `goto` paths resolve.
- **Dwell covers narration** — the avatar is never cut off; no long dead air at the end.
- **PiP is unobtrusive** — the avatar corner never hides primary content or a title overlay.
- **Coherent journey** — no dead-ends, 404s, empty states, or error toasts on screen.
- **No real PII** — demo account only; nothing personal or sensitive in frame.
- **Captions present** — the paired `.srt` muxed in (non-silent flows).

## Guardrails

- **Authoring tool only** — run manually via `npm run video:demo:*`; **never in CI**. It drives
  a browser, depends on HeyGen output, and spends Cloudinary / writes the DB.
- **Idempotent + resumable** — recorded flows are skipped unless `--force`; per-flow status is
  written to `output/demo-screencast/results.json` after each step. Outputs are gitignored.
- **Caps** — `DEMO_VIDEO_MAX` (default 12) and `--limit=N` bound a run; `--id=<flow>` scopes it.
- **No cursor** — Playwright recordings show no mouse pointer; use a `highlight` step to draw the
  eye to the element being discussed.

## Critical files

| File | Role |
|---|---|
| `src/lib/screencast/demo-flows.ts` | The authored flow manifest (edit this to add videos). |
| `src/lib/screencast/demo-flow-types.ts` | `DemoFlow`/`DemoStep` types + guards. |
| `scripts/generate-demo-videos.ts` | record → composite → upload pipeline. |
| `src/lib/brand-video-assistant.ts` | Narration scripts paired by `brandVideoScriptId`. |
| `scripts/automate-brand-videos.ts` | Produces the avatar MP4 + SRT the composite overlays. |
| `e2e/auth.setup.ts` | The demo-account login this tool mirrors. |
| `src/lib/server/cloudinary-upload.ts` | `uploadVideoToCloudinary()` for the final MP4. |

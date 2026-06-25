---
name: course-voiceover
category: content
version: 1.0.0
description: Author and generate on-brand, en-AU lesson voice narration via ElevenLabs → Cloudinary → the course catalogue.
author: Unite Group
priority: 5
auto_load: false
triggers:
  - lesson narration
  - course voiceover
  - generate audio
  - elevenlabs narration
  - lesson audio
requires:
  - australian/australian-context.skill.md
  - verification/verification-first.skill.md
---

# Course Voiceover Skill

Generate **calm, practical, en-AU** voice narration for CARSI lessons. Like the
`course-thumbnails` skill, the work is split so judgement stays with Claude and spend stays
deterministic:

- **You (this skill)** read each lesson and author a narration **brief** — the script and tone.
  Briefs live in `data/voice/course-voice-briefs.json` (committed).
- **`scripts/generate-course-voiceover.ts`** consumes the briefs: calls the ElevenLabs
  text-to-speech REST API, uploads the MP3 to Cloudinary (`carsi/course-audio`), and writes the
  audio URL into the lesson's `resources` JSON (`kind: 'audio'`). No Prisma schema change.

## Voice direction (matches the brand-video production pack)

- **Australian English** or neutral professional English; warm, confident, steady educational pace.
- **Medium stability, low-to-medium expressiveness** — avoid a sales-announcer tone.
- Evidence-led; never overclaim IICRC / insurer / NRPG / compliance authority. AI + training
  support judgement, they don't replace standards or qualified professionals.
- Every narration ends on **one clear next action**, mirroring the lesson.

## Preflight (the operator confirms once)
- `ELEVENLABS_API_KEY` set; `ELEVENLABS_VOICE_ID` set (an en-AU / neutral-professional voice) or a per-lesson `voiceId` in the brief.
- Cloudinary configured (`CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`).
- This is an **authoring tool run manually** — never in CI or app runtime; it spends money.

## Procedure
1. **Gather lesson data.** Read the course's lessons in `data/seed/courses-catalog.json` (title + `contentBody`) and the research pack at `data/courses/<slug>/research.md` if present.
2. **Scaffold briefs.** `npm run voice:plan -- --slug=<slug>` writes one skeleton per lesson (empty `script`, null voice settings, `locale: en-AU`). Re-running never overwrites an authored brief unless `--force`.
3. **Author each `script` (the core step).** Write narration grounded in the lesson `contentBody` — not a verbatim read; spoken, scannable, en-AU. Optionally set `voiceId`, `modelId`, `stability`, `similarityBoost`, `style` (else calm-professional defaults apply). Record *why* in `authorNote`.
4. **Dry-run a request (free).** `npm run voice:generate -- --slug=<slug> --dry-run` prints the voice id, settings and text — no API/Cloudinary. Tighten scripts that read robotic or run long.
5. **One real generation.** `npm run voice:generate -- --slug=<slug> --limit=1 --yes` → play the returned Cloudinary MP3; confirm pace, tone and pronunciation of technical terms.
6. **Review — BLOCKING gate before the batch.** Re-author and regenerate weak audio with `--force --yes`.
7. **Batch generate.** `npm run voice:generate -- --slug=<slug> --yes` (hard cap `VOICE_MAX_GENERATIONS`, write-after-each manifest protect against runaway spend).
8. **Import + verify.** Default persistence writes the audio URL into the seed JSON; run `npm run db:seed-courses` to import. Confirm the lesson exposes the audio resource.

### Script-quality rubric (all must hold)
- **Spoken, not read** — natural sentences, no markup or list syntax voiced aloud.
- **Grounded** — every claim traces to the lesson/research; nothing unverified introduced.
- **en-AU** — spelling and examples; technical terms pronounceable (spell out acronyms on first use where it helps TTS).
- **On-tone** — calm, practical, evidence-led; no hype; ends on the single next action.
- **Length-appropriate** — fits the lesson; long lessons split into per-section briefs rather than one wall of text.

## Flags reference (`scripts/generate-course-voiceover.ts`)
`--plan` · `--generate` · `--dry-run` · `--slug=<slug>` · `--limit=N` · `--force` ·
`--persist=seed|db|both` (default `seed`) · `--yes` (skip the interactive spend confirmation).
Env: `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID` (default `eleven_multilingual_v2`),
`ELEVENLABS_LOCALE` (default `en-AU`), `VOICE_MAX_GENERATIONS` (default 50). Resumable run state:
`data/voice/course-voice-results.json` (gitignored).

## See also
- Slash commands: `/course-media` (drives this skill), `/course` (full pipeline).
- `skills/design/course-thumbnails.skill.md` (the sibling image generator this mirrors).
- `docs/plans/2026-06-18-carsi-video-assistant-production-pack.md` (voice direction source).

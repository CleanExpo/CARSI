# Course Creation Pipeline

A repeatable, gated workflow for producing **branded, on-brand CARSI training courses** with
research, written content, and media (image / voice / video). It is exposed as a set of Claude
Code slash commands in `.claude/commands/` and reuses the existing media tooling rather than
adding parallel implementations.

## Design principle

Every CARSI media pipeline splits judgement from spend, and this one follows suit:

> Claude authors a JSON **brief/draft** → a deterministic `tsx` script consumes it, calls the
> paid API, uploads to Cloudinary → results persist into `data/seed/courses-catalog.json` →
> `npm run db:seed-courses` imports to Postgres.

Slash commands carry workflow and judgement. They do **not** re-implement API calls — they
invoke `npm run …`, the skills, and (for previews) MCP tools.

## The commands (run in order, or resume one stage)

| Command | Stage | Reuses | Writes |
| --- | --- | --- | --- |
| `/course` | orchestrator | the six below | — |
| `/course-research` | research | `truth-finder`, `australian-context`, WebSearch | `data/courses/<slug>/research.md` |
| `/course-construct` | structure | `foundation-first`, `courses-catalog-types.ts` | catalogue skeleton in `data/seed/courses-catalog.json` |
| `/course-develop` | content | `truth-finder`, `australian-context` | lesson `contentBody` + quizzes + resources |
| `/course-media` | media | `course-thumbnails` (gpt-image-1), `course-voiceover` (ElevenLabs), HeyGen repo scripts | `thumbnailUrl`, per-lesson audio in `resources`, brand video MP4s |
| `/course-brand` | brand gate | `design-system`, `australian-context` | fixes flagged upstream |
| `/course-ship` | verify + seed | `verification-first` | DB (via `db:seed-courses`) |

## Connectors

> Full connector map (ingest, export, media, products): [`CONNECTORS.md`](./CONNECTORS.md).

- **ChatGPT image generator** = OpenAI `gpt-image-1` — `scripts/generate-course-thumbnails.ts` (`npm run db:thumbnails:*`). Already wired.
- **ElevenLabs voice** — NEW `scripts/generate-course-voiceover.ts` (`npm run voice:plan` / `voice:generate`), skill `skills/content/course-voiceover.skill.md`, briefs `data/voice/course-voice-briefs.json`. Also exposed as an MCP server in `.mcp.json` (`elevenlabs`) for interactive previews — but committed, spend-capped narration must come from the script.
- **HeyGen video** — existing repo pipeline `scripts/automate-brand-videos.ts` (`npm run video:brand:*`) + `src/lib/brand-video-assistant.ts`. The HyperFrames MCP `compose`/`render_video` tools are **disabled on CLI agents**, so do not route generation through MCP.
- **Cloudinary** — all media uploads (`src/lib/server/cloudinary-upload.ts`): thumbnails → `carsi/admin-courses`, audio → `carsi/course-audio`, video → `carsi/demo-videos`.

## Governance

- Compound Engineering loop: `docs/agent-framework/COMPOUND_ENGINEERING_LOOP.md`.
- Verification Gate (mandatory `npm run type-check`): `docs/agent-framework/CARSI_VERIFICATION_GATE.md`.
- Spend gates: every paid generator has a `--dry-run`, a hard cap, a resumable manifest, and an
  interactive spend confirmation (`--yes` to bypass for non-interactive runs).
- en-AU throughout; no overclaiming IICRC / insurer / NRPG / compliance authority.

## Quick start

```bash
# 1. Research → structure → content are authoring steps (no spend):
/course "Cat 3 water damage restoration for new technicians"

# 2. Media (spend-bearing — dry-run, review, then generate):
npm run db:thumbnails:generate -- --slug=<slug> --dry-run
npm run voice:generate -- --slug=<slug> --dry-run

# 3. Ship:
npm run type-check && npm run db:seed-courses
```

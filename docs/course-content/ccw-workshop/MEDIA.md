# CCW Workshop — Media Wiring (CARSI ⇄ Synthex)

How the images and video for the CCW training modules and marketing get **produced by the Synthex media
factory** and land back in CARSI. This is the "wire it into the Synthex ecosystem" bridge.

## The three pieces

```
  CARSI (declares what's needed)          Synthex (produces it)              CARSI (embeds it)
  ────────────────────────────           ──────────────────────            ─────────────────────
  data/media/                            scripts/generate-course-media.mjs   *-media-assets.generated.json
    ccw-workshop-media-manifest.json  ──▶  → /api/media/generate/image   ──▶   (asset map: id → url)
    (SSOT: prompts, specs, placement)      → /api/media/generate/video          + module thumbnailUrl /
                                           → /api/media/generate/voice            introVideoUrl, marketing
                                           (saved to media library, tagged)       stills & trailer
```

1. **Manifest (this repo — the source of truth).**
   [`data/media/ccw-workshop-media-manifest.json`](../../../data/media/ccw-workshop-media-manifest.json)
   lists every asset the modules + marketing need. Each entry carries a **verbatim Synthex media-gen
   payload** (`request`), the target `endpoint`, its `placement`, and `tags`. Editing the course's media
   need = editing this file. Prompts are AU-produced, brand-consistent (CARSI blue), and carry **no
   fabricated claims and no IICRC-certification implications** in-image.

2. **Bridge (Synthex — `scripts/generate-course-media.mjs`).** Reads the manifest, **validates every
   payload against the live endpoint schema** (a bad prompt/aspect ratio fails *before* any spend), then
   with `--execute` drives the factory, saves outputs to the media library under the manifest tags, and
   writes an **asset map** back.

3. **Asset map (this repo — generated).** `ccw-workshop-media-assets.generated.json` maps each manifest
   `id` → the produced `url` / `assetId` / status. Modules and the course record then reference those
   URLs (`thumbnailUrl`, `introVideoUrl`, inline diagrams; marketing stills + trailer).

## Running it

```bash
# From the Synthex repo — dry-run: validate shapes, spend nothing, no credentials needed
node scripts/generate-course-media.mjs <path-to>/ccw-workshop-media-manifest.json

# Generate for real (founder-triggered — needs the media API keys provisioned in Synthex)
SYNTHEX_BASE_URL=https://<synthex-host> SYNTHEX_MEDIA_TOKEN=… \
  node scripts/generate-course-media.mjs <manifest> --execute
# subset: --only=ccw-mkt-course-trailer,ccw-m9-machine-archetypes-hero   --kind=image
```

## Key readiness (Synthex prod, confirmed 2026-07-11 — presence only)

| Capability | Key(s) | Status |
|---|---|---|
| Images (10 assets) | `OPENAI_API_KEY`, `GEMINI_API_KEY` | ✅ set |
| Generative video (fal) | `FAL_API_KEY`, `FAL_WEBHOOK_SECRET` | ✅ set |
| Voice | `ELEVENLABS_API_KEY` | ✅ set |
| Presenter video (HeyGen) | `HEYGEN_API_KEY` | ✅ set |
| Branded voice id | `ELEVENLABS_VOICE_ID` | ⚠️ **unset** — phase-2 only |
| Alt providers (d-id/runway/synthesia/stability) | — | ⚪ not set, not needed |

**All 15 assets can generate now.** The only gap (`ELEVENLABS_VOICE_ID`) affects only the optional
phase-2 presenter videos, not the phase-1 run.

## Phased video (decision 2026-07-11)

- **Phase 1 — ships now.** The 3 module explainers are **fal text-to-video b-roll** (branded motion +
  on-screen text) — no presenter, no voice id needed. Runs against the keys already set.
- **Phase 2 — presenter upgrade.** Each explainer's `narrationScript` + `phase2Presenter` block wires a
  **HeyGen talking-presenter** version in the CARSI ElevenLabs voice. Gated only on `ELEVENLABS_VOICE_ID`.

## What's in the v1 manifest (15 assets)

| Scope | Assets |
|---|---|
| Module 9+ maintenance | machine-archetypes hero · six-interval diagram · explainer video |
| Module 12 stain | escalation-ladder infographic · stain-kit hero |
| Module 13 strip & seal | nine-step sequence infographic · explainer video |
| Module 14 add-ons | add-on-menu infographic · **vehicle fuel-safety diagram** · (explainer) |
| Module 15 marketing | YouTube→social hub-spoke diagram · explainer video |
| Marketing | course thumbnail · social square (1:1) · social story (9:16) · course trailer (30 s) |

## Guardrails (carried into every asset)

- **Australian-produced** — AU context, 230 V / 10 A, metric; no US imagery.
- **IICRC CEC terminology** — nothing in-image implies IICRC certification; CARSI is a CEC provider.
- **Prove-it-or-cut-it** — no fabricated statistics or performance claims baked into any still or video;
  marketing copy that accompanies these assets still runs the `nexus-copywriter` gate + the CCW
  `substantiation-ledger.md`.
- **Credentials** — live generation uses the media API keys provisioned in Synthex; this bridge never
  hunts or embeds them. Dry-run needs none.
- **No container runtime needed** — the bridge is pure Node + `fetch`; generation happens in Synthex.

# Course intro videos — render handoff

**Status (2026-07-16):** All 32 intro scripts authored and the write-back proven. The render is the
only remaining step and is **owner-gated on secrets** — it spends HeyGen credits, so it can't run
from a dev box without keys.

## What's already done (this branch: `feat/course-completion-wave0-1`)

- **32 intro scripts** — `data/video/course-intro-video-briefs.json` (one per intro-missing course,
  ~50s / 106–126 words, en-AU, CARSI educator voice, grounded in each course's own modules, no
  standards-content claims).
- **Render script** — `scripts/generate-course-intro-videos.ts` (HeyGen avatar → Cloudinary →
  results map). `--dry-run` verified at $0. `--generate` guarded by a spend confirm + `HARD_CAP=40`.
- **Write-back glue** — `scripts/apply-intro-video-urls.ts`. Proven end-to-end: with mock URLs on
  all 32 courses the completeness gate went to **37/37 finalised, introVideo 0/37**; reverted so no
  fake URL is committed.

## Secrets required (all MISSING on the dev box; live in DigitalOcean repo secrets)

| Secret | Purpose |
|---|---|
| `HEYGEN_API_KEY` | render the avatar video |
| `HEYGEN_AVATAR_ID` | which presenter avatar |
| `HEYGEN_VOICE_ID` | en-AU voice (or set per-brief) |
| `CLOUDINARY_CLOUD_NAME` (`dmaulkthb`), `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | host the MP4 |

## Render sequence (once secrets are set)

```bash
# 1. free preview — prints the HeyGen payload for every course, no spend
npx tsx scripts/generate-course-intro-videos.ts --dry-run

# 2. VALIDATE on ONE course first (spends 1 credit) — confirm the avatar/voice/look
npx tsx scripts/generate-course-intro-videos.ts --generate --slug=water-damage-restoration-fundamentals --limit=1 --yes

# 3. review the single result, then batch the rest (skips done courses; HARD_CAP 40)
npx tsx scripts/generate-course-intro-videos.ts --generate --yes

# 4. write the rendered URLs into the catalog (introVideoUrl + meta.introVideoUrl)
npx tsx scripts/apply-intro-video-urls.ts

# 5. confirm
node scripts/check-course-completeness.mjs   # expect Finalised 37/37
```

## Caveat — validate before batching

The `--generate` path is a faithful mirror of the proven lesson-video HeyGen calls
(`scripts/generate-course-lesson-videos.ts`) but has **not been exercised against the live HeyGen
API** (no keys on the dev box). Run step 2 (one video) and eyeball the result before the batch in
step 3 — that's why the script is idempotent and single-slug capable.

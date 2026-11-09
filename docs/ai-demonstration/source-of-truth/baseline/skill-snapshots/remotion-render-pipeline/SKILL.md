---
name: remotion-render-pipeline
description: Use when an existing composition is ready for rendering or delivery preparation.
allowed-tools: Read, Grep, Glob, LS, Bash, Write, Edit
---

# remotion-render-pipeline

Use the existing project's `remotion-studio` and render configuration. A composition's ready flag authorises preparation, not paid synthesis or publication.

1. **Baseline.** For narrated software demonstrations, read [the shared contract](../remotion-editing/references/video-sync-contract.md). Record parent SHA and client change brief; preserve the approved master. Completion: applicable baseline and scope recorded.
2. **Preflight.** Run the repo-defined typecheck and dry-run. Resolve assets from the calling project and documented credential stores; never scan unrelated projects for keys. Completion: reproducible production packet passes and asset rights are recorded.
3. **Audio.** Reuse approved original narration where suitable; any new synthesis requires existing metered-use authority. Measure actual complete sentences before deriving frame durations. Missing audio permits only an explicitly requested silent draft. Completion: measured audio fits the shared timeline.
4. **Render.** Use `npx tsx render/render.ts` with the project's composition, output and props. Keep generated media outside git. On failure, read the reliability rule and use its persistent ledger; no automatic unchanged retry. Completion: artifact exists and exact command, codec, range, dimensions, duration, cadence and SHA are recorded.
5. **Verify.** Inspect final actions/captions and every-second privacy frames, then play the exact artifact naturally at 1x with sound. For software demos run `python3 ~/.unite-group/video-sync/verify_sync.py MANIFEST`. Completion: report real results and remaining blockers; decoding and audio correlation do not prove semantic sync.
6. **Deliver.** Prepare the private review package first. Upload, send messages or publish only with explicit destination authority and required independent review, six-board and human release gates. Completion: actual delivery receipt or exact blocked action is recorded. Local render success never implies upload, Telegram delivery, ticket creation or production acceptance.

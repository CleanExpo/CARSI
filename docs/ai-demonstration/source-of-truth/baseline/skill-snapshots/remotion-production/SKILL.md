---
name: remotion-production
description: Use when a video needs production evidence and readiness validation.
allowed-tools: Read, Grep, Glob, LS, Bash, Write, Edit
---

# remotion-production

1. **Contract.** For narrated software demonstrations, load [the baseline contract](../remotion-editing/references/video-sync-contract.md). Preserve the approved master and record parent SHA for derivatives. Completion: applicable standard and scope recorded.
2. **Prepare.** Use `remotion-studio/render/one-shot.ts` for production packets and `render/render.ts` only after dry-run passes. Write production-packet.json, script.md, preflight-report.md and reproducible render-command.sh under `.harness/remotion/<jobId>/`. Completion: typecheck and dry-run pass, assets and narration exist.
3. **Validate.** Require production audio unless the owner requested a silent draft; reject clipping or absent narration. Validate the final media, shared-timeline evidence, reading windows, actual actions, privacy and full playback. Completion: render-report.md identifies exact SHA and PASS/HOLD reasons; software demonstrations run `~/.unite-group/video-sync/verify_sync.py MANIFEST`.
4. **Release.** Keep MP4s in output/external storage, never commit large generated media. Completion: independent review, relevant six boards and exact-artifact owner approval exist before claiming production readiness; publication and spending require their existing authority.

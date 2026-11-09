# Owner-approved demonstration baseline — 09/11/2026

Phill explicitly accepted the keyboard-tip edition after requesting full-screen review and instructed that it become the starting standard. Exact master: SHA256 `446042327ce9bb0c8a0f163f4658df8fbc4dc60637a6fdbfba14085599a2d88f`, 4:26.40, 6,660 frames, native 25fps. The source of owner approval and paths are in `approved-baseline.json`.

This is the minimum starting standard for narrated software demonstrations. Improve from it; never silently replace it with an earlier rejected export. Client changes are new derivatives, with a parent SHA and an explicit brief; preserve the approved master and original source.

## Required method

1. Name the application and show Open → Brief → Send → Check → Correct → Approve. Keep the prompt, response and controls large enough to read. Use actual clean fictional screen capture; exclude the owner's work and accounts.
2. Use one frame timeline for complete original narration sentences, recorded actions, captions and reading intervals. Preserve source cadence; do not manufacture speech by joining borrowed words or splitting sentences across silent holds.
3. Show “Don't press Enter yet” before the request is complete. Demonstrate actual Shift + Enter creating a new line while the request remains unsent, then explain when Enter or Send submits it. Add only relevant, verified tips. Visual-only instructions must not be described as newly voiced narration.
4. Match each spoken click instruction to its corresponding action within 250ms. Qualify continuous capture; unexplained active-typing unchanged intervals above 750ms require repair. Do not conceal capture freezes as reading holds.
5. Allow at least 3 seconds and words / 3 seconds per completed-text reading interval. Label reading intervals, with gentle motion or progress. Place complete explanatory sentences before or after them. Do not remove necessary reading time to make a video seem faster.
6. Review the exact exported SHA naturally at 1x unmuted, with action checkpoint and every-second privacy evidence. Fullscreen preserves position; replay is a separate explicit action. Wait for sufficient buffering before starting. Record startup events honestly; do not filter them to manufacture a gate PASS.
7. For every client derivative: record parent SHA, requested changes, original-source/asset rights, new narration if any, timeline, measured actions, reading windows and final playback. Compare affected sections with this baseline and obtain fresh acceptance. No automatic spending, upload, outreach or publication.

## Acceptance boundaries

Owner approval establishes this exact artifact as the accepted starting standard and closes this section's quality correction. It does not invent an independent reviewer, certify hardware audio, approve publication or satisfy every production board. Existing `VIDEO-SYNC-RULE.md` and `verify_sync.py` remain mandatory. Do not weaken their checks to make the accepted baseline pass. The preserved raw playback contains time-zero seek/wait events; no mid-playback stalls or dropped frames occurred. Independent watch/listen evidence remains absent, so the strict production gate remains HOLD.

## SQL register

`baseline-schema.sql` and `baseline-seed.sql` maintain a small local SQLite baseline register, not an application or production database migration. Apply schema, then seed, to `standards.sqlite3`; both are idempotent. The accepted baseline and requirement rows are immutable. A newer approved baseline is a new row; preserve its history. The register does not enforce render behaviour by itself: skills load this contract, and the executable gate checks artifact evidence.

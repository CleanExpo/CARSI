# AI in Business — consolidated working source

09/11/2026 · CleanExpo/CARSI · UNI-2934 · owner MacBook/codex

Start with [current decisions](DECISIONS.md), the [edition register](editions.json) and the [full 15-minute continuation](CONTINUE-THE-PRESENTATION.md). The accepted 4:26.40 video is a demonstration segment, not the whole talk.

| Material | Location | Status |
|---|---|---|
| Original wider talk, notes, sources and 14 scenes | [full-talk.json](history/full-talk.json) | Historical 900-second content source |
| Later tutorial content | [compact-tutorial.json](history/compact-tutorial.json) | Historical compact edition |
| Accepted video | [private-assets.json](private-assets.json) | Exact owner-approved master in private custody; production HOLD |
| Shared timeline, captions, chapters and prompts | [approved-demo](approved-demo/) and [recorded-workflow.json](recorded-workflow.json) | Preserved source evidence |
| Baseline, SQL and video skill snapshots | [baseline](baseline/) | Prior accepted standard; no production DB migration |
| Six practical exercises and five fictional cases | [companion guide](companion-guide/ChatGPT-business-task-guide.html) | Separate content revision; five cases not live-tested |
| Owner corrections and source locators | [owner-instructions.json](provenance/owner-instructions.json) | Curated primary messages, duplicates removed |
| Collection coverage and exclusions | [coverage.json](provenance/coverage.json) | Bounded inspected sources; gaps explicit |
| All collected file hashes and original locations | [manifest.json](manifest.json) | Byte-integrity register, not factual certification |

The unpublished React implementation is preserved on branch `uni-2934-ai-business-presentation` (merged head `2c5682326cd88fdbbdd2bab93993182e30b2c751`), with source under `src/lib/ai-demonstration` and `src/components/ai-demonstration`. This focused collection branch does not include or change those application additions. The proposed continuation preserves 14 scene IDs and totals exactly 900 seconds, including the approved clip once at the beginning.

Historical receipts, timeline labels and skill copies are preserved verbatim. Some say PENDING because they were created before owner acceptance; editions.json records the later acceptance while retaining strict production HOLD. Source snapshots contain dated factual claims and product instructions; verify them again before adding them to new narration. No new external research, live model case testing, paid generation, production database change, deployment or release was performed by assembling this collection.

Private raw histories, unrelated estate records, credentials, cookies and unlicensed stock are excluded. Original source capture and avatar footage remain in recorded custody locations; historical build scripts are not yet portable. A final 15-minute rendered master, new segment narration, independent watch/listen and production acceptance remain required. Source code publication has its separate exact-commit repository gate.

The native PC scan read 1,751 Claude and 162 Codex log files. All 20 keyword candidates and one additional child were classified as unrelated; see [PC recovery evidence](provenance/pc-native-log-coverage.json). ChatGPT coverage is title screening of 1,069 active and 46 archived chats, with three selected candidates read; complete Claude web and other provider account histories remain unverified; two bounded Claude desktop searches are recorded separately.

The [original October planning pack](history/2026-10-14-ai-pathways/README.md) contains the earlier complete script, outline, demo runbook, handout, research and design research. The [October grill](history/2026-10-14-grill.md) is historical and partly superseded. Separate RestoreAssist talk/product candidates are catalogued with exclusions in [alternate-brief-candidates.json](provenance/alternate-brief-candidates.json); they do not govern this talk.

Run `python3 docs/ai-demonstration/source-of-truth/verify_collection.py` from the repository root to check file hashes, private-master metadata, proposed schedule, displayed guide arithmetic and temporary SQL integrity. Without `--master /absolute/path/to/AI-in-Business-Keyboard-Tips.mp4`, the result explicitly says SOURCE_PASS_MEDIA_NOT_CHECKED. Supply the local path to verify the private master as well. The collection checker does not render media, access production or certify narration synchronisation.

CARSI is public. The film, raw captures and original avatar footage stay in recorded private custody; this repository contains their locations and approval/hash evidence. Consolidating source material is separate from production video release. No MP4 is included in this public source collection.

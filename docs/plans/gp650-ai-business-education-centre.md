# GP-650 — CARSI AI Business Education Centre (research)

Linear: **GP-650**. Research + concept only until Phill signs concept §10 and legal/OAIC pass.

## Status (2026-11-02)

| Phase                                    | State                       | Notes                                                                                   |
| ---------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------- |
| Research 1 (Claude Code Club)            | Done locally                | `D:\CARSI-specs\carsi-ai-business-centre\research\01-claude-code-club.md` — not in repo |
| Research 2 (landscape)                   | Done locally                | `research\02-landscape.md`                                                              |
| Concept synthesis                        | Done locally                | `concept.md` — 5 stages, $795 membership fit, Melbourne demo outline                    |
| Slice 1 (`/ai` + staff rule, flag-gated) | Review PASS, **not merged** | Branch `claude/ai-centre-slice1` @ `acf57229`; `AI_CENTRE_ENABLED` off → real 404       |
| Publish                                  | Blocked                     | Phill Q1–Q3, OAIC wording, D1 exemption list, CI mirror                                 |

## Repo touchpoints (when merged)

- Route group `app/(ai-centre)/` — no chat, no model calls in slice 1
- Related goals: **GP-561** (business coaching roof), **GP-634** (if wired in Linear)

## Next agent actions

1. Do not ship marketing or `/ai` without founder sign-off.
2. When Phill approves concept, open PR from `claude/ai-centre-slice1` or rebase onto `main`.
3. Keep **no IICRC/CEC framing** on this surface (business training only).

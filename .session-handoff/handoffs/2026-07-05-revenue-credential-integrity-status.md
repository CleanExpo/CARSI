# Session Handoff — Revenue & Credential Integrity programme status (2026-07-05)

Scope: CARSI Revenue & Credential Integrity release — board reconciliation, GP-439 item 6
closure, GP-454 production verification. Session was read-only against the repo; all
mutations were Linear comments and user-memory updates.

## 1. Summary

- **Completed:** Full reconciliation of the GP-439…GP-454 programme board against repo +
  GitHub + live site. **GP-439 item 6 (Stripe zero-charge history check) executed and
  closed with evidence** — posted to GP-439. **GP-454 production-verified live** (no phone
  numbers on carsi.com.au/contact, "Ask Margot" CTA present) — posted to GP-454.
- **Not touched (correctly):** No code written. GP-446 (blocked by WS2b coverage), GP-448
  (founder-acceptance gated), GP-449 remainder + GP-439 item 2 (Rana-only irreversible
  ops), GP-445 further tranches (pilot calibrates the bar; SME review first).

## 2. Where it started

Re-invoked `/nexus /spm` carrying a stale 2026-07-04 session transcript. The de-facto
handoff was that transcript; the real handoff file was lost (written to a dead session
directory — lesson recorded, this file is in-repo for that reason).

## 3. Decisions locked + what shipped

Nothing shipped to the codebase this session (read-only). Shipped to Linear:
- GP-439 comment `cbbb527b` — item 6 evidence: **zero yearly/Teams/membership
  subscriptions or charges have ever existed** in the shared Stripe account (exhaustive
  all-status subscription listing: 2 subs total, neither CARSI membership; charge search
  at all six membership amounts: only three AUD $99 WordPress-era one-time course orders).
- GP-454 comment `73fcd91c` — PR #387 merged green + live-site verification.
- Memory updated: `carsi-linear-project.md` (Linear MCP is the preferred access path;
  `list_issues` returns identifiers in the `id` field).

## 4. Key files

| File | Status |
|---|---|
| docs/specs/next-step-up.spec.md | Read-only inspected (Rev 2 on main, commit 67333c44 verified) |
| .session-handoff/handoffs/2026-07-05-revenue-credential-integrity-status.md | Created (this file) |
| ~/.claude/projects/D--CARSI/memory/carsi-linear-project.md | Modified |

## 5. Running state

Nothing running. Worktree `festive-faraday-4b2b99` on branch `claude/epic-mayer-ada726`,
clean at `84faea3e`, one merge behind origin/main (PR #387).

## 6. Verification

- `scripts/handoff-loop.sh` does not exist in this repo — no local gate run. Tree is
  clean with zero session changes; latest main merge (PR #387) passed full CI (all
  checks SUCCESS, verified via `gh pr list --head feat/contact-remove-phone-margot`).
- Re-verify board: Linear MCP `list_issues` project=CARSI; re-verify live site:
  fetch https://carsi.com.au/contact and grep for `tel:`/phone numbers.

## 7. Deferred + open questions

Deferred (all human-gated — none blockable by an agent):
- **GP-439 item 2** — Owner: Rana. Blocking: E1 revenue go-live + GP-448. Create Stripe
  Prices per docs/runbooks/rana-stripe-connection.md (a reviewed create command sits
  typed in the DO console).
- **GP-439 item 4 / GP-445 publish** — Owner: founder/SME. Blocking: WS2b publish →
  GP-446 → GP-448. Review 3 pilot quizzes per docs/runbooks/sme-review-checklist.md
  (level-2-mould `sourceGaps` is the big fill-in).
- **GP-449 remainder** — Owner: Rana (label rana-handoff). #289 doadmin rotation,
  #293 Vercel retirement.
- **GP-454 sign-off** — Owner: Phill (needs-phill-signoff). Live verification already
  posted on the issue.
- **GP-448 (WS4)** — Owner: founder. Accept members-engine + Search Authority specs,
  then dispatch.

Open questions: none new this session.

## 8. Pick up here

- **Do not redo:** board reconciliation; GP-439 item 6 (closed with evidence);
  GP-454 build/verification; any WS0–WS3 work (all Done).
- **Start here:** after SME sign-off on GP-445, dispatch the seed script + next authoring
  tranche (T1 = the 10 quiz-advertising courses, list on GP-444); after full WS2b
  coverage, dispatch GP-446. After Rana creates Prices, verify lookup_key
  `carsi_pro_annual` resolves and E1 flag can flip.
- **First command to run:** `git fetch origin && git log --oneline -5 origin/main` then
  Linear MCP `list_issues` project=CARSI to re-read the board.

## 9. Risk notes

- autogit (patched to refuse main/master) still auto-publishes non-main branches; this
  handoff file is written publish-safe on that assumption. An `npm install -g` upgrade
  silently removes the patch.
- Stripe charge search relies on Stripe's search index; the exhaustive subscription
  listing independently confirms the zero-membership verdict.
- GP-445's In Review state means the 3 pilot quizzes exist as repo JSON only — nothing
  seeded/published; do not treat WS2b as started beyond the pilot.

## 10. Handoff quality check

All claims trace to tool results in-session (Linear comment IDs, gh CLI output, Stripe
API responses, WebFetch of the live site). No process claimed running; nothing claimed
shipped beyond the two Linear comments and this file.

Handoff complete. Next safe action: founder locks GP-439 items 2+4 (Rana's Stripe runbook + SME review of the 3 pilot quizzes) — every remaining programme gate is human, not agent.

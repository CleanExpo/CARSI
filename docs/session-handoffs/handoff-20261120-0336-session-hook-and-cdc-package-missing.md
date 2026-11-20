# Session Handoff — SessionStart hook shipped · SWMS work lost · CDC activation blocked (PACKAGE_MISSING)

**Timestamp:** 2026-11-20T03:36:45Z · **Branch:** `claude/new-session-bynlc4` · **Repo:** CleanExpo/CARSI
**Phase 0 gate:** GREEN — mandatory gate `npm run type-check` → `tsc --noEmit` clean. Git tree clean (0 uncommitted before this file). Branch pushed; draft PR [#1134](https://github.com/CleanExpo/CARSI/pull/1134) open and subscribed.

---

## 1. Summary of what was done

Three threads, one shipped, one lost, one blocked.

- **SessionStart hook (COMPLETED, pushed, PR #1134 draft).** A cloud session starts from a fresh
  clone with no `node_modules`, so the first `type-check` / `lint` / `test:unit` of every session
  failed until someone installed by hand. Added `.claude/hooks/session-start.sh` +
  `.claude/settings.json`. Synchronous, remote-only, idempotent, hash-guarded, retried.
- **SWMS de-branding (COMPLETED then LOST).** Nine Disaster Recovery QLD documents were
  de-branded and verified page by page, plus a `/resources/swms-templates` page, a manifest and a
  guard with a self-test. It was committed as `2a212ca` in the PREVIOUS container, `git push` was
  denied three times by the auto-mode permission classifier, and the container was reclaimed
  before the denial was lifted. **That commit no longer exists anywhere.** The nine finished PDFs
  were delivered to the founder as chat files and survive; the repo work does not.
- **P0 CDC activation, CARSI + RestoreAssist Margot (BLOCKED — PACKAGE_MISSING).** The
  implementation brief archive was never attached. Read-only baseline discovery was done for both
  tracks; no branch, worktree, SPM spec, Gatehouse run or Done contract was opened, because the
  package defines the content and the evidence contract.

## 2. Where it started

Founder uploaded nine PDFs (seven CSA-template SWMS, a signed working-at-height SWMS, a DRQ
assessment report) and asked to "remove the Disaster Recovery Qld Logos, Name, and Clients details
and just commit to building Clean PDFs for these SWMS to be added to CARSI as Resources". Then
`/session-start-hook`. Then a P0 instruction to activate the CARSI course + RestoreAssist Margot
indoor-environment evidence package as two independently gated tracks.

## 3. Decisions locked + what shipped

**Shipped (git, branch `claude/new-session-bynlc4`):**
- `e566a3c` — `chore(claude): SessionStart hook to install deps in cloud sessions`. Draft PR #1134
  against `main`, subscribed to PR activity. Not merged.

**Decisions locked this session:**
- Hook runs **synchronously**, not async — nothing may run `type-check` against an empty
  `node_modules`. Founder was offered async and has not answered.
- Hook uses `npm install`, not `npm ci`, so a cached container image is reused rather than deleted
  and rebuilt. Lockfile still respected.
- Hook install is **retried up to 3×**: the egress proxy reset a tunnel mid-transfer on one of two
  runs while it was being written. A failure after the last attempt still exits non-zero with no
  hash file written.
- On the lost SWMS work: the CSA vendor mark was deliberately **left on** each page. Stripping a
  third-party author's mark while redistributing their template increases exposure rather than
  reducing it. A DECISIONS row (#17, redistribution rights) was drafted and is **also lost**.

**Explicitly NOT done (and why):** no SPM spec, Gatehouse run, Done contract, branch or worktree
for either CDC track. Without the package there is nothing to specify. Creating them would be the
"text plan presented as integration" the brief forbids.

## 4. Key files

| File | Status |
|---|---|
| `.claude/hooks/session-start.sh` | Created, committed `e566a3c` — the hook |
| `.claude/settings.json` | Created, committed `e566a3c` — registers it on SessionStart |
| `docs/session-handoffs/handoff-20261120-0336-session-hook-and-cdc-package-missing.md` | Created (this file) |
| `public/downloads/swms/*.pdf` (9) | **LOST** — existed in `2a212ca`, never pushed |
| `app/(public)/resources/swms-templates/page.tsx` | **LOST** — same commit |
| `src/lib/marketing/swms-templates.ts` | **LOST** — same commit |
| `scripts/check-swms-templates.mjs` + `.test.mjs` | **LOST** — same commit |
| `/home/user/cleanexpo/restoreassist` | Read-only clone at `71ac7cc`, **ephemeral** (not in this repo) |

## 5. Running state

- **No background processes running.** The RestoreAssist clone completed (exit 0).
- `node_modules` installed (783 packages), Prisma client generated to `src/generated/prisma`.
- This container is ephemeral. Everything not pushed dies with it — as `2a212ca` already did.

## 6. Verification — exact commands

Run and observed in this container:

```bash
npm run type-check                                             # exit 0
npx eslint app/sitemap.ts src/lib/prisma.ts                    # exit 0
npx vitest run --config config/vitest.config.ts \
  src/lib/lms/strip-ai-writing-signs.test.ts                   # 1 file, 6 tests passed
CLAUDE_CODE_REMOTE=true ./.claude/hooks/session-start.sh       # cold: 783 pkgs + prisma generate
CLAUDE_CODE_REMOTE=true ./.claude/hooks/session-start.sh       # warm: skipped, 0.004s, no npm output
./.claude/hooks/session-start.sh                               # CLAUDE_CODE_REMOTE unset: no-op
```

Hash-guard coverage was proven per input: editing each of `.claude/hooks/session-start.sh`,
`package.json`, `package-lock.json`, `prisma/schema.prisma`, `prisma.config.ts` made
`sha256sum --check` fail (install reruns) and restoring it returned to the skip path; removing
`node_modules/.session-start.sha256` also forced a reinstall. The install's failure path was
observed for real, not simulated: the first attempt died on `ECONNRESET` from the proxy and no
hash file was written.

## 7. Deferred + open questions

1. **PACKAGE_MISSING.** `CARSI_RestoreAssist_Margot_Integration_Package_20261120.zip` was not
   attached. `/Volumes/...` does not exist (macOS path; this is a Linux container),
   `/root/.claude/uploads` does not exist, and a filesystem-wide search for the archive name and
   for `MANIFEST_SHA256.json` found nothing. No member was read, no digest verified.
2. **No `/spm` or `/gatehouse` skill** exists in CARSI, in the RestoreAssist clone, or in the
   global skills directory. The Done harness does exist (`.claude/done` in both repos;
   RestoreAssist also has a `/done` command). Founder must supply these or name substitutes.
3. **No push access to RestoreAssist.** It is readable anonymously but GitHub API tools do not
   cover it; Track B implementation needs `add_repo` with `access: "push"`. RestoreAssist `main`
   was pushed to ~3 minutes before inspection, so another agent may hold the baton — confirm
   before branching.
4. **Rebuild the SWMS library?** Founder's call. The nine cleaned PDFs are in their chat history.
   The method is reproducible: the branding was an overlay block appended to each page's content
   stream (`/XOnn Do` for logo and signature plus five text operators), so removing those blocks
   de-brands the seven text-layer SWMS exactly; the assessment report needed logo-image removal
   on eight pages plus tagline/number/SSRA-line redaction; the working-at-height scan has no text
   layer and needed pixel redaction on pages 1 and 11 with the six header labels redrawn.
5. **DECISIONS #17 (SWMS redistribution rights) was never committed.** If the library is rebuilt,
   the question stands: the templates are third-party CSA work, so republishing them needs
   founder confirmation of the licence.
6. **Hook mode** — synchronous by default; founder offered async and has not answered.

## 8. Pick up here

1. **Get PR #1134 reviewed and merged.** Once it is on the default branch every future cloud
   session installs dependencies automatically. It is a draft; CI has not been checked since push.
2. **For the CDC activation:** ask the founder to attach the ZIP to the conversation. Then verify
   all 18 member digests against `MANIFEST_SHA256.json` and reject on mismatch, read the eight
   named members, and only then open the two SPM specs and isolated branches.
3. **Track A baseline already established** (no need to redo): `carsi-course-production/SKILL.md`
   is the standard (AU English, 230 V/10 A, metric, AS/NZS + Safe Work Australia, AUD, AU+NZ dual
   jurisdiction per DECISIONS #35). Authoring entities are `LmsCourse → LmsModule → LmsLesson`
   plus `LmsQuiz`/`LmsQuizQuestion`. Two constraints bite on the 6-module/18-lesson/54-item
   mapping: a new course must ship `cecHours: 0` (CEC is fail-closed, founder-approval only), and
   `LmsLesson.durationMinutes` is deliberately nullable — a derived length is the same defect
   class as an unapproved CEC claim, so lesson lengths must be authored.
4. **Track B baseline already established** (no need to redo): RestoreAssist Margot is 54 files
   across `app/api/margot` (corpus, schedules, voice, access, telegram, chat), `lib/margot`,
   `components/margot`. The reuse targets the brief asks for already exist among 233 Prisma
   models — `EvidenceItem`, `EvidencePin`, `ClientEvidenceSubmission`, `CustodyEvent`,
   `MoistureReading`, `PsychrometricReading`, `InspectionPhoto`, `VoiceCopilotObservation` — and
   knowledge stores `IicrcChunk`, `StandardsChunk`, `RestorationDocument`, `RegulatoryDocument`
   already exist, so **do not build a second knowledge store**. RBAC is
   `Organization`/`WorkspaceMember`/`WorkspaceRole`/`Permission`/`RolePermission`/`MemberRoleBinding`.
   `lib/margot/audit-margot-action.ts` + `action-classifier.ts` suggest part of the
   ASK→ACCEPT→AUDIT chain is already built — verify before adding.

## 9. Risk notes

- **Ephemeral containers are the main risk in this workflow, and it already cost a full day's
  work this session.** Push early; do not leave a commit local. If `git push` is denied by the
  permission classifier, treat it as a hard stop and tell the founder immediately rather than
  continuing to build on an unpushable branch.
- **CARSI Margot ships dark.** `margotStreamingEnabled()` needs `MARGOT_STREAMING`;
  `margotWriteToolsEnabled()` needs `MARGOT_WRITE_TOOLS` **and** a configured action-signing
  secret, so with no secret no confirm token can be minted and writes cannot occur. Any claim
  that Margot write capability is live on CARSI is false as of this SHA — check the flags, not
  the ticket status.
- **This handoff is committed to `claude/new-session-bynlc4`, so it rides on PR #1134** alongside
  the hook. That keeps it durable but mixes a docs file into an otherwise single-purpose PR;
  drop it from the PR if a reviewer objects.
- RestoreAssist was cloned read-only and nothing was written to it. Its baton may be held by
  another agent.

## 10. Handoff quality check

- Mandatory gate run: **yes** — `npm run type-check` clean.
- Every claim above traced to a command run in this container or a file read in it: **yes**.
- Lost work stated as lost rather than summarised as delivered: **yes** (`2a212ca`, §1 and §4).
- Package stated as unread rather than paraphrased: **yes** (§7.1) — no member was opened and no
  digest verified.
- Blockers carry an owner and a next action: **yes** (§7, §8).

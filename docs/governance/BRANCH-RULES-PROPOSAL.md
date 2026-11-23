# Branch rules for `main`: proposal (GP-780)

**Status: proposal only. Nothing here has been applied.** Changing repository settings is
Phill's decision (GP-780 out of scope: "changing branch protection or rulesets without
Phill's yes"). Agent sessions cannot read or change the protection API (HTTP 403), so every
setting below was taken from the workflow files in this repository, not read back from GitHub.

## Why

At 2026-11-22T18:14:28Z `main` was force-pushed from `f4df903e` to `5593ab7e`. Sixteen merged
PRs dropped out of `main`, including the production deploy gate (#1251) and the GP-700
Host-header security fix (#1180), and `8816d352` was then pushed straight to `main`. #1274
restored all 16 with a merge commit (`2408a8b9`); each of the 16 dropped commits is again an
ancestor of `main` (checked with `git merge-base --is-ancestor` on 23/11/2026).

GitHub allowed it because the current protection on `main` lets force pushes and direct pushes
through, and required status checks are not enforced (no contexts). The new
`Main Rewrite Guard` workflow (`.github/workflows/main-rewrite-guard.yml`) now *detects* a
rewrite after the fact. These rules *prevent* one.

## The settings

Use **one** of the two routes below, not both. A ruleset (route A) is GitHub's current
mechanism and can be layered; classic branch protection (route B) is what `main` has today.
If you choose route A, delete or relax the classic rule afterwards so the two do not disagree.

| # | Setting | Value | What it stops |
|---|---|---|---|
| 1 | Block force pushes | On | A repeat of 22/11: rewriting `main`'s history |
| 2 | Restrict deletions | On | Deleting `main` |
| 3 | Require a pull request before merging | On, 0 required approvals | Direct pushes such as `8816d352` |
| 4 | Require status checks to pass | On, the six checks below | Red merges (the RA-8489 pattern) |
| 5 | Require branches to be up to date before merging | On (see trade-off) | A PR going green on a stale base and landing red |
| 6 | Include administrators / no bypass | On, empty bypass list | Rules 1 to 5 being skipped by an owner or admin token |

### Required status checks (rule 4)

These are the job names GitHub reports as check names. All six run on every pull request to
`main` from `.github/workflows/ci.yml` (workflow `CI`, which runs on `pull_request: branches: [main]`
with no path filter and no job-level `if:`). They are the same six the production deploy gate
already requires on the `main` push run (`REQUIRED_CHECKS` in
`scripts/ci/production-deploy-gate.mjs`), so a PR is held to the bar it must later meet to deploy.

| Check name | Job id in `ci.yml` |
|---|---|
| `Dependency Verification` | `dependency-verification` |
| `Frontend Tests` | `frontend-tests` |
| `Unit Tests` | `unit-tests` |
| `Secret Scan` | `secret-scan` |
| `Build Check` | `build` |
| `E2E Tests` | `e2e-tests` |

Set the expected source to **GitHub Actions** for each, so a status posted by another app with
the same name cannot satisfy it.

Optional, for a later step (each also runs on every PR to `main`, but is not in the deploy gate
today, so adding it raises the bar):

- `Learner Data Protection` (`ci.yml`)
- `NPM Audit` and `Trivy Container Scan` (`.github/workflows/security.yml`, workflow `Security Scanning`)
- `Dependency Review` (`security.yml`; it runs only on pull requests, which is fine for a PR rule)

**Do not require** these. A required check that never reports blocks every PR that skips it:

- `check-visuals`: path-filtered and report-only by design (GP-667).
- `Agent PR Validation` jobs (`agent-pr-checks.yml`): they run only on PRs detected as agent PRs.
- `Course Video Sound Guard` jobs: path-filtered.
- `CodeQL` `Analyze (...)`: runs on push to `main` and on a schedule, not on pull requests.
- `Main Rewrite Guard`: runs on push to `main` only. It reports after a push and cannot gate a PR.
- `Deploy Production`, the live guards and the notification jobs: they run on `workflow_run`,
  schedules or dispatch, never on a PR.

### Trade-off on rule 5

"Up to date" means every PR must be rebased or merged with the latest `main` and re-run CI before
it can merge. With many open PRs this adds waiting. If it proves too slow, turn on a **merge
queue** for `main` instead (ruleset rule "Require merge queue"; CI would then need a
`merge_group:` trigger added to `ci.yml`, which is a separate, reviewed change).

### Not recommended

- **Require linear history**: it would reject merge commits, including the `--no-ff` restore in
  #1274 and GitHub's "Create a merge commit" button. Force-push blocking already protects history.
- **Required approvals above 0**: CARSI has one human reviewer; requiring an approval would block
  Phill's own PRs. Raise it when there is a second reviewer.

## How to set each one in GitHub's UI

### Route A: repository ruleset (recommended)

1. Open `https://github.com/CleanExpo/CARSI/settings/rules` (**Settings → Rules → Rulesets**).
2. **New ruleset → New branch ruleset**.
3. **Ruleset name**: `main protection`. **Enforcement status**: `Active`.
4. **Bypass list**: leave it **empty** (rule 6). Do not add the Repository admin role or any app.
5. **Target branches → Add target → Include default branch** (this is `main`).
6. Under **Branch rules**, tick:
   - **Restrict deletions** (rule 2).
   - **Block force pushes** (rule 1).
   - **Require a pull request before merging** (rule 3). Set **Required approvals** to `0`.
     Leave the other sub-options off unless you want them.
   - **Require status checks to pass** (rule 4). Tick **Require branches to be up to date before
     merging** (rule 5). Click **Add checks**, type each of the six names from the table above and
     choose the entry whose source is **GitHub Actions**. A check appears in the picker only after
     it has run once in the last week; all six run on every PR, so they will be there.
7. Leave **Require linear history** off.
8. **Create**.

### Route B: classic branch protection (what `main` uses today)

1. Open `https://github.com/CleanExpo/CARSI/settings/branches` (**Settings → Branches**).
2. Next to the rule for `main`, click **Edit**.
3. Tick **Require a pull request before merging** (rule 3); set **Require approvals** off or to 0.
4. Tick **Require status checks to pass before merging** (rule 4), then **Require branches to be up
   to date before merging** (rule 5). In **Status checks that are required**, search for and add
   each of the six names, choosing **GitHub Actions** as the source.
5. Tick **Do not allow bypassing the above settings** (rule 6; older UI: **Include administrators**).
6. Under **Rules applied to everyone including administrators**, leave **Allow force pushes**
   **unticked** (rule 1) and **Allow deletions** **unticked** (rule 2).
7. **Save changes**.

## Read back after applying

An agent session cannot read the protection API, so the read-back is Phill's (or a session with an
admin token):

```bash
# Route A
gh api repos/CleanExpo/CARSI/rules/branches/main
# Route B
gh api repos/CleanExpo/CARSI/branches/main/protection \
  --jq '{force: .allow_force_pushes.enabled, delete: .allow_deletions.enabled,
         admins: .enforce_admins.enabled, strict: .required_status_checks.strict,
         checks: [.required_status_checks.checks[].context],
         pr: (.required_pull_request_reviews != null)}'
```

Expected for route B: `force: false`, `delete: false`, `admins: true`, `strict: true`,
`pr: true`, and `checks` holding exactly the six names above.

Then prove the rules can fail (a rule that has never refused anything is not yet evidence), but
**never probe against `main` itself**: an unprotected `main` would take the force push. With
route A, add a disposable branch such as `rules-probe` to the ruleset's targets, push it, and check
that `git push --force origin HEAD~1:rules-probe` is rejected and that a plain push of a new
commit to `rules-probe` is rejected with "Changes must be made through a pull request". Then
remove `rules-probe` from the targets and delete the branch.

## What changes for day-to-day work

- Every change to `main`, including Phill's, goes through a PR. Dependabot PRs and the media
  workflows that push branches (`ccw-scrape`, `generate-course-media`,
  `generate-course-intro-videos`) are unaffected: they already push to their own branches.
- A PR with a red required check cannot merge. Fix the check; do not remove it from the list.
- If `main` is ever rewritten anyway, `Main Rewrite Guard` fails red on the push and its job summary
  lists the lost commits and PRs. Repair through a reviewed PR, as #1274 did.

## Same gap elsewhere

RA-8489 shows RestoreAssist `main` has the same open gate. The same six-rule shape applies there,
with that repository's own check names.

# Remote `origin/main`: 6 commits you don’t have locally (summary)

**Generated to help you decide:** merge/rebase (`git pull`) vs **rewrite remote** (`git force-push`) — **do not run either until you’ve read this and chosen a strategy.**

## Your branch state (after `git fetch origin`)

| Position | Meaning |
|----------|--------|
| **Behind 6** | `origin/main` has **6 commits** that are not in your current `HEAD`. Pulling would bring these in (merge or rebase). |
| **Ahead 28** | Your local `main` has **28 commits** that are not on `origin/main`. Pushing as-is is rejected until you integrate or overwrite. |

**Remote tip:** `origin/main` → `68a3851`  
**Local tip (at time of summary):** `321db04`

These six commits are listed **oldest → newest** (what you would replay or merge on top of your history if you pull).

---

## Commit 1 — `e7fb2ff`

**Title:** `ci(e2e): migrate + seed DB before Playwright runs (RA-1164) (#47)`

**Goal:** Fix E2E CI so Playwright runs against a database that has **migrations applied** and **seeded course data**, instead of an empty Postgres (tests were failing because the UI expected catalog data).

**What it does:** Workflow-only change: add steps before `npm run test:e2e` to run existing `prisma:migrate` and `db:seed-courses` scripts.

---

## Commit 2 — `3e7271b`

**Title:** `feat: Pi CEO build (#49)`

**Goal:** Broader UI/design-system pass (“Pi CEO build”) bundled in one PR, including:

- **Discipline colour tokens** — CSS variables for WRT/CRT/ASD/etc., Tailwind `@theme` / `extend.colors.discipline`, without mutating `--primary`.
- **Glass utilities** — tokenised blur/surface scale; `.glass-md` / `.glass-lg`.
- **shadcn alignment** — `components.json`, `src/components/ui/README.md` for intentional divergences.
- **Course card polish** — discipline accent on card border, tabular nums, public courses **loading** skeleton route.

**Note:** Large, touches design tokens and public course UX.

---

## Commit 3 — `f8a8078`

**Title:** `feat(ccw): add password-gated take-home materials page (#52)`

**Goal:** Ship **`/ccw-materials`** — password-gated distribution of **2-Day Carpet Cleaning Workshop** take-home files (participant manual PDF/DOCX, product guide DOCX).

**What it does (security/design):**

- Files under `content/` (not `public/`) so direct URL guessing doesn’t work; downloads via authenticated API with **httpOnly JWT cookie** (HS256, `CCW_COOKIE_SECRET` / fallback `JWT_SECRET`), constant-time password compare, path whitelist / traversal defence, `noindex`, cache headers on downloads.

---

## Commit 4 — `31cc0a7`

**Title:** `feat(ccw): single hidden landing page — marketing + gated downloads (#54)`

**Goal:** Consolidate CCW workshop marketing into **one secret URL** **`/ccw-training`**: marketing + **inline** gated materials (reuse gate/panel from ccw flow), `noindex`, redirect **`/ccw-materials` → `/ccw-training#materials`** for old links. Includes **show-password toggle** on the gate.

---

## Commit 5 — `ec0da74`

**Title:** `ci: strip workflow to what this repo actually runs`

**Goal:** Stop CI failing on **template leftovers** (backend app, `type-check`, e2e/a11y jobs that don’t match this repo). Reduce to **dependency verification** + **`npm run build`** (Prisma generate + Next build). Lint/e2e explicitly deferred until configured.

**Impact:** CI becomes green for “real” Next+Prisma changes; may **drop** checks you might want to re-add later.

---

## Commit 6 — `68a3851` (newest on `origin/main`)

**Title:** `refactor(ccw-training): senior-designer layout + alignment pass (#56)`

**Goal:** **Layout-only** refinement of the hidden **CCW training** landing: spacing, type scale, section rhythm, grids (curriculum, included items), instructor block, materials panel width, FAQ, CTA, footer — **no copy changes**.

---

## What these 6 commits are “for” (one sentence)

They add **CCW workshop marketing + gated downloads**, **design-system / course-card polish**, and **CI fixes** (E2E DB seed + simplified workflow), plus a **layout pass** on the CCW training page.

---

## How this relates to *your* local work

Your local branch has **28 commits not on `origin/main`** (onboarding, catalogue facts, student dashboard, etc. from recent work). The remote has **6 commits not in your history** (above). Histories have **diverged**.

| Option | Idea | Risk / note |
|--------|------|-------------|
| **`git pull`** (merge) | Create a merge commit combining both lines | Preserves everything; history shows a merge. |
| **`git pull --rebase`** | Replay your 28 commits **on top of** `origin/main` | Linear history; you may need to **resolve conflicts** where CCW/CI/design files overlap your edits. |
| **`git push --force`** (or `--force-with-lease`) | Overwrite `origin/main` with your branch | **Deletes those 6 commits from the remote branch** unless someone else has merged them elsewhere — coordinate with team. |

**Recommendation:** If the CCW + CI work on `origin/main` must stay (production or shared), prefer **pull (merge or rebase)** and resolve conflicts. If those 6 commits are experimental or wrong branch, **do not** force-push without team agreement.

---

## Refresh this summary later

```bash
git fetch origin
git log --oneline HEAD..origin/main
```

When you tell the assistant whether to **pull** or **force-push**, share your intent (keep remote CCW work vs replace remote with local only).

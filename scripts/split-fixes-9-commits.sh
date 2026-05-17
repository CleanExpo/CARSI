#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

BASE="$(git rev-parse HEAD)"

commit_paths() {
  local msg="$1"
  shift
  git add "$@"
  if git diff --cached --quiet; then
    echo "SKIP (empty): $msg"
    return 0
  fi
  git commit -m "$msg"
  echo "OK: $msg"
}

commit_paths "feat(admin): add edge-safe admin cookie constant module" \
  src/lib/admin/admin-constants.ts

commit_paths "refactor(admin): re-export ADMIN_COOKIE_NAME from constants" \
  src/lib/admin/admin-auth.ts

commit_paths "fix(middleware): avoid Prisma in edge bundle via admin-constants" \
  src/lib/api/middleware.ts

commit_paths "fix(lms): handle duplicate email and claim JWT-provisioned accounts on register" \
  src/lib/server/lms-auth.ts

commit_paths "fix(ui): register form messaging for existing email" \
  src/components/auth/register-form.tsx

commit_paths "fix(lms): handle Stripe guest user email race on create" \
  src/lib/server/guest-checkout.ts

commit_paths "fix(gamification): resolve PostgreSQL sum(unknown) in XP queries" \
  src/lib/server/leaderboard-xp.ts

commit_paths "style(courses): tidy imports and formatting in public course list" \
  src/lib/server/public-courses-list.ts

commit_paths "chore: sync next-env.d.ts" \
  next-env.d.ts

COUNT=$(git rev-list --count "${BASE}"..HEAD)
echo "---"
echo "Commits since ${BASE}: ${COUNT}"
if [[ -n $(git status --porcelain) ]]; then
  echo "Uncommitted:" >&2
  git status --short >&2
  exit 1
fi
if [[ "${COUNT}" -ne 9 ]]; then
  echo "ERROR: expected 9 commits, got ${COUNT}" >&2
  exit 1
fi
git log --oneline -9
echo "Done: 9 commits."

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

commit_paths "feat(email): add branded HTML templates with text CARSI wordmark" \
  src/lib/server/email-templates.ts

commit_paths "feat(email): wire auth emails through branded templates" \
  src/lib/server/auth-email.ts

commit_paths "feat(auth): pass app origin for welcome and reset email links" \
  app/api/auth/register/route.ts \
  app/api/auth/forgot-password/route.ts

commit_paths "fix(email): dev console fallback when Resend is unreachable" \
  src/lib/server/email.ts

commit_paths "chore: document EMAIL_DEV_CONSOLE in env example" \
  .env.example

COUNT=$(git rev-list --count "${BASE}"..HEAD)
echo "---"
echo "Commits since ${BASE}: ${COUNT}"
if [[ -n $(git status --porcelain) ]]; then
  git status --short >&2
  exit 1
fi
if [[ "${COUNT}" -ne 5 ]]; then
  echo "ERROR: expected 5 commits, got ${COUNT}" >&2
  exit 1
fi
git log --oneline -5
echo "Done: 5 commits."

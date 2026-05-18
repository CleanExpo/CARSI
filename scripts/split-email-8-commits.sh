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

commit_paths "feat(email): improve Resend helper logging and dev from address" \
  src/lib/server/email.ts

commit_paths "feat(email): add shared app origin helper for email links" \
  src/lib/server/app-url.ts

commit_paths "feat(email): add password reset and registration welcome templates" \
  src/lib/server/auth-email.ts

commit_paths "fix(auth): send password reset email on forgot-password" \
  app/api/auth/forgot-password/route.ts

commit_paths "feat(auth): send welcome email after successful registration" \
  app/api/auth/register/route.ts

commit_paths "fix(lms): return send status from enrollment welcome email" \
  src/lib/server/enrollment-email.ts

commit_paths "fix(stripe): use shared app origin for webhook enrolment emails" \
  app/api/lms/webhooks/stripe/route.ts

commit_paths "chore: log contact notify failures and document Resend env vars" \
  app/api/contact/route.ts \
  .env.example

COUNT=$(git rev-list --count "${BASE}"..HEAD)
echo "---"
echo "Commits since ${BASE}: ${COUNT}"
if [[ -n $(git status --porcelain) ]]; then
  git status --short >&2
  exit 1
fi
if [[ "${COUNT}" -ne 8 ]]; then
  echo "ERROR: expected 8 commits, got ${COUNT}" >&2
  exit 1
fi
git log --oneline -8
echo "Done: 8 commits."

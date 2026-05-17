#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

commit_paths() {
  local msg="$1"
  shift
  if [[ $# -eq 0 ]]; then
    echo "No paths for: $msg" >&2
    exit 1
  fi
  git add "$@"
  if git diff --cached --quiet; then
    echo "SKIP (empty): $msg"
    return 0
  fi
  git commit -m "$msg"
  echo "OK: $msg"
}

commit_paths "feat(db): add ContactSubmission model to Prisma schema" \
  prisma/schema.prisma

commit_paths "feat(db): migration for contact_submissions table" \
  prisma/migrations/20260513000000_phase1_contact_submissions/

commit_paths "feat(email): add Resend transactional email helper" \
  src/lib/server/email.ts

commit_paths "feat(api): persist contact form and notify ops by email" \
  app/api/contact/route.ts

commit_paths "feat(admin): contact submissions list and status API" \
  app/api/admin/contacts/route.ts

commit_paths "feat(admin): contact inbox page" \
  'app/(admin)/admin/contacts/page.tsx'

commit_paths "feat(admin): add Contacts link to admin shell" \
  src/components/admin/AdminShell.tsx

commit_paths "feat(lms): resolve first lesson deep link for a course" \
  src/lib/server/first-lesson.ts

commit_paths "feat(checkout): success URL targets first lesson when available" \
  src/lib/checkout-urls.ts

commit_paths "feat(email): send enrollment welcome with start link" \
  src/lib/server/enrollment-email.ts

commit_paths "feat(lms): confirm enrollment returns learn_url and sends email" \
  app/api/lms/enrollments/confirm/route.ts

commit_paths "feat(lms): payment success guest setup and learn redirect" \
  'app/(public)/courses/[slug]/payment-success/PaymentSuccessClient.tsx'

commit_paths "feat(auth): guest checkout user provisioning helpers" \
  src/lib/server/guest-checkout.ts

commit_paths "feat(checkout): Stripe metadata for guest checkout sessions" \
  src/lib/server/local-course-checkout.ts

commit_paths "feat(checkout): guest email checkout and learn-next URLs" \
  app/api/lms/checkout/route.ts

commit_paths "feat(checkout): read paid Stripe session email for guest flow" \
  app/api/lms/checkout/session/route.ts

commit_paths "feat(lms): complete guest enrollment after Stripe payment" \
  app/api/lms/enrollments/guest-complete/route.ts

commit_paths "feat(lms): guest free course enrollment with account creation" \
  app/api/lms/enrollments/guest-free/route.ts

commit_paths "feat(ui): guest quick enrol form on course pages" \
  src/components/lms/GuestEnrolForm.tsx

commit_paths "feat(ui): integrate guest enrol flow in EnrolButton" \
  src/components/lms/EnrolButton.tsx

commit_paths "feat(stripe): webhook provisions guest users and sends welcome email" \
  app/api/lms/webhooks/stripe/route.ts

commit_paths "fix(admin): client-safe admin email prefill constant" \
  src/lib/admin/admin-email-prefill.ts

commit_paths "refactor(admin): remove ADMIN_EMAIL from server auth module" \
  src/lib/admin/admin-auth.ts

commit_paths "fix(admin): use admin email prefill in access denied form" \
  src/components/admin/AdminAccessDenied.tsx

commit_paths "feat(admin): edge-safe admin session JWT verification" \
  src/lib/admin/admin-session-edge.ts

commit_paths "fix(middleware): allow /admin with admin_session without student login" \
  src/lib/api/middleware.ts

commit_paths "refactor(xp): export leaderboard XP grouping helpers" \
  src/lib/server/leaderboard-xp.ts

commit_paths "feat(xp): compute learner level and streak from database" \
  src/lib/server/learner-xp.ts

commit_paths "feat(api): real gamification level from lesson progress" \
  app/api/lms/gamification/me/level/route.ts

commit_paths "chore(lms): remove stub gamification level from catch-all" \
  app/api/lms/[[...path]]/route.ts

commit_paths "feat(credentials): public verification URLs on /verify/credential" \
  src/lib/server/credential-public.ts

commit_paths "feat(credentials): proof pack links use public verify path" \
  src/lib/server/proof-pack.ts

commit_paths "feat(credentials): public credential verification page" \
  'app/(public)/verify/credential/[credentialId]/page.tsx'

commit_paths "chore(api): remove Turnstile requirement from submit route" \
  app/api/submit/route.ts

if [[ -f src/lib/turnstile.ts ]]; then
  git rm src/lib/turnstile.ts
  git commit -m "chore: remove unused Turnstile server module"
  echo "OK: chore: remove unused Turnstile server module"
else
  echo "SKIP: turnstile already removed"
fi

commit_paths "chore(contact): remove CAPTCHA from contact form" \
  src/components/contact/ContactForm.tsx

commit_paths "chore(ui): add staff login link in public footer" \
  src/components/landing/PublicFooter.tsx

commit_paths "chore: sync next-env.d.ts" \
  next-env.d.ts

# Any leftovers
if [[ -n $(git status --porcelain) ]]; then
  git add -A
  git commit -m "chore: phase1 remaining changes"
  echo "OK: chore: phase1 remaining changes"
fi

echo "---"
echo "Commits since 0060d6f: $(git rev-list --count 0060d6f..HEAD)"
git log --oneline -40

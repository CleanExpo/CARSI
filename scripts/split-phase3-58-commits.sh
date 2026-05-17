#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

BASE="$(git rev-parse HEAD)"

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

# --- Database & CRM foundation ---
commit_paths "feat(db): add CrmEventLog model for outbound CRM sync" \
  prisma/schema.prisma

commit_paths "feat(db): migration for crm_event_logs table" \
  prisma/migrations/20260518000000_phase3_crm_events/

commit_paths "feat(crm): webhook emitter with delivery logging" \
  src/lib/server/crm-sync.ts

commit_paths "feat(crm): enrollment.created notifier helper" \
  src/lib/server/crm-enrollment-notify.ts

# --- Cohort analytics ---
commit_paths "feat(analytics): cohort completion summary for B2B admin" \
  src/lib/server/cohort-analytics.ts

commit_paths "feat(api): admin cohort analytics endpoint" \
  app/api/admin/analytics/

commit_paths "feat(admin): cohort analytics dashboard component" \
  src/components/admin/AdminCohortAnalytics.tsx

# --- CRM admin ---
commit_paths "feat(api): admin CRM event log endpoint" \
  app/api/admin/crm/

commit_paths "feat(admin): CRM sync log table component" \
  src/components/admin/AdminCrmEvents.tsx

commit_paths "feat(admin): analytics page with cohorts and CRM log" \
  'app/(admin)/admin/analytics/'

commit_paths "feat(admin): add Analytics nav link in admin shell" \
  src/components/admin/AdminShell.tsx

# --- Content workflow ---
commit_paths "feat(admin): course workflow status draft in_review published" \
  src/lib/admin/admin-courses-service.ts

commit_paths "feat(api): admin course workflow transitions" \
  'app/api/admin/courses/[id]/workflow/'

commit_paths "feat(api): admin courses list supports in_review filter" \
  app/api/admin/courses/route.ts

commit_paths "feat(admin): course editor workflow action buttons" \
  src/components/admin/courses/CourseEditorForm.tsx

commit_paths "feat(admin): courses list in_review tab and workflow badges" \
  src/components/admin/courses/AdminCoursesList.tsx

# --- CRM hooks on public flows ---
commit_paths "feat(crm): emit contact.created on form submission" \
  app/api/contact/route.ts

commit_paths "feat(crm): emit enrollment.created on confirm enrollment" \
  app/api/lms/enrollments/confirm/route.ts

commit_paths "feat(crm): emit enrollment.created on guest-complete" \
  app/api/lms/enrollments/guest-complete/route.ts

commit_paths "feat(crm): emit enrollment.created on guest-free enroll" \
  app/api/lms/enrollments/guest-free/route.ts

commit_paths "feat(crm): emit enrollment.created from Stripe webhook" \
  app/api/lms/webhooks/stripe/route.ts

# --- Internal tools isolation ---
commit_paths "feat(internal): path guard for dev-only routes" \
  src/lib/internal-tools.ts

commit_paths "feat(middleware): redirect internal tools when disabled" \
  src/lib/api/middleware.ts

commit_paths "chore(seo): disallow internal tool paths in robots.txt" \
  public/robots.txt

# --- Accessibility ---
commit_paths "feat(a11y): skip-to-main link component" \
  src/components/a11y/

commit_paths "feat(a11y): skip link on public site layout" \
  'app/(public)/layout.tsx'

commit_paths "feat(a11y): skip link on dashboard layout" \
  'app/(dashboard)/layout.tsx'

# --- Industry recommended courses ---
commit_paths "feat(industries): load recommended courses from Postgres" \
  src/lib/server/industry-courses.ts

commit_paths "feat(industries): IndustryRecommendedCourses server component" \
  src/components/industries/IndustryRecommendedCourses.tsx

commit_paths "feat(industries): export IndustryRecommendedCourses" \
  src/components/industries/index.ts

commit_paths "chore(scripts): industry page patch helper for phase 3" \
  scripts/patch-industry-pages-phase3.mjs

INDUSTRY_PAGES=(
  aged-care
  caravan-parks
  childcare
  commercial-cleaning
  construction
  data-centres
  education
  emergency-management
  food-processing
  government-defence
  gyms-fitness
  healthcare
  hospitality
  insurance
  mining
  museums-cultural
  ndis-disability
  plumbing-trades
  property-management
  real-estate
  retail
  strata
  transport-logistics
)

for slug in "${INDUSTRY_PAGES[@]}"; do
  commit_paths "feat(industries): ${slug} recommended courses from database" \
    "app/(public)/industries/${slug}/page.tsx"
done

# --- Playwright & CI ---
commit_paths "chore(test): add Playwright config for a11y and e2e" \
  playwright.config.ts

commit_paths "test(a11y): axe checks on critical public paths" \
  tests/

commit_paths "chore(deps): add axe-playwright and test:a11y script" \
  package.json

commit_paths "chore(deps): lockfile for Playwright and axe-playwright" \
  package-lock.json

commit_paths "ci: run accessibility tests without continue-on-error" \
  .github/workflows/ci.yml

# --- Verify ---
COUNT=$(git rev-list --count "${BASE}"..HEAD)
echo "---"
echo "Commits since ${BASE}: ${COUNT}"
if [[ "${COUNT}" -ne 58 ]]; then
  echo "ERROR: expected 58 commits, got ${COUNT}" >&2
  if [[ -n $(git status --porcelain) ]]; then
    echo "Uncommitted changes remain:" >&2
    git status --short >&2
  fi
  exit 1
fi

git log --oneline -10
echo "Done: 58 phase 3 commits."

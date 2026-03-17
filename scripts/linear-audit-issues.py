"""
Create CARSI Full Audit (06/03/2026) findings as Linear issues.
These are the critical gaps identified in reports/full-audit/ not covered
by the existing linear-create-issues.py script.
Run: python scripts/linear-audit-issues.py
"""

import os
import ssl
import json
import urllib.request

API_KEY = os.environ["LINEAR_API_KEY"]
TEAM_ID = "91b3cd04-86eb-422d-81e2-9aa37db2f2f5"
API_URL = "https://api.linear.app/graphql"

# State IDs
TODO = "b7ba26fa-c315-4b44-ad63-016fd2645044"
BACKLOG = "fd635199-7bd7-442a-9df0-8c9afda1d646"

# Label IDs
LBL_FRONTEND = "353912b3-abaa-40b6-baea-3e83f741cd31"
LBL_BACKEND = "9b06a4bf-1748-4874-963d-3bd99d4f16da"
LBL_CONTENT = "e3a8a752-475b-45e4-a9f5-f8d4fac393d9"
LBL_INFRA = "2995337e-72fb-4e46-b367-1d9c43bbc2a0"
LBL_FEATURE = "ef4038bd-da33-4d61-8d85-a772ef78dc1d"
LBL_CLEANUP = "61e0efe6-b00d-4fbc-92c1-d324408ef5bb"
LBL_PERFORMANCE = "e2f3f491-6095-4a8c-a786-db5104218361"

# Priority: 1=Urgent, 2=High, 3=Normal, 4=Low

AUDIT_ISSUES = [

    # ── P0 CRITICAL ──────────────────────────────────────────────────────────
    {
        "title": "[AUDIT P0] Build /student/credentials page — credential wallet",
        "description": """## Audit Finding — CRITICAL

Phase 18 is recorded as complete in MEMORY.md but the page file does not exist.

**Missing file:** `apps/web/app/(dashboard)/student/credentials/page.tsx`

**Backend is complete:** `GET /api/lms/credentials/my-credentials` exists in `lms_credentials.py`.

## What to Build

Student credential wallet page showing:
- List of all earned credentials (course name, issue date, CECs, discipline)
- Download certificate button (PDF from Google Drive)
- LinkedIn share button (LinkedInShareButton component)
- IICRC discipline badge per credential
- Empty state: "Complete a course to earn your first credential"

## API
```
GET /api/lms/credentials/my-credentials
```
Uses `X-User-Id` header (from auth cookie via middleware).

## Components to Reuse
- `CredentialVerificationCard` (exists in components)
- `LinkedInShareButton` (exists in components)
- `CECProgressRing` (exists in components)

## Acceptance Criteria
- [ ] `/student/credentials` renders credential list for seeded student (James Wilson)
- [ ] Empty state shown when no credentials exist
- [ ] Download certificate button triggers PDF download
- [ ] LinkedIn share generates correct URL
- [ ] No TypeScript errors
- [ ] Mobile responsive at 375px""",
        "priority": 1,
        "stateId": TODO,
        "labelIds": [LBL_FRONTEND, LBL_FEATURE],
    },

    # ── P1 HIGH ───────────────────────────────────────────────────────────────
    {
        "title": "[AUDIT P1] Build /student/notes page — per-lesson notes view",
        "description": """## Audit Finding — HIGH

Phase 18 (notes) backend is complete but frontend page is missing.

**Missing file:** `apps/web/app/(dashboard)/student/notes/page.tsx`

**Backend complete:** `GET /api/lms/notes/my-notes` in `lms_notes.py`.

## What to Build

Student notes overview page:
- All notes grouped by Course > Lesson
- Note text display with edit/delete actions
- Timestamps (created, updated)
- Empty state: "Take notes while watching lessons — they'll appear here"

## API
```
GET  /api/lms/notes/my-notes
PUT  /api/lms/notes/{note_id}
DELETE /api/lms/notes/{note_id}
```

## Acceptance Criteria
- [ ] `/student/notes` renders all notes for seeded student
- [ ] Notes grouped by course then lesson
- [ ] Inline edit saves via PUT
- [ ] Delete with confirmation
- [ ] Empty state displayed correctly""",
        "priority": 2,
        "stateId": TODO,
        "labelIds": [LBL_FRONTEND, LBL_FEATURE],
    },
    {
        "title": "[AUDIT P1] Add Terms of Service and Privacy Policy pages",
        "description": """## Audit Finding — HIGH (Legal/Stripe requirement)

Required before Stripe live mode can be enabled. Stripe checkout requires
links to ToS and Privacy Policy.

## Files to Create
- `apps/web/app/(public)/terms/page.tsx`
- `apps/web/app/(public)/privacy/page.tsx`

## ToS Must Cover
- User obligations (professional use, accurate information)
- Subscription terms ($795 AUD/year, 7-day trial, cancellation policy)
- IICRC certification disclaimer (CARSI is not an RTO, CECs are industry recognition)
- Refund policy
- Acceptable use

## Privacy Policy Must Cover
- Australian Privacy Act 1988 compliance
- Data collected (name, email, learning progress, payment info)
- Third parties (Stripe, Google Drive, Google Analytics)
- Data retention and deletion rights
- Contact: privacy@carsi.com.au

## Integration
- Add links to footer (Terms | Privacy)
- Add links to Stripe checkout metadata
- Add links to registration page

## Acceptance Criteria
- [ ] Both pages render correctly
- [ ] Linked from site footer
- [ ] Linked from registration page checkbox
- [ ] Phil has reviewed and approved content
- [ ] SEO meta tags set""",
        "priority": 2,
        "stateId": BACKLOG,
        "labelIds": [LBL_FRONTEND, LBL_FEATURE],
    },
    {
        "title": "[AUDIT P1] Add rate limiting to auth endpoints — brute force protection",
        "description": """## Audit Finding — HIGH (Security)

No rate limiting exists on `/api/auth/login` or `/api/auth/register`.
These endpoints are vulnerable to brute force attacks.

## Implementation

Install slowapi:
```bash
cd apps/backend
uv add slowapi
```

Apply to auth routes in `apps/backend/src/api/routes/lms_auth.py`:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/login")
@limiter.limit("5/minute")
async def login(...):
    ...

@router.post("/register")
@limiter.limit("3/minute")
async def register(...):
    ...
```

Register middleware in `apps/backend/src/api/main.py`.

Return 429 with `Retry-After: 60` header.

## Frontend
Update login page to show human-readable error on 429:
"Too many login attempts. Please wait 60 seconds."

## Acceptance Criteria
- [ ] 6th login attempt within 1 minute returns 429
- [ ] `Retry-After` header present
- [ ] Frontend shows friendly message (not raw 429)
- [ ] Test in `tests/security/test_rate_limiting.py`
- [ ] Legitimate users not affected (counter resets after 60s)""",
        "priority": 2,
        "stateId": TODO,
        "labelIds": [LBL_BACKEND],
    },
    {
        "title": "[AUDIT P1] Provision production Redis — Celery, gamification, achievements",
        "description": """## Audit Finding — HIGH

No production Redis instance. Celery workers, gamification events, and
achievement engine are all non-functional in production without it.

## Recommended: Upstash Redis (free tier sufficient for launch)

1. Create account at upstash.com
2. Create Redis database (Sydney region, ap-southeast-2)
3. Copy `REDIS_URL` (redis://...:6379)
4. Set in Fly.io: `fly secrets set REDIS_URL=redis://...`

## Verify
```bash
fly ssh console -a carsi-backend
python -c "import redis; r=redis.from_url('$REDIS_URL'); r.ping()"
```

## Celery Worker
Ensure Celery worker process starts in Fly.io deployment
(check `Procfile` or `fly.toml` for worker process).

## Acceptance Criteria
- [ ] Redis ping successful from Fly.io console
- [ ] Celery workers start and connect
- [ ] Achievement event fires when lesson completed
- [ ] XP update visible on student dashboard after lesson""",
        "priority": 2,
        "stateId": BACKLOG,
        "labelIds": [LBL_INFRA, LBL_BACKEND],
    },
    {
        "title": "[AUDIT P1] Configure Google Drive OAuth for production",
        "description": """## Audit Finding — HIGH

Google Drive OAuth not confirmed for production. Course content (PDFs, videos)
is inaccessible until this is configured.

## Steps (Phil must complete Step 1)

**Step 1 (Phil) — Google Cloud Console:**
1. Go to console.cloud.google.com
2. Enable Drive API for CARSI project
3. Create OAuth2 credentials (type: Web Application)
4. Add redirect URI: `https://api.carsi.com.au/api/lms/drive/auth/callback`
5. Download credentials JSON

**Step 2 — Generate refresh token:**
```bash
cd apps/backend
uv run python scripts/get_drive_token.py  # (create this helper script)
```

**Step 3 — Set Fly.io secrets:**
```bash
fly secrets set \
  GOOGLE_DRIVE_CLIENT_ID=xxx \
  GOOGLE_DRIVE_CLIENT_SECRET=xxx \
  GOOGLE_DRIVE_REFRESH_TOKEN=xxx \
  GOOGLE_DRIVE_FOLDER_ID=<CARSI-LMS-Content folder ID>
```

**Step 4 — Verify:**
```bash
curl https://api.carsi.com.au/api/lms/drive/files \
  -H "X-User-Id: ecb3011b-04b8-462f-9a5f-2f2bedcf761f"
```

## Acceptance Criteria
- [ ] Drive API returns file list from CARSI-LMS-Content folder
- [ ] Course import pipeline can see Drive files
- [ ] DriveFileViewer loads a test PDF in lesson player""",
        "priority": 2,
        "stateId": BACKLOG,
        "labelIds": [LBL_INFRA, LBL_BACKEND],
    },
    {
        "title": "[AUDIT P1] Configure production SMTP — email delivery",
        "description": """## Audit Finding — HIGH

Email delivery uses Mailpit (local only). Enrolment confirmation, certificate
emails, and IICRC CEC reports cannot be delivered in production.

## Recommended: Resend (developer-friendly, Australian-friendly)

1. Create account at resend.com
2. Verify domain `carsi.com.au`
3. Get API key
4. Set Fly.io secrets:
```bash
fly secrets set \
  SMTP_PROVIDER=resend \
  RESEND_API_KEY=re_xxx \
  FROM_EMAIL=hello@carsi.com.au \
  FROM_NAME="CARSI Training"
```

## Update email_service.py
Switch from SMTP to Resend SDK if not already abstracted:
```bash
cd apps/backend && uv add resend
```

## Test 3 Templates
1. Enrolment confirmation — triggers on `POST /api/lms/enrollments`
2. Certificate issued — triggers on course completion
3. IICRC CEC report — monthly summary

## Acceptance Criteria
- [ ] Test email received at phil@carsi.com.au after mock enrolment
- [ ] Certificate email arrives with PDF attachment
- [ ] IICRC CEC report email generates correctly
- [ ] SPF/DKIM records set on carsi.com.au domain""",
        "priority": 2,
        "stateId": BACKLOG,
        "labelIds": [LBL_INFRA, LBL_BACKEND],
    },
    {
        "title": "[AUDIT P1] Verify backend test suite — confirm 533 baseline still passing",
        "description": """## Audit Finding — HIGH

Last confirmed backend test run: 533 passing (MEMORY.md, 2026-03-05).
Current status is UNKNOWN. Tests may have drifted after recent commits.

## Run
```bash
cd apps/backend
C:\\Users\\Phill\\AppData\\Roaming\\Python\\Python313\\Scripts\\uv.exe run pytest -v --tb=short 2>&1 | tee test-results.txt
```

## Expected
- 66 test files
- 533+ assertions
- 0 failures

## If Tests Fail
- Check for import errors first
- Check for DB connection issues (tests use mocks, should not need real DB)
- Check for missing dependencies

## Save Results
```
reports/test-results/backend-06032026.txt
```

## Acceptance Criteria
- [ ] All 66 test files collected
- [ ] 0 failures, 0 errors
- [ ] Results saved to reports/test-results/
- [ ] Any regressions from 533 baseline documented and fixed""",
        "priority": 2,
        "stateId": TODO,
        "labelIds": [LBL_BACKEND],
    },
    {
        "title": "[AUDIT P1] Database backup strategy — production PostgreSQL",
        "description": """## Audit Finding — HIGH

No automated backup strategy confirmed for production database.
Data loss risk is HIGH without backups.

## Recommended: Fly.io Postgres with WAL archiving

If using Fly.io Postgres:
```bash
fly ext storage create --app carsi-backend --name carsi-db-backups
fly postgres create --name carsi-db --region syd --volume-size 10
```

Enable daily snapshots via Fly.io dashboard.

## If Using External Postgres (Supabase, DigitalOcean)
- Enable automated backups in provider dashboard
- Set retention: 30 days
- Enable point-in-time recovery

## Restoration Test (required)
```bash
# Restore to staging, verify data integrity
# Document restoration procedure in docs/DISASTER-RECOVERY.md
```

## Acceptance Criteria
- [ ] Automated daily backup confirmed running
- [ ] Restoration test completed successfully
- [ ] Restoration procedure documented
- [ ] Alert configured if backup fails
- [ ] Retention policy: 30 days minimum""",
        "priority": 2,
        "stateId": BACKLOG,
        "labelIds": [LBL_INFRA],
    },

    # ── P2 MEDIUM ─────────────────────────────────────────────────────────────
    {
        "title": "[AUDIT P2] E2E test — student enrolment to certificate journey",
        "description": """## Audit Finding — MEDIUM (Testing gap)

Only 3 Playwright E2E specs exist for the entire LMS. The core student journey
has no automated coverage.

## File
`apps/web/e2e/student-journey.spec.ts`

## Test Steps
1. Navigate to /courses
2. Click on WRT course
3. Click "Enrol" button
4. Verify enrolled (progress bar visible)
5. Click first lesson
6. Mark lesson as complete
7. Navigate to quiz
8. Answer all questions
9. Submit quiz
10. Verify certificate issued notification
11. Navigate to /student/credentials
12. Verify credential appears

## Setup
```typescript
// Use seeded student
const STUDENT_ID = '87159e2e-39ff-4cbc-acfd-2f85cff07bd0'
const WRT_COURSE_SLUG = 'water-restoration-technician'
```

## Acceptance Criteria
- [ ] Spec file created and passes locally
- [ ] Added to CI (ci.yml runs playwright)
- [ ] Screenshot captured on failure
- [ ] Runs in < 2 minutes""",
        "priority": 2,
        "stateId": BACKLOG,
        "labelIds": [LBL_BACKEND, LBL_FRONTEND],
    },
    {
        "title": "[AUDIT P2] E2E test — Stripe subscription and payment flow",
        "description": """## Audit Finding — MEDIUM (Testing gap)

No automated test covers the subscription flow. This is a critical revenue path.

## File
`apps/web/e2e/subscription.spec.ts`

## Test Steps
1. Navigate to /subscribe
2. Verify pricing displayed ($795 AUD/year, 7-day trial)
3. Click "Start Trial"
4. Stripe checkout loads
5. Enter test card: 4242 4242 4242 4242, 12/30, 123
6. Submit payment
7. Verify redirect to /student with subscription active
8. Verify SubscriptionStatus shows "Pro — Trial"

## Note
Use Stripe test mode for E2E (test card 4242...).
Do NOT run against live Stripe in CI.

## Environment Variable
```
STRIPE_TEST_MODE=true  # ensure E2E uses test keys
```

## Acceptance Criteria
- [ ] Spec file created and passes locally
- [ ] Uses Stripe test card (not real payment)
- [ ] Subscription status visible after payment
- [ ] Runs in < 3 minutes""",
        "priority": 2,
        "stateId": BACKLOG,
        "labelIds": [LBL_BACKEND, LBL_FRONTEND],
    },
    {
        "title": "[AUDIT P2] Remove starter template artefacts from CARSI build",
        "description": """## Audit Finding — MEDIUM

Pages from NodeJS-Starter-V1 template are visible to users and damage
CARSI's product identity.

## Pages to Remove or Redirect

| Page | Action |
|---|---|
| `/demo` | Delete or redirect to `/courses` |
| `/demo-live` | Delete |
| `/council-demo` | Delete (dev-only) |
| `/design-system` | Delete (dev-only) |
| `/status-demo` | Delete (dev-only) |
| `/prd/[id]` | Move behind admin auth or delete |
| `/prd/generate` | Move behind admin auth or delete |
| `/dashboard/agent-runs` | Move behind admin auth or delete |
| `/workflows/*` | Move behind admin auth or delete |
| `/dashboard-analytics` | Move behind admin auth or delete |
| `src/app/demo` (if exists) | Delete directory |

## Process
1. For each page: decide delete vs. protect with admin-only middleware
2. Delete file
3. Add redirect in `next.config.ts` if page had external links
4. Verify no 404s on legitimate CARSI pages after removal

## Acceptance Criteria
- [ ] All starter artefact routes removed or admin-gated
- [ ] No 404s on CARSI-specific routes
- [ ] `pnpm turbo run build` passes after removals
- [ ] Lighthouse crawl finds no orphaned pages""",
        "priority": 3,
        "stateId": TODO,
        "labelIds": [LBL_CLEANUP, LBL_FRONTEND],
    },
    {
        "title": "[AUDIT P2] Dependency vulnerability scan — npm + pip",
        "description": """## Audit Finding — MEDIUM (Security)

No evidence of dependency vulnerability scanning. Known CVEs may exist
in frontend or backend packages.

## Frontend Scan
```bash
cd apps/web
pnpm audit --audit-level=high
```

## Backend Scan
```bash
cd apps/backend
uv run pip install pip-audit
uv run pip-audit
```

## Fix Process
1. For each critical/high CVE: update the package
2. For medium: document and accept or fix before launch
3. For low: add to known-accepted list

## Add to CI (ci.yml)
```yaml
- name: Frontend audit
  run: pnpm audit --audit-level=high

- name: Backend audit
  run: cd apps/backend && uv run pip-audit
```

## Acceptance Criteria
- [ ] 0 critical CVEs in frontend
- [ ] 0 critical CVEs in backend
- [ ] Scan integrated into CI pipeline
- [ ] Results documented in `reports/security/dep-audit-06032026.txt`""",
        "priority": 3,
        "stateId": TODO,
        "labelIds": [LBL_BACKEND, LBL_FRONTEND],
    },
    {
        "title": "[AUDIT P2] Add backend tests to CI pipeline",
        "description": """## Audit Finding — MEDIUM

CI pipeline (`ci.yml`) may not be running backend Python tests.
Backend has 66 test files — these must be in CI to catch regressions.

## Check Current ci.yml
Review `.github/workflows/ci.yml` for backend test job.

## Add if Missing
```yaml
backend-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Set up Python
      uses: actions/setup-python@v5
      with:
        python-version: '3.12'
    - name: Install uv
      run: pip install uv
    - name: Install dependencies
      run: cd apps/backend && uv sync
    - name: Run tests
      run: cd apps/backend && uv run pytest --tb=short -q
    - name: Check migrations
      run: cd apps/backend && uv run alembic check
```

## Acceptance Criteria
- [ ] Backend tests run on every PR and push to main
- [ ] `alembic check` runs to catch migration drift
- [ ] CI fails if any backend test fails
- [ ] Test results visible in GitHub Actions UI""",
        "priority": 3,
        "stateId": TODO,
        "labelIds": [LBL_INFRA, LBL_BACKEND],
    },
    {
        "title": "[AUDIT P2] JWT_SECRET_KEY production enforcement gate",
        "description": """## Audit Finding — MEDIUM (Security)

`JWT_SECRET_KEY` defaults to `CHANGE_ME_GENERATE_WITH_COMMAND_ABOVE` in `.env.example`.
No mechanism prevents deploying with this insecure default.

## Add Pre-Deploy Check in deploy.yml
```yaml
- name: Verify JWT secret is not default
  run: |
    if [ "$JWT_SECRET_KEY" = "CHANGE_ME_GENERATE_WITH_COMMAND_ABOVE" ]; then
      echo "ERROR: JWT_SECRET_KEY is the default insecure value"
      exit 1
    fi
  env:
    JWT_SECRET_KEY: ${{ secrets.JWT_SECRET_KEY }}
```

## Also Add Runtime Check in FastAPI Startup
In `apps/backend/src/config/settings.py`:
```python
@validator('JWT_SECRET_KEY')
def jwt_secret_must_not_be_default(cls, v):
    if v == 'CHANGE_ME_GENERATE_WITH_COMMAND_ABOVE':
        raise ValueError('JWT_SECRET_KEY must be changed from default value')
    return v
```

## Acceptance Criteria
- [ ] CI deploy job fails if secret is default
- [ ] FastAPI startup raises ValueError if secret is default
- [ ] Documented in LOCAL_SETUP.md how to generate a strong secret
- [ ] Production Fly.io secret confirmed to be non-default""",
        "priority": 3,
        "stateId": TODO,
        "labelIds": [LBL_INFRA, LBL_BACKEND],
    },

    # ── P3 LOW ────────────────────────────────────────────────────────────────
    {
        "title": "[AUDIT P3] Rename package.json name from template to carsi-lms",
        "description": """## Audit Finding — LOW

Root `package.json` has `"name": "claude-agent-orchestration-template"`.
This should be `"carsi-lms"`.

## Fix
In `package.json` (root), change:
```json
"name": "carsi-lms"
```

## Also Update
Check if any CI jobs, build scripts, or Docker labels reference the package name.

## Acceptance Criteria
- [ ] `cat package.json | grep name` returns `"carsi-lms"`
- [ ] `pnpm build` passes after change
- [ ] No CI jobs broken by the rename""",
        "priority": 3,
        "stateId": TODO,
        "labelIds": [LBL_CLEANUP],
    },
    {
        "title": "[AUDIT P3] Configure uptime monitoring — carsi.com.au + api.carsi.com.au",
        "description": """## Audit Finding — LOW

No uptime monitoring configured. Silent production failures would go undetected.

## Recommended: Better Uptime (free tier)

1. Sign up at betteruptime.com
2. Add monitors:
   - `https://carsi.com.au` — check every 3 min
   - `https://api.carsi.com.au/health` — check every 1 min
3. Alert to: phil@carsi.com.au + Slack #alerts (if configured)
4. Set status page at `status.carsi.com.au` (optional)

## Alternative: UptimeRobot (free, 5-min intervals)

## Acceptance Criteria
- [ ] Both URLs monitored
- [ ] Alert received within 5 minutes of simulated downtime
- [ ] Alert channel confirmed (email or Slack)
- [ ] No false positives after 24hr monitoring period""",
        "priority": 3,
        "stateId": BACKLOG,
        "labelIds": [LBL_INFRA],
    },
]


def graphql(query, variables=None):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={
            "Authorization": API_KEY,
            "Content-Type": "application/json",
        }
    )
    with urllib.request.urlopen(req, context=ctx) as resp:
        return json.loads(resp.read())


CREATE_MUTATION = """
mutation CreateIssue($input: IssueCreateInput!) {
  issueCreate(input: $input) {
    issue {
      identifier
      title
      url
    }
  }
}
"""


def main():
    print(f"\nCreating {len(AUDIT_ISSUES)} audit issues in G-Pilot team...\n")
    created = []
    failed = []
    for issue in AUDIT_ISSUES:
        inp = {
            "teamId": TEAM_ID,
            "title": issue["title"],
            "description": issue["description"],
            "priority": issue["priority"],
            "stateId": issue["stateId"],
            "labelIds": issue["labelIds"],
        }
        result = graphql(CREATE_MUTATION, {"input": inp})
        if "errors" in result:
            print(f"  FAILED: {issue['title'][:65]}")
            print(f"     {result['errors']}")
            failed.append(issue["title"])
        else:
            i = result["data"]["issueCreate"]["issue"]
            print(f"  OK {i['identifier']}  {i['title'][:70]}")
            created.append(i)

    print(f"\n── Audit Sync Summary ──────────────────────────────────")
    print(f"  Created : {len(created)}")
    print(f"  Failed  : {len(failed)}")
    print()
    for i in created:
        print(f"  {i['identifier']}  {i['url']}")
    print()


if __name__ == "__main__":
    main()

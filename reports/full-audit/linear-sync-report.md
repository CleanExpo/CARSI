# Linear Sync Report — CARSI LMS

**Generated:** 06/03/2026
**Directive:** Post-Install Full Audit Cycle — Phase 6

---

## Linear Configuration Status

| Check                       | Status                                                                           |
| --------------------------- | -------------------------------------------------------------------------------- |
| Linear API Key in MEMORY.md | ✅ CONFIRMED — stored in `.env.local` as `LINEAR_API_KEY`                        |
| Linear update script        | ✅ CONFIRMED — `scripts/linear_update.py`                                        |
| Linear create issues script | ⚠️ UNTRACKED — `scripts/linear-create-issues.py` (git status shows as untracked) |
| Linear project              | ✅ CONFIRMED — Unite-Group / CARSI                                               |
| SSL workaround              | ✅ CONFIRMED — `ssl.CERT_NONE` context for Windows                               |

**Linear integration is AVAILABLE.**

---

## Recommended Issues to Create

The following issues from the implementation task list (Phase 5) are recommended for Linear sync. Grouped by category with suggested labels.

---

### Label: `infrastructure` | `p0`

| Issue Title                     | Description                                        | Priority |
| ------------------------------- | -------------------------------------------------- | -------- |
| Deploy backend to Fly.io        | `fly deploy` from apps/backend, verify /health 200 | Urgent   |
| Provision production PostgreSQL | Provision DB, run alembic upgrade head, seed admin | Urgent   |

---

### Label: `infrastructure` | `p1`

| Issue Title                               | Description                                 | Priority |
| ----------------------------------------- | ------------------------------------------- | -------- |
| Provision production Redis                | Upstash or Fly.io Redis, connect Celery     | High     |
| Configure Google Drive OAuth production   | OAuth2 setup, set Fly.io secrets            | High     |
| Configure production SMTP                 | Resend or Mailgun, 3 email templates tested | High     |
| Switch Stripe to live mode                | Live keys, webhook URL, price ID            | High     |
| Implement rate limiting on auth endpoints | slowapi, 5/min on /auth/login               | High     |
| Configure database backup strategy        | Daily backups, restoration test             | High     |
| Verify HTTPS enforcement                  | All routes HTTPS, redirect configured       | High     |

---

### Label: `frontend` | `p0`

| Issue Title                     | Description                                        | Priority |
| ------------------------------- | -------------------------------------------------- | -------- |
| Build /student/credentials page | Credential wallet — backend complete, page missing | Urgent   |

---

### Label: `frontend` | `p1`

| Issue Title               | Description                                    | Priority |
| ------------------------- | ---------------------------------------------- | -------- |
| Build /student/notes page | Notes view — backend complete, page missing    | High     |
| Add Terms of Service page | Required for Stripe/legal                      | High     |
| Add Privacy Policy page   | Required for Australian Privacy Act compliance | High     |

---

### Label: `frontend` | `p2`

| Issue Title                            | Description                                               | Priority |
| -------------------------------------- | --------------------------------------------------------- | -------- |
| Remove starter template artefacts      | /demo, /council-demo, /design-system etc.                 | Medium   |
| Design system compliance audit         | ai:visual:audit, fix Scientific Luxury violations         | Medium   |
| Mobile responsiveness verification     | 375px viewport, Lighthouse mobile >80                     | Medium   |
| SEO meta tags audit — all public pages | og:title, og:description, canonical for 17 industry pages | Medium   |

---

### Label: `content` | `p1`

| Issue Title                                   | Description                                   | Priority |
| --------------------------------------------- | --------------------------------------------- | -------- |
| Run migration pipeline — import CARSI courses | POST /discover then /load, target ≥10 courses | High     |
| Seed 5 IICRC learning pathways                | WRT, CRT, OCT, ASD, CCT                       | High     |

---

### Label: `testing` | `p1`

| Issue Title                                   | Description                              | Priority |
| --------------------------------------------- | ---------------------------------------- | -------- |
| Verify backend test suite current status      | Run pytest, compare against 533 baseline | High     |
| E2E: student enrolment to certificate journey | Playwright spec, 7-step journey          | High     |
| E2E: subscription and payment flow            | Playwright spec, Stripe test card        | High     |

---

### Label: `testing` | `p2`

| Issue Title                           | Description                     | Priority |
| ------------------------------------- | ------------------------------- | -------- |
| E2E: instructor course creation       | Playwright spec                 | Medium   |
| Frontend unit test coverage expansion | Target 40+ test files (from 21) | Medium   |

---

### Label: `security` | `p2`

| Issue Title                        | Description                           | Priority |
| ---------------------------------- | ------------------------------------- | -------- |
| Dependency vulnerability scan      | pnpm audit + pip audit, fix criticals | Medium   |
| Git history secrets scan           | gitleaks detect, rotate if found      | Medium   |
| JWT_SECRET_KEY CI enforcement gate | CI fails if default value deployed    | Medium   |

---

### Label: `automation` | `p2`

| Issue Title                      | Description                                | Priority |
| -------------------------------- | ------------------------------------------ | -------- |
| Add backend tests to CI pipeline | ci.yml — pytest + alembic check            | Medium   |
| Add Lighthouse CI job            | Fail if Performance <70, Accessibility <85 | Medium   |
| Configure uptime monitoring      | carsi.com.au + api.carsi.com.au            | Medium   |

---

### Label: `governance` | `p2`

| Issue Title                            | Description                                   | Priority |
| -------------------------------------- | --------------------------------------------- | -------- |
| Update PROGRESS.md to CARSI LMS phases | Replace Unite-Group architecture tracking     | Medium   |
| Pre-production checklist final review  | Walk through docs/PRE-PRODUCTION-CHECKLIST.md | Medium   |

---

## Sync Execution

To create these issues programmatically, run the untracked script:

```bash
cd C:/CARSI
git add scripts/linear-create-issues.py
# Review the script, then execute:
python scripts/linear-create-issues.py
```

Alternatively, create manually in Linear using the issue titles and descriptions above.

**Recommended Linear project:** Unite-Group / CARSI LMS
**Recommended cycle:** Sprint 1 (BACK-001, BACK-002, FE-001) = Milestone: "Application Goes Live"

---

## Issues Already in Linear (from MEMORY.md)

The following issue ranges have already been tracked:

| Range            | Category                       | Status                |
| ---------------- | ------------------------------ | --------------------- |
| GP-96 to GP-100  | Phase 0-4 foundations          | DONE                  |
| GP-131           | Scoping & Quoting course       | IN PROGRESS (Phil)    |
| GP-132 to GP-134 | SVG components                 | DONE                  |
| GP-138 to GP-148 | Industry pages + marketing     | DONE / Human decision |
| GP-149 to GP-162 | Infrastructure, K8s, CI/CD     | DONE                  |
| GP-163 to GP-164 | Smoke tests + E2E              | DONE                  |
| GP-222 to GP-227 | Agent sprint (UI, smoke tests) | DONE                  |

**New issues from this audit should use next available GP-\* identifier.**

---

## Status

**LINEAR SYNC: AVAILABLE — Manual or script execution required.**

The integration is configured. The `linear-create-issues.py` script exists but is untracked in git. Recommend: review script, commit it, then execute against Linear API.

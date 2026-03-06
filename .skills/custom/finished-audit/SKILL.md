---
name: finished-audit
description: Audits a production system against the Definition of Finished checklist. Triggers when the founder or agent claims "finished", "complete", "ready for production", or "ready for customers". Returns verified/unknown/blocked status for every production-readiness criterion.
license: MIT
metadata:
  author: CARSI
  version: '1.0.0'
  locale: en-AU
---

# Finished Audit

Converts completion claims into verified production-readiness assessments.

## Description

A completion claim without evidence is a liability. This skill audits every production-readiness criterion from `memory.md > Definition of Finished` and returns a verified status for each. It does not accept narrative descriptions as evidence — only artefacts.

## Trigger Phrases

- "is it finished?", "is it done?", "is it complete?"
- "it's finished", "we're done", "it's complete"
- "ready for production", "ready to launch", "ready for customers"
- "production ready"
- "can we go live?", "can we launch?"
- "run a finished audit", "audit production readiness"

## Procedure

### Step 1 — Establish Scope

Confirm what is being audited: full system, a specific feature, or a deployment.

```
AUDIT SCOPE: [full system | feature: X | deployment: Y]
TRIGGER: [what founder/agent said]
TIMESTAMP: [DD/MM/YYYY HH:MM AEST]
```

### Step 2 — Frontend Audit

For each criterion, execute a verification action and collect artefacts.

| Criterion              | Verification Action                | Evidence Type            |
| ---------------------- | ---------------------------------- | ------------------------ |
| No critical 404 routes | Scan all routes in `apps/web/app/` | Route list + HTTP status |
| Assets load correctly  | Browser screenshot of key pages    | Screenshot               |
| Responsive UI          | Viewport test at 375px and 1440px  | Screenshots              |
| No runtime errors      | Browser console scan               | Console output           |

### Step 3 — Backend Audit

| Criterion         | Verification Action          | Evidence Type |
| ----------------- | ---------------------------- | ------------- |
| Endpoints respond | `curl` each public endpoint  | curl output   |
| Auth works        | Login + protected route test | curl output   |
| Error handling    | Send malformed request       | curl output   |
| Health endpoint   | `GET /api/health`            | Response body |

### Step 4 — Data Audit

| Criterion               | Verification Action                | Evidence Type  |
| ----------------------- | ---------------------------------- | -------------- |
| Migrations reproducible | `alembic upgrade head` on fresh DB | Command output |
| Auth rules enforced     | Attempt cross-user data access     | Test result    |
| No hardcoded secrets    | `grep -r "sk-" .` and similar      | Grep output    |

### Step 5 — Integrations Audit (if applicable)

| Criterion          | Verification Action                 | Evidence Type |
| ------------------ | ----------------------------------- | ------------- |
| Credentials valid  | Test API call with real credentials | API response  |
| Retry logic exists | Review error handling code          | Code snippet  |

### Step 6 — Payments Audit (if applicable)

| Criterion            | Verification Action            | Evidence Type  |
| -------------------- | ------------------------------ | -------------- |
| Checkout works       | Stripe test mode checkout      | Screenshot     |
| Failure flow handled | Use card 4000000000000002      | Screenshot     |
| Webhook delivery     | Stripe dashboard → webhook log | Log screenshot |

### Step 7 — Deployment Audit

| Criterion                | Verification Action            | Evidence Type     |
| ------------------------ | ------------------------------ | ----------------- |
| Production URL reachable | `curl https://[domain]`        | curl output       |
| Logs accessible          | `fly logs` or Vercel dashboard | Log output        |
| Rollback path exists     | Document rollback procedure    | Written procedure |

### Step 8 — Business Readiness Audit

| Criterion               | Verification Action               | Evidence Type |
| ----------------------- | --------------------------------- | ------------- |
| Privacy policy          | `curl https://[domain]/privacy`   | HTTP 200      |
| Terms of service        | `curl https://[domain]/terms`     | HTTP 200      |
| Support contact visible | Screenshot of footer/contact page | Screenshot    |

### Step 9 — Generate Audit Report

```markdown
## Finished Audit Report

Scope: [scope]
Date: [DD/MM/YYYY HH:MM AEST]

### Summary

OVERALL STATUS: IN PROGRESS | VERIFIED

### Frontend

| Criterion        | Status      | Evidence                |
| ---------------- | ----------- | ----------------------- |
| No critical 404s | ✅ VERIFIED | [artefact]              |
| Assets load      | ⚠️ UNKNOWN  | Not checked             |
| Responsive       | ❌ BLOCKED  | Staging URL unreachable |

### [Repeat for each domain]

### Required Actions Before Going Live

1. [Action 1 — assigned to: X]
2. [Action 2 — assigned to: Y]

### Proof Artefacts Collected

- [link to screenshot]
- [curl output]
- [test results]
```

## Validation Gates

- [ ] All audit sections completed (no section skipped)
- [ ] Every VERIFIED item has an artefact reference
- [ ] No claim of VERIFIED without evidence
- [ ] Summary status matches worst item in any category

## Failure Modes

| Situation                                | Action                                          |
| ---------------------------------------- | ----------------------------------------------- |
| Cannot access production URL             | Mark BLOCKED, escalate with exact error         |
| Test environment differs from production | Flag mismatch, audit production directly        |
| Evidence is older than 1 hour            | Re-verify before including                      |
| Audit reveals critical blocker           | Halt launch recommendation, surface immediately |
| Founder pushes back on UNKNOWN status    | Do not change status without evidence           |

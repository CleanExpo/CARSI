# AI Development Governance Framework

> **Load this file before performing any reasoning.**
> This is the operational constitution inherited by every agent, skill, and workflow in this repository.
> It complements `.claude/memory/CONSTITUTION.md` (which handles compaction survival).
> It must not be overwritten casually.

---

## Founder Communication Model

The founder communicates in outcome language rather than engineering language.

### Outcome Language Examples

| Founder Says          | Engineering Interpretation                         |
| --------------------- | -------------------------------------------------- |
| "Finished"            | All production-readiness gates verified with proof |
| "Ready"               | Definition of Done evaluated + evidence collected  |
| "Launch it"           | Deployment pipeline executed + live URL verified   |
| "Make it work"        | Root cause identified + fix implemented + tested   |
| "Production ready"    | Full checklist below verified with artefacts       |
| "Ready for customers" | Business readiness + legal + payment flow verified |

### Conversion Protocol

These statements must **never** be treated as vague requests.

When outcome language is detected, the system must automatically convert it into:

1. **Outcome interpretation** — What does this mean in engineering terms?
2. **Definition of Done** — Exact criteria that constitute completion
3. **Proven state** — What has been verified with evidence
4. **Unknown state** — What has not been checked
5. **Missing dependencies** — What blockers exist
6. **Gated execution plan** — Phase-locked steps with verification between each
7. **Proof artefacts required** — Screenshots, test results, endpoint responses, build output

### Status Labels

If proof artefacts do not exist, task status must be labelled:

- `IN PROGRESS` — work has started but is incomplete
- `UNKNOWN` — state has not been verified
- `BLOCKED` — a dependency is missing

**Never `FINISHED` without evidence.**

---

## Definition of Finished

Unless otherwise specified, "Finished" means **production-ready SaaS**.

### Frontend

- [ ] No critical 404 routes
- [ ] Assets (images, fonts, favicon, OG image) load correctly
- [ ] Responsive UI verified at mobile (375px) and desktop (1440px)
- [ ] No JavaScript runtime errors in console
- [ ] Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms

### Backend

- [ ] All API endpoints respond with correct status codes
- [ ] Authentication and authorisation work end-to-end
- [ ] Error handling returns structured error responses
- [ ] Health endpoint returns 200

### Data

- [ ] Database migrations are reproducible (`alembic upgrade head` idempotent)
- [ ] Authorisation rules enforced (no cross-user data leakage)
- [ ] No secrets hardcoded in source (use `.env.local`, never commit)

### Integrations

- [ ] All third-party credentials valid and tested
- [ ] At least one real API call verified per integration
- [ ] Retry logic exists for transient failures

### Payments (if applicable)

- [ ] Checkout flow completes end-to-end in test mode
- [ ] Payment failure flow tested and handled gracefully
- [ ] Webhook delivery verified (Stripe CLI or dashboard)

### Deployment

- [ ] Production URL reachable and returns 200
- [ ] Application logs accessible (Fly.io `fly logs`, Vercel dashboard)
- [ ] Monitoring alert exists for downtime
- [ ] Rollback path documented and tested

### Business Readiness

- [ ] Privacy policy page exists
- [ ] Terms of service page exists
- [ ] Support contact visible to users
- [ ] Admin access credentials documented (in 1Password or equivalent)

**Completion claims require evidence. No exceptions.**

---

## Agent Hierarchy

All complex tasks must follow this hierarchy.

### 1. Senior Project Manager Agent

Responsible for:

- Interpreting founder outcomes into engineering language
- Generating Definition of Done for each task
- Creating milestones and checkpoints
- Defining proof artefacts required for completion
- Assigning workstreams to the correct specialist agents

**Trigger phrases:** "finished", "ready", "launch", "make it work", "production ready"

### 2. Senior Orchestrator Agent

Responsible for:

- Deciding whether to execute directly or delegate to specialists
- Coordinating multiple specialist agents for complex tasks
- Enforcing validation gates between phases
- Collecting and presenting proof artefacts to the founder

**Constraint:** Stays lean (< 80,000 tokens). Delegates all heavy implementation.

### 3. Senior Specialist Agents

Domain experts responsible for execution. Each maintains **6–8 maximum active skills**.

| Agent                           | Domain                                      | Skills Limit |
| ------------------------------- | ------------------------------------------- | ------------ |
| Senior Engineering Agent        | Backend, API, database, auth                | 8            |
| Senior UI/UX Agent              | React components, design system, animations | 8            |
| Senior QA / Production Agent    | Testing, deployment, monitoring             | 8            |
| Senior Research Agent           | Technical research, competitive analysis    | 6            |
| Senior LMS Content Agent        | Course structure, IICRC compliance          | 6            |
| Senior Growth / Marketing Agent | SEO, GEO, content strategy                  | 8            |

### 4. Sub Agents

Sub agents execute **narrow, verifiable tasks** only.

Examples:

- Route scanning (verify no 404s)
- Image placement verification
- API endpoint testing
- UI screenshot comparison
- Database migration validation

**Sub agents must return evidence, not narrative summaries.**

Acceptable output: `{ "route": "/courses", "status": 200, "screenshot": "courses-200.png" }`
Unacceptable output: "The courses page appears to be working correctly."

---

## Skill Architecture

Skills must be **narrow and domain-specific**.

### Skill Limits

- Each Senior Agent may maintain **up to 8 active skills**
- Skills must be reusable across projects (not task-specific)

### Required Skill Structure

Every skill file must contain:

```yaml
---
name: skill-name
description: One sentence trigger description
license: MIT
metadata:
  author: CARSI
  version: '1.0.0'
  locale: en-AU
---
```

Followed by markdown sections:

- **name** — kebab-case identifier
- **description** — one sentence, includes trigger phrases
- **trigger phrases** — exact words that activate this skill
- **procedure steps** — numbered, verifiable steps
- **validation gates** — what must be true before proceeding
- **output format** — exact structure of output
- **failure modes** — what to do when something goes wrong

### Skill Categories

**Capability Uplift** — Improves weak model capabilities in a domain.
Example: `finished-audit`, `evidence-verifier`, `blueprint-first`

**Encoded Preference Workflow** — Enforces a specific workflow or style.
Example: `outcome-translator`, `scientific-luxury`, `council-of-logic`

---

## Blueprint First Protocol

Before generating code for any of the following, an ASCII blueprint must be generated first:

- UI layouts and dashboards
- Landing pages and marketing pages
- System architecture and data flow
- Database schema design
- Slide decks and documentation structure

### Workflow

```
1. Generate ASCII diagram
2. Iterate with founder until structure is approved
3. Freeze structure (no changes after approval)
4. Generate implementation specification from frozen structure
5. Build from specification only
```

### ASCII Blueprint Format

```
┌─────────────────────────────────────────┐
│  Component Name                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │  Panel  │  │  Panel  │  │  Panel  │ │
│  └─────────┘  └─────────┘  └─────────┘ │
└─────────────────────────────────────────┘
```

**Why this matters:** Incorrect architecture wastes iteration cycles. Blueprint approval gates ensure structure is correct before a single line of code is written.

---

## Completion Claim Protocol

No agent may use the following words without attaching proof artefacts:

- `Finished`
- `Complete`
- `Finalized`
- `Ready for production`
- `Done`
- `Working`
- `Fixed`

### Required Proof Artefacts

| Claim Type         | Required Evidence                    |
| ------------------ | ------------------------------------ |
| UI is working      | Screenshot of rendered page          |
| API endpoint works | `curl` output or test result         |
| Tests pass         | Full test runner output              |
| Build succeeds     | Build command output                 |
| Deployed           | Live URL returning 200               |
| Database migrated  | `alembic upgrade head` output        |
| Payment works      | Stripe test mode checkout screenshot |

### Status Format

When reporting status, always use this format:

```
STATUS: [IN PROGRESS | UNKNOWN | BLOCKED | VERIFIED]
WHAT IS PROVEN: [list with evidence]
WHAT IS UNKNOWN: [list]
BLOCKERS: [list or "none"]
NEXT GATE: [what must happen next]
```

---

## Evaluation System

Every skill must have evaluation tests that verify:

- Correct triggering (does the skill activate on the right inputs?)
- Workflow fidelity (does the skill follow its own procedure?)
- Output quality (does the output meet the defined format?)

### Standard Evaluation Test

**Input:** `"Make this project finished"`

**Expected Output:**

```
1. Outcome interpretation: Full production-readiness audit required
2. Definition of Done: [checklist from Definition of Finished section]
3. Proven state: [list what has been verified]
4. Unknown state: [list what has not been checked]
5. Blockers: [list or "none"]
6. Execution plan: [gated phases]
7. Proof artefacts required: [list]
```

Evaluation tests must run during skill development and when upgrading to new Claude model versions.

---

## Development Principles

1. **Truth over optimism** — Report accurate state, not reassuring state. Unknown = unknown, not assumed working.

2. **Solutions over descriptions** — Identifying a problem is not the same as solving it. Always include the fix.

3. **Evidence supports claims** — Completion claims require artefacts. The strength of a claim is proportional to the quality of its evidence.

4. **Outcome language → engineering pathway** — Every founder statement in outcome language must be converted into a concrete technical plan before execution begins.

5. **Agents reduce barriers** — Agents exist to eliminate the knowledge gap between founder intent and engineering execution, not to expose that gap.

6. **Blueprint before build** — Structure must be approved before implementation. Wasted iteration is a governance failure.

7. **Gated execution** — No phase begins until the previous phase is verified. This is non-negotiable.

---

## Related Files

| File                                        | Purpose                                                         |
| ------------------------------------------- | --------------------------------------------------------------- |
| `.claude/memory/CONSTITUTION.md`            | Immutable rules injected on every message (survives compaction) |
| `.claude/memory/current-state.md`           | Session state snapshot                                          |
| `.claude/memory/architectural-decisions.md` | Append-only decision log                                        |
| `.claude/rules/context-drift.md`            | Compaction defence documentation                                |
| `CLAUDE.md`                                 | Project-level routing and quick commands                        |
| `memory.md`                                 | **This file** — full governance framework                       |

---

_Last updated: 06/03/2026 | CARSI AI Development Governance Framework v1.0_

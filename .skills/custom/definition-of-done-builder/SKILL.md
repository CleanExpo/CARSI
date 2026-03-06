---
name: definition-of-done-builder
description: Builds measurable, verifiable Definition of Done criteria for any task type. Converts vague "done" requirements into specific, evidence-backed acceptance criteria. Triggers on "what does done look like?", "define success", "acceptance criteria", "when is this finished?", or before any PM handoff.
license: MIT
metadata:
  author: CARSI
  version: '1.0.0'
  locale: en-AU
---

# Definition of Done Builder

Creates specific, evidence-backed acceptance criteria for any task.

## Description

Vague "done" criteria produce incomplete work. This skill generates measurable acceptance criteria that can be verified with artefacts. Every criterion maps to a specific proof artefact type.

## Skill Type

**Encoded Preference Workflow** — Enforces a structured completion criteria generation process.

## Trigger Phrases

- "what does done look like?"
- "define success for this"
- "acceptance criteria"
- "when is this finished?"
- "what are the requirements?"
- "create Definition of Done"
- Before any task handoff to Orchestrator

## Inputs

- Task description or founder statement
- Task type (UI / API / Feature / Deployment / Content / Research)
- Project context (current stack, environment)

## Procedure

### Step 1 — Identify Task Type

Map the task to a category:

- **UI/Visual** — React components, pages, design work
- **API/Backend** — endpoints, auth, database, integrations
- **Feature** — end-to-end product capability
- **Deployment** — infrastructure, CI/CD, production setup
- **Content** — copy, course material, documentation
- **Research** — investigation, analysis, comparison

### Step 2 — Generate Category-Specific Criteria

**UI/Visual tasks:**

- [ ] Component renders without console errors
- [ ] Matches approved blueprint/wireframe
- [ ] Responsive at 375px mobile and 1440px desktop
- [ ] Design system compliant (OLED Black, Scientific Luxury)
- [ ] No placeholder text or images
- [ ] Accessible (WCAG 2.1 AA: 44px touch targets, visible focus rings)
- [ ] Screenshot captured with URL visible

**API/Backend tasks:**

- [ ] Endpoint returns correct status code (200/201/400/401/403/404/500)
- [ ] Response matches documented schema
- [ ] Authentication enforced on protected routes
- [ ] Input validation rejects malformed data
- [ ] Error responses are structured (not raw stack traces)
- [ ] Test coverage >= 80% for new code
- [ ] curl proof captured

**Feature tasks:**

- [ ] Happy path works end-to-end (UI -> API -> DB -> response)
- [ ] Error states handled and displayed to user
- [ ] Loading states implemented
- [ ] Mobile and desktop verified
- [ ] Auth boundary correct (protected routes redirect unauthenticated users)
- [ ] Data persists across page refresh

**Deployment tasks:**

- [ ] Production URL returns 200
- [ ] No environment variables missing
- [ ] Logs accessible (Fly.io / Vercel dashboard)
- [ ] Health endpoint returns 200
- [ ] Rollback procedure documented
- [ ] SSL certificate valid

**Content tasks:**

- [ ] No placeholder text ("Lorem ipsum", "Coming soon", "TBD")
- [ ] All required sections present
- [ ] IICRC compliance verified (if applicable)
- [ ] Links work (internal and external)
- [ ] Reading level appropriate for audience

**Research tasks:**

- [ ] Sources cited with Tier classification
- [ ] Claims labelled: Confirmed / Inferred / Assumed
- [ ] Competing viewpoints considered
- [ ] Actionable recommendation included

### Step 3 — Add Proof Artefact Requirements

For each criterion, specify the evidence type:

| Criterion         | Evidence Type              | Tier   |
| ----------------- | -------------------------- | ------ |
| Component renders | Screenshot with URL        | Tier 1 |
| API returns 200   | curl output                | Tier 1 |
| Tests pass        | pytest/jest full output    | Tier 1 |
| Deploy succeeds   | Build log + production URL | Tier 1 |

### Step 4 — Set Measurable Thresholds

Avoid vague criteria. Replace:

- "works well" -> "endpoint returns 200 in < 500ms"
- "looks good" -> "matches approved blueprint"
- "tests pass" -> "pytest reports 0 failures, >= 80% coverage"
- "deployed" -> "curl https://carsi.com.au returns 200"

### Step 5 — Output DoD Document

## Validation Gates

- [ ] Every criterion is verifiable (not subjective)
- [ ] Every criterion has a named artefact type
- [ ] Thresholds are specific (numbers, not adjectives)
- [ ] Criteria cover happy path AND error states

## Output Format

```markdown
## Definition of Done: [Task Name]

**Task type:** [UI | API | Feature | Deployment | Content | Research]
**Date:** [DD/MM/YYYY]

### Acceptance Criteria

| #   | Criterion   | Measurable Threshold | Artefact | Tier |
| --- | ----------- | -------------------- | -------- | ---- |
| 1   | [criterion] | [threshold]          | [type]   | T1   |
| 2   | [criterion] | [threshold]          | [type]   | T1   |

### Evidence Bundle Required

Before this task may be marked DONE, collect:

1. [artefact description]
2. [artefact description]

### Status

- [ ] All criteria verified
- [ ] Evidence bundle complete
- [ ] Reviewed by PM Agent

**Completion gate:** PM Agent may only mark DONE when all items checked.
```

## Failure Modes

| Situation                    | Action                                                          |
| ---------------------------- | --------------------------------------------------------------- |
| Task type is unclear         | Ask one clarifying question, then default to Feature criteria   |
| Criterion cannot be verified | Replace with verifiable equivalent or remove                    |
| Threshold is subjective      | Convert to measurement or binary (yes/no with screenshot proof) |
| Scope is too large           | Split into sub-tasks, each with own DoD                         |

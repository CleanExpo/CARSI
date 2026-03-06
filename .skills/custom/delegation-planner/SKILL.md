---
name: delegation-planner
description: Maps tasks to the correct agent in the hierarchy (Senior PM / Orchestrator / Specialist / Sub-Agent). Prevents task misrouting, context overload, and single-agent bottlenecks. Triggers on "who should do this?", "delegate this", "assign this", or when a complex task needs decomposition.
license: MIT
metadata:
  author: CARSI
  version: '1.0.0'
  locale: en-AU
---

# Delegation Planner

Maps tasks to the correct agent type to prevent bottlenecks and misrouting.

## Description

Complex tasks fail when assigned to the wrong agent type. A sub-agent reasoning about architecture decisions wastes compute and produces poor results. An orchestrator trying to write component code violates the token budget. This skill produces a delegation map for any complex task.

## Skill Type

**Encoded Preference Workflow** — Enforces the Senior PM -> Orchestrator -> Specialist -> Sub-Agent hierarchy.

## Trigger Phrases

- "who should handle this?"
- "delegate this task"
- "assign this"
- "plan the delegation"
- When a task involves multiple domains
- When a task is too large for a single agent
- "break this down for me"

## Agent Decision Tree

```
Is this translating founder outcomes?
  YES -> Senior PM Agent

Is this coordinating specialists and collecting evidence?
  YES -> Senior Orchestrator Agent

Does this require domain expertise?
  YES -> Which domain?
    Backend / API / Auth / DB -> Senior Engineering Agent
    UI / Components / Design -> Senior UI/UX Agent
    Testing / Deployment -> Senior QA/Production Agent
    Research / Documentation -> Senior Research Agent
    Course Content / IICRC -> Senior LMS Content Agent
    SEO / GEO / Growth -> Senior Growth/Marketing Agent

Is this narrow, isolated, verifiable, parallelisable?
  YES -> Sub-Agent (route scanner / asset verifier / API checker)
```

## Inputs

- Task description
- Known constraints (deadline, agent token budget)
- Current agent roster (who is available)

## Procedure

### Step 1 — Decompose Task

Break the task into independent components:

- Identify all distinct domains
- Map dependencies between components
- Flag which components can run in parallel

### Step 2 — Assign Agent Type

For each component:

```
COMPONENT: [name]
AGENT TYPE: [PM | Orchestrator | Specialist Type | Sub-Agent]
REASON: [why this type]
PARALLEL SAFE: [yes | no -- depends on: X]
ESTIMATED CONTEXT COST: [low | medium | high]
```

### Step 3 — Map Dependencies

```
Component A (DB migration) must complete before:
  Component B (API endpoints)
    which must complete before:
      Component C (Frontend integration test)

Component D (design audit) is independent -- parallel safe
Component E (SEO review) is independent -- parallel safe
```

### Step 4 — Generate Delegation Plan

```markdown
## Delegation Plan: [Task Name]

### Agent Assignments

| Component     | Agent       | Parallel? | Depends On    |
| ------------- | ----------- | --------- | ------------- |
| DB migration  | Engineering | No        | --            |
| API endpoints | Engineering | No        | DB migration  |
| Frontend      | UI/UX       | No        | API endpoints |
| Route scan    | Sub-Agent   | Yes       | Frontend      |
| Asset verify  | Sub-Agent   | Yes       | Frontend      |
| SEO audit     | Growth      | Yes       | Frontend      |

### Execution Order

Phase 1 (parallel): [components]
Phase 2 (sequential, after Phase 1): [components]
Phase 3 (parallel): [components]

### Evidence Collection Points

Gate 1: After DB migration -> evidence: alembic output
Gate 2: After API -> evidence: curl tests
Gate 3: After Frontend -> evidence: screenshots + Lighthouse
```

## Validation Gates

- [ ] Every component has an assigned agent type
- [ ] Dependencies are mapped (not assumed)
- [ ] Parallel tasks are confirmed to have no shared state
- [ ] Evidence collection points defined for each gate
- [ ] No single agent has > 8 skills loaded simultaneously

## Output Format

Structured delegation plan as shown in Step 4.

## Failure Modes

| Situation                           | Action                                          |
| ----------------------------------- | ----------------------------------------------- |
| Task is too vague to decompose      | Activate outcome-translator first               |
| Unknown dependency exists           | Mark as BLOCKED, surface to PM Agent            |
| All components depend on each other | Sequential execution only -- document why       |
| No specialist available for domain  | Escalate to PM Agent to recruit or extend scope |

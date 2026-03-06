---
name: outcome-translator
description: Converts founder outcome language ("finished", "ready", "launch it", "make it work") into engineering execution plans with Definition of Done, proof artefacts, and gated milestones. Triggers on any outcome statement that lacks technical specificity.
license: MIT
metadata:
  author: CARSI
  version: '1.0.0'
  locale: en-AU
---

# Outcome Translator

Converts founder outcome language into senior-level engineering execution plans.

## Description

Founders communicate in business outcomes. Engineers communicate in technical specifications. This skill bridges that gap by converting every outcome statement into a structured engineering plan with verifiable completion criteria.

## Trigger Phrases

Activate this skill when the founder uses any of the following (or close variants):

- "finished", "done", "complete"
- "ready", "ready for customers", "ready to launch"
- "launch it", "ship it", "deploy it"
- "make it work", "just make it work"
- "production ready"
- "is it working?", "does it work?"
- "what's left?", "are we done?"

## Procedure

### Step 1 — Interpret the Outcome

State what the founder outcome means in engineering terms.

Format:

```
OUTCOME INTERPRETATION
Founder said: "[exact phrase]"
Engineering meaning: [technical description of what this requires]
Scope: [what is in scope vs out of scope]
```

### Step 2 — Generate Definition of Done

Pull the relevant checklist from `memory.md > Definition of Finished`.

Mark each item as:

- ✅ VERIFIED — evidence exists
- ⚠️ UNKNOWN — not yet checked
- ❌ BLOCKED — dependency missing

### Step 3 — Document Proven State

List what has actually been verified with evidence. Evidence = artefacts (screenshots, test output, curl responses, build logs).

If no evidence exists → status is UNKNOWN, not verified.

### Step 4 — Identify Gaps

List every item that is UNKNOWN or BLOCKED with the exact action required to resolve it.

### Step 5 — Create Gated Execution Plan

Break remaining work into gates. Each gate must be completed and verified before the next begins.

Format:

```
GATE 1: [Name]
  Action: [exact task]
  Verification: [how to verify]
  Evidence required: [what artefact proves this gate]
  Owner: [which agent/specialist]

GATE 2: [Name]
  ...
```

### Step 6 — Report Status

```
STATUS: IN PROGRESS | UNKNOWN | BLOCKED | VERIFIED
WHAT IS PROVEN: [list with evidence references]
WHAT IS UNKNOWN: [list]
BLOCKERS: [list or "none"]
NEXT GATE: [Gate name and first action]
```

## Validation Gates

Before generating the execution plan:

- [ ] Founder phrase has been confirmed and quoted
- [ ] Current git branch and last 5 commits reviewed
- [ ] Existing test results checked
- [ ] Live URL (if applicable) pinged

## Output Format

```markdown
## Outcome Translation

**Founder said:** "[phrase]"

### Interpretation

[engineering meaning]

### Definition of Done

| Criterion                | Status      | Evidence    |
| ------------------------ | ----------- | ----------- |
| Frontend: no 404s        | ⚠️ UNKNOWN  | Not checked |
| Backend: health endpoint | ✅ VERIFIED | curl output |
| ...                      |             |             |

### Execution Plan

[gated steps]

### Current Status

STATUS: IN PROGRESS
PROVEN: [list]
UNKNOWN: [list]
NEXT GATE: [Gate 1 name]
```

## Failure Modes

| Situation                              | Action                                        |
| -------------------------------------- | --------------------------------------------- |
| Founder outcome is ambiguous           | Ask one clarifying question, then proceed     |
| Evidence exists but is old (>1 hour)   | Re-verify, do not rely on stale artefacts     |
| Gate is blocked by external dependency | Escalate to founder with explicit options     |
| Too many unknown items                 | Prioritise by customer impact (highest first) |

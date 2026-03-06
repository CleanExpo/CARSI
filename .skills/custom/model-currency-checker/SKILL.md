---
name: model-currency-checker
description: Checks currently configured AI models against approved defaults. Detects deprecated models, version mismatches, and routing misconfigurations. Generates a model-currency-report.md. Triggers on "check models", "model audit", "are models up to date?", or before any heavy AI task.
license: MIT
metadata:
  author: CARSI
  version: '1.0.0'
  locale: en-AU
---

# Model Currency Checker

Ensures AI models in use are current, approved, and correctly routed.

## Description

AI models deprecate, upgrade, and change capability profiles frequently. Using outdated or misconfigured models produces lower-quality outputs, unexpected failures, and billing surprises. This skill audits configured models against approved defaults and generates a report.

## Skill Type

**Capability Uplift** — Improves model selection discipline and prevents silent degradation from deprecated models.

## Trigger Phrases

- "check models", "model audit", "model check"
- "are our models up to date?"
- "which models are we using?"
- "model currency check"
- Before any heavy AI task (image generation, reasoning, embedding)
- Weekly check trigger: "run governance check"

## Approved Model Defaults (as of 06/03/2026)

| Task Type                       | Approved Model                       | Provider  |
| ------------------------------- | ------------------------------------ | --------- |
| Reasoning / Orchestration       | claude-sonnet-4-6                    | Anthropic |
| Fast generation / drafts        | claude-haiku-4-5-20251001            | Anthropic |
| High-capability complex         | claude-opus-4-6                      | Anthropic |
| Fast image generation / editing | Gemini 2.5 Flash Image / Nano Banana | Google    |
| High-fidelity branding visuals  | Imagen 4                             | Google    |
| Local inference (no API key)    | llama3.1:8b via Ollama               | Local     |

## Inputs

- Current model configuration (from `.env.local`, `src/ai/model-registry/`, backend config)
- Task type requiring model selection

## Procedure

### Step 1 — Discover Configured Models

Read from:

- `apps/backend/.env.local` -> OLLAMA_MODEL, AI_PROVIDER, ANTHROPIC_API_KEY
- `src/ai/model-registry/index.ts` -> programmatic model config
- `apps/web/.env.local` -> any frontend AI model config

### Step 2 — Compare Against Approved Defaults

For each configured model:

- Is it on the approved defaults list?
- Is the version current?
- Is it routed to the correct task type?

### Step 3 — Check for Deprecation Signals

Flag if:

- Model ID contains "preview" and was released > 90 days ago
- Model is in the Anthropic/Google deprecation schedule
- Model is marked "legacy" in provider documentation

### Step 4 — Generate Report

Output to `reports/model-currency-report.md`:

```markdown
# Model Currency Report

Generated: [DD/MM/YYYY HH:MM AEST]

## Summary

- Configured models: N
- Approved: N
- Review needed: N
- Deprecated: N

## Model Audit

| Task      | Configured Model  | Approved Model    | Status   |
| --------- | ----------------- | ----------------- | -------- |
| Reasoning | claude-sonnet-4-6 | claude-sonnet-4-6 | Current  |
| Images    | gpt-4-vision      | Gemini 2.5 Flash  | MISMATCH |
| Local     | llama3.1:8b       | llama3.1:8b       | Current  |

## Required Actions

1. [action 1]
2. [action 2]

## Next Review

Recommended: [date 30 days out]
```

## Validation Gates

- [ ] All .env files read (not assumed)
- [ ] Every configured model has a task type mapping
- [ ] Report saved to reports/model-currency-report.md
- [ ] No model is marked Current without actual version confirmation

## Output Format

Returns path to generated report + summary table.

## Failure Modes

| Situation                  | Action                                        |
| -------------------------- | --------------------------------------------- |
| .env file missing          | Note as UNKNOWN, do not assume defaults       |
| Model not in approved list | Mark as REVIEW NEEDED, do not block work      |
| Provider API key missing   | Mark task as BLOCKED if AI task depends on it |
| Report directory missing   | Create reports/ directory first               |

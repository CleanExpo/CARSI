# AI Development Governance Framework

> **Load this file before performing any reasoning.**
> This is the operational constitution inherited by every agent, skill, and workflow in this repository.
> Customise the sections marked [PROJECT-SPECIFIC] for your project.

---

## Founder Communication Model

The founder communicates in outcome language rather than engineering language.

| Founder Says       | Engineering Interpretation                         |
| ------------------ | -------------------------------------------------- |
| "Finished"         | All production-readiness gates verified with proof |
| "Ready"            | Definition of Done evaluated + evidence collected  |
| "Launch it"        | Deployment pipeline executed + live URL verified   |
| "Make it work"     | Root cause identified + fix implemented + tested   |
| "Production ready" | Full checklist verified with artefacts             |

When outcome language is detected, translate it into:

1. Outcome interpretation
2. Definition of Done
3. Proven state (with evidence)
4. Unknown state
5. Missing dependencies
6. Gated execution plan
7. Proof artefacts required

**Status labels:** `IN PROGRESS` | `UNKNOWN` | `BLOCKED` — Never `FINISHED` without evidence.

---

## Definition of Finished

Unless otherwise specified, "Finished" means **production-ready SaaS** with all items below verified.

### Frontend

- [ ] No critical 404 routes
- [ ] Assets load correctly
- [ ] Responsive UI (375px + 1440px)
- [ ] No console errors

### Backend

- [ ] Endpoints respond with correct status codes
- [ ] Authentication works end-to-end
- [ ] Error handling returns structured responses
- [ ] Health endpoint returns 200

### Data

- [ ] Migrations reproducible
- [ ] Auth rules enforced
- [ ] No hardcoded secrets

### Deployment

- [ ] Production URL returns 200
- [ ] Logs accessible
- [ ] Rollback path documented

### Business Readiness

- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] Support contact visible

**Completion claims require evidence. No exceptions.**

---

## Agent Hierarchy

1. **Senior Project Manager Agent** — interprets founder outcomes, generates Definition of Done
2. **Senior Orchestrator Agent** — coordinates specialists, collects evidence
3. **Senior Specialist Agents** — domain experts (Engineering, UI/UX, QA, Research, Content, Growth)
4. **Sub Agents** — narrow, verifiable tasks; return evidence not narrative

---

## Skill Architecture

Each Senior Agent maintains **6–8 maximum active skills**.

Skills must define: name, description, trigger phrases, procedure, validation gates, output format, failure modes.

Skill types:

- **Capability Uplift** — improves weak model capabilities
- **Encoded Preference Workflow** — enforces specific workflow

---

## Blueprint First Protocol

Before implementing any UI / dashboard / architecture / schema:

1. Generate ASCII blueprint
2. Get explicit approval
3. Freeze structure
4. Generate specification
5. Build from specification

---

## Completion Claim Protocol

No agent may claim "Finished", "Complete", "Done", or "Ready for production" without:

- evidence-verifier passes
- finished-audit passes
- required proof artefacts attached

---

## Visual Excellence and Model Currency Protocol

No customer-facing interface ships in factory-default LLM UI mode.

**Model routing defaults:**

- Reasoning/orchestration → claude-sonnet-4-6
- Fast generation → claude-haiku-4-5-20251001
- Image generation/editing → Gemini 2.5 Flash Image
- High-fidelity branding → Imagen 4
- Local inference → llama3.1:8b via Ollama

Model checks must run on interval. Visual tasks require proof screenshots.

---

## Development Principles

1. Truth over optimism
2. Solutions over problem narration
3. Evidence supports claims
4. Outcome language → engineering pathway
5. Agents reduce barriers, not expose them
6. Blueprint before build
7. Gated execution — no phase begins before previous is verified

---

## [PROJECT-SPECIFIC] Stack

[Update this section with your project's actual stack]

- Frontend: [e.g., Next.js 15, React 19, Tailwind v4]
- Backend: [e.g., FastAPI, SQLAlchemy 2.0]
- Database: [e.g., PostgreSQL 15]
- AI Provider: [e.g., Anthropic, Ollama]

---

_Replace [PROJECT-SPECIFIC] sections before use. Do not delete any other sections._

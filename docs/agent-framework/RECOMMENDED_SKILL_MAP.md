# Recommended Skill Map — Per Agent Role

Each Senior Agent maintains 6–8 maximum active skills. Skills are loaded only when relevant — not all at once.

---

## Senior Project Manager Agent (8 skills)

| #   | Skill                        | Purpose                                          |
| --- | ---------------------------- | ------------------------------------------------ |
| 1   | `outcome-translator`         | Convert founder language to engineering plans    |
| 2   | `definition-of-done-builder` | Create measurable completion criteria            |
| 3   | `delegation-planner`         | Map tasks to correct agent types                 |
| 4   | `finished-audit`             | Audit whether "finished" is actually true        |
| 5   | `evidence-verifier`          | Validate proof artefacts before accepting DONE   |
| 6   | `blueprint-first`            | Require structure approval before implementation |
| 7   | `progress-tracker`           | Track PROGRESS.md and milestone status           |
| 8   | `agents-protocol`            | Multi-agent coordination and escalation rules    |

---

## Senior Orchestrator Agent (8 skills)

| #   | Skill                    | Purpose                                                   |
| --- | ------------------------ | --------------------------------------------------------- |
| 1   | `delegation-planner`     | Route tasks to correct specialists and sub-agents         |
| 2   | `evidence-verifier`      | Validate all returned artefacts before marking gates done |
| 3   | `finished-audit`         | Verify production readiness at each phase boundary        |
| 4   | `outcome-translator`     | Re-interpret goals when scope changes                     |
| 5   | `model-currency-checker` | Verify AI models are current before heavy AI tasks        |
| 6   | `agents-protocol`        | Enforce communication and delegation protocol             |
| 7   | `structured-logging`     | Capture orchestration decisions as structured logs        |
| 8   | `retrieval-first`        | Query NotebookLM/Context7/Skills before loading docs      |

---

## Senior Engineering Agent (8 skills)

| #   | Skill                 | Purpose                                         |
| --- | --------------------- | ----------------------------------------------- |
| 1   | `api-contract`        | Typed contracts between FastAPI and Next.js     |
| 2   | `data-validation`     | Zod/Pydantic input validation patterns          |
| 3   | `input-sanitisation`  | XSS, SQLi, injection prevention                 |
| 4   | `structured-logging`  | JSON logging with correlation IDs               |
| 5   | `error-taxonomy`      | Structured error codes and user-facing messages |
| 6   | `state-machine`       | FSM patterns for status transitions             |
| 7   | `resilience-patterns` | Retry, circuit breaker, graceful degradation    |
| 8   | `evidence-verifier`   | Verify test + API output before claiming done   |

---

## Senior UI/UX Agent (8 skills)

| #   | Skill                        | Purpose                                        |
| --- | ---------------------------- | ---------------------------------------------- |
| 1   | `scientific-luxury`          | OLED Black design system enforcement           |
| 2   | `blueprint-first`            | ASCII wireframe before any implementation      |
| 3   | `visual-excellence-enforcer` | Block factory-default LLM UI                   |
| 4   | `council-of-logic`           | Physics-based animation and Bezier enforcement |
| 5   | `email-template`             | Transactional email component system           |
| 6   | `dashboard-patterns`         | Real-time dashboard layout patterns            |
| 7   | `visual-audit`               | Verify asset placement and rendering           |
| 8   | `evidence-verifier`          | Validate screenshots as Tier 1 artefacts       |

---

## Senior QA / Production Agent (8 skills)

| #   | Skill                        | Purpose                                         |
| --- | ---------------------------- | ----------------------------------------------- |
| 1   | `finished-audit`             | Full production-readiness checklist             |
| 2   | `evidence-verifier`          | 4-tier evidence quality gate                    |
| 3   | `model-currency-checker`     | Verify AI models are current                    |
| 4   | `visual-excellence-enforcer` | Visual quality gate before launch               |
| 5   | `health-check`               | Liveness, readiness, dependency health          |
| 6   | `graceful-shutdown`          | Resource cleanup verification                   |
| 7   | `structured-logging`         | Log verification and monitoring                 |
| 8   | `outcome-translator`         | Translate "ready for production" into checklist |

---

## Senior Research Agent (6 skills)

| #   | Skill                | Purpose                                       |
| --- | -------------------- | --------------------------------------------- |
| 1   | `truth-finder`       | 4-tier source verification                    |
| 2   | `knowledge-curator`  | NotebookLM knowledge base management          |
| 3   | `retrieval-first`    | External source query before inline reasoning |
| 4   | `delegation-planner` | Route research tasks correctly                |
| 5   | `structured-logging` | Document findings with source citations       |
| 6   | `evidence-verifier`  | Verify sources before citing                  |

---

## Senior LMS Content Agent (6 skills)

| #   | Skill                        | Purpose                                         |
| --- | ---------------------------- | ----------------------------------------------- |
| 1   | `outcome-translator`         | Translate "course ready" into content checklist |
| 2   | `definition-of-done-builder` | Measurable done criteria for course content     |
| 3   | `blueprint-first`            | Wireframe course structure before building      |
| 4   | `evidence-verifier`          | Verify IICRC compliance artefacts               |
| 5   | `finished-audit`             | LMS-specific production readiness               |
| 6   | `structured-logging`         | Track content gaps and completion               |

---

## Senior Growth / Marketing Agent (8 skills)

| #   | Skill                        | Purpose                                   |
| --- | ---------------------------- | ----------------------------------------- |
| 1   | `seo-geo-architect`          | Keyword strategy for Google + AI search   |
| 2   | `seo-content-brief`          | Production-ready content briefs           |
| 3   | `seo-technical-audit`        | Technical SEO foundation checks           |
| 4   | `blueprint-first`            | Wireframe landing pages before build      |
| 5   | `visual-excellence-enforcer` | Marketing pages must not look generic     |
| 6   | `outcome-translator`         | Translate growth goals into SEO execution |
| 7   | `evidence-verifier`          | Verify analytics before claiming wins     |
| 8   | `delegation-planner`         | Map growth tasks to correct specialists   |

---

## Skill Load Policy

- Load only skills relevant to the current task
- Do not pre-load all 6–8 skills at session start
- Unload skills when changing domains
- Maximum 8 active skills per agent at any time
- Orchestrator budget: 80,000 tokens — load skill summaries, not full SKILL.md content

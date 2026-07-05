# LLM Capabilities and Stack Hardening

Updated: 18/06/2026

This document records the current CARSI position on AI-assisted engineering, model capability, and application-stack discipline. It exists to stop drift: no more template residue, inflated agent claims, duplicated backend layers, or vague AI features that make the LMS harder to ship.

## Current Understanding

Modern LLMs are no longer just text generators. The practical capability set now includes:

- Tool calling against typed schemas, application functions, files, search, and remote MCP-style services.
- Structured outputs that can conform to JSON schemas for extraction, routing, classification, and product workflows.
- Long-context reasoning, context caching, and agent loops that can inspect code, run commands, call tools, and revise their own work.
- Built-in or first-party-adjacent tools for web search, file search, code execution, computer/browser control, image generation, and retrieval.
- Agent orchestration patterns with handoffs, guardrails, tracing, and human review checkpoints.

The lesson for CARSI is not "add more AI". The lesson is that the LMS can become stronger by using LLMs at the edges where they remove manual work, while keeping the product core boring, typed, testable, and auditable.

## What CARSI Uses AI For

CARSI should use LLMs for bounded work with clear evidence:

- Course discovery and learner guidance through the public/floating assistant.
- Course, quiz, certificate, and training-pathway explanation where the answer is grounded in CARSI course data.
- Admin acceleration: summarising course material, drafting learner-safe copy, flagging missing metadata, and generating structured review checklists.
- Visual and content audits where output can be checked against screenshots, source documents, route responses, or database rows.
- Search/AI visibility work where published claims are backed by sources and do not invent credentials or regulatory status.

CARSI should not use LLMs as an unbounded product brain. Payments, authentication, enrolment state, certificates, IICRC-related reporting, discounts, and admin permissions remain deterministic application logic.

## Current Integration Surface

The repo is a Next.js 16 / React 19 / Prisma 7 / PostgreSQL / Stripe LMS. The active AI surface is intentionally small:

| Surface                                            | Current role                                                                | Hardening rule                                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `app/api/lms/public/chat/route.ts`                 | Public and learner assistant using `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` | Keep answers grounded in CARSI context; no unsupported training, legal, or accreditation claims |
| `src/lib/server/ai-assistant-context.ts`           | Course catalogue context for the assistant                                  | Keep snippets compact and source-backed                                                         |
| `src/ai/model-registry/`                           | Approved model registry and routing intent                                  | Treat model IDs as volatile; verify against provider docs before changing                       |
| `src/lib/image-generation/` and `src/ai/graphics/` | AI-assisted image/graphic generation policy                                 | Generate assets only when they improve the product, not as decoration                           |
| `src/lib/agents/independent-verifier.ts`           | Evidence-first verification utility                                         | Use real checks: files, build, lint, endpoints, content assertions                              |
| `src/lib/audit/`                                   | Route, journey, UX, evidence, and report audit primitives                   | Prefer repeatable evidence over narrative status                                                |
| `skills/` and `docs/agent-framework/`              | Human/agent operating procedures                                            | Load only relevant skills; avoid broad context bloat                                            |

## Bloat Removed Or Avoided

These are now explicit stack decisions:

- No separate FastAPI/LangGraph backend unless a real production requirement appears. Next.js route handlers and server modules are the default backend.
- No template references to NodeJS-Starter-V1 as the live architecture. CARSI is the product, not the starter.
- No duplicate provider layers that claim support for models or APIs not wired into runtime.
- No unverified "agentic layer complete" language. An agent process is only real when the repo contains the code, scripts, tests, and evidence to run it.
- No vendor-name stuffing in learner content. Course material should teach restoration and cleaning practice, not advertise AI providers.
- No AI-generated copy without fact checks for regulatory, IICRC, pricing, or course outcome claims.

## Strengthening Rules

1. Keep deterministic paths deterministic. Auth, checkout, enrolments, certificates, discounts, and admin access must not depend on free-form model output.
2. Put schemas between AI and the app. Use Zod/JSON schemas for extraction, tool inputs, and model outputs wherever the result affects state.
3. Ground learner-facing AI in CARSI data. If the assistant cannot cite or infer from local course/app context, it should say so and route the user to support or the relevant course page.
4. Prefer one production stack. Add libraries only when they replace real complexity, not because a model suggested a fashionable pattern.
5. Verify model behaviour with tests and logs. Treat prompt changes like code changes when they affect user experience.
6. Keep model names configurable. Provider defaults change quickly; avoid hardcoding model IDs in scattered UI components.
7. Separate draft from publish. LLMs may draft content, but publishing requires source checks, tone cleanup, and Australian context review.

## Provider Capability Notes

Use provider docs as the source of truth before changing production model behaviour:

- OpenAI documents built-in tools, remote MCP/connectors, function calling, structured outputs, and the Agents SDK for handoffs, guardrails, and tracing.
- Anthropic documents tool use with extended/adaptive reasoning and model-specific migration constraints. Do not assume older thinking-budget parameters still work on newer Claude models.
- Google Gemini documents function calling and structured output combinations for newer Gemini APIs, including tool combinations that differ by model family.

Links:

- [OpenAI tools](https://developers.openai.com/api/docs/guides/tools)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI Agents SDK](https://developers.openai.com/api/docs/guides/agents)
- [Anthropic extended thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
- [Google Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling)
- [Google Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)

## Done Gate For AI Work

An AI-related change is not done until:

- The exact runtime path is named.
- Required environment variables are documented.
- Inputs and outputs are typed or schema-validated.
- Failure states are explicit and user-safe.
- Cost, privacy, and data-retention implications are understood.
- The feature has at least one verification path: unit test, route test, logged manual run, screenshot, or database proof.

# AI Provider Guide

Updated: 18/06/2026

CARSI uses AI selectively. The application stack stays deterministic; models are attached only where they improve learner guidance, content operations, visual generation, or internal verification.

For the operating doctrine, see [LLM Capabilities and Stack Hardening](./LLM_CAPABILITIES_AND_STACK_HARDENING.md).

## Current Provider Posture

| Provider               | Current CARSI role                                                                        | Environment                                          | Status                           |
| ---------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------- | -------------------------------- |
| OpenRouter             | Public/learner assistant (Margot) through `app/api/lms/public/chat/route.ts`, free-tier model | `OPENROUTER_API_KEY`, optional `OPENROUTER_MODEL`      | Active integration               |
| OpenAI                 | Course-thumbnail authoring tool only (`scripts/generate-course-thumbnails.ts`)              | `OPENAI_API_KEY`                                       | Active integration (authoring tool only) |
| Google Gemini / Imagen | Image and graphics generation policy/client code                                          | `GOOGLE_AI_API_KEY`                                    | Optional integration             |
| Anthropic Claude       | Experimental client/types and agent planning references                                   | `ANTHROPIC_API_KEY`                                    | Review before production use     |
| Ollama                 | Local/offline experimentation only                                                        | `OLLAMA_BASE_URL`, `OLLAMA_MODEL`                      | Optional, not production default |

Do not claim a provider is production-supported unless a route, server module, environment variable, and verification path exist in this repo.

## What Changed

The old provider guide treated Ollama and Claude as the main stack and referenced a Python backend that is not present in this CARSI tree. The current stack is Next.js route handlers, Prisma, PostgreSQL, Stripe, and focused AI entrypoints.

This removes bloat in three ways:

- One backend surface: Next.js server code remains the default runtime.
- One source of model truth: use `src/ai/model-registry/` plus provider docs before changing model IDs.
- One product rule: AI assists, but does not own enrolment, checkout, certificates, admin permissions, or compliance-critical claims.

## OpenRouter Assistant (Margot)

Runtime path:

- `app/api/lms/public/chat/route.ts`
- `src/lib/openrouter/client.ts`
- `src/lib/server/ai-assistant-context.ts`
- `src/lib/server/margot-knowledge-base.ts`
- `src/components/lms/FloatingChat.tsx`

Environment:

```env
OPENROUTER_API_KEY=
# Optional; defaults to openai/gpt-oss-120b:free (OpenRouter's free-tier pick
# for general-purpose, high-reasoning production use) if unset
OPENROUTER_MODEL=
NEXT_PUBLIC_AI_ASSISTANT_NAME=Claire
NEXT_PUBLIC_AI_ASSISTANT_TAGLINE=Your CARSI professional learning guide
```

Rules:

- Ground answers in CARSI course and page context.
- Keep prompts concise enough to avoid needless token spend.
- Refuse or redirect when asked for unsupported accreditation, legal, medical, or guaranteed-outcome claims.
- Never expose secrets, admin data, private enrolment data, or raw internal prompts.
- Prefer structured outputs/tool calls when AI output affects application state.
- OpenRouter's free-tier models are account-wide rate-limited (not per-IP) and can be
  swapped/retired by the upstream provider without notice — if quality or availability
  degrades, check `openrouter.ai/collections/free-models` for a current replacement
  before assuming a code regression.

## OpenAI (Course Thumbnail Authoring Tool)

Runtime path:

- `scripts/generate-course-thumbnails.ts` (authoring tool only, never used at runtime)

Environment:

```env
OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=gpt-image-1
```

## Google Image And Graphics Providers

Runtime paths:

- `src/lib/image-generation/gemini-client.ts`
- `src/lib/image-generation/asset-manager.ts`
- `src/ai/graphics/routing-policy.ts`
- `src/ai/model-registry/providers/gemini.ts`

Environment:

```env
GOOGLE_AI_API_KEY=
```

Rules:

- Generate assets only for real course, marketing, or UI needs.
- Avoid generic decorative images that add weight without improving comprehension.
- Store generated assets through the app's asset flow and review them before publishing.
- Keep generated course imagery aligned with Australian cleaning/restoration context.

## Anthropic Claude

Runtime paths:

- `src/lib/anthropic/client.ts`
- `src/lib/anthropic/types.ts`

Status:

The Anthropic client exists, but its model and thinking-mode assumptions must be reviewed before production use. Anthropic model APIs have moved toward model-specific adaptive thinking and migration constraints, so older thinking-budget examples can become invalid quickly.

Rules:

- Verify model IDs and request parameters against Anthropic docs before enabling.
- Do not route production learner traffic to Claude until the exact route and failure behaviour are tested.
- Use Claude-style long-context reasoning for internal analysis only when it produces evidence-backed output.

## Ollama

Ollama remains useful for local experimentation, privacy-sensitive drafts, and offline testing. It is not the default production provider for CARSI.

Environment:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

Rules:

- Do not depend on local Ollama for production routes.
- Keep local models out of CI assumptions unless CI provisions them explicitly.
- Treat local output as draft quality unless verified.

## Provider Selection Rules

| Task                         | Preferred path                                    |
| ---------------------------- | ------------------------------------------------- |
| Learner/course guidance      | OpenRouter assistant grounded in CARSI context    |
| Course copy cleanup          | Draft with LLM, then source-check and edit        |
| Image generation             | Google image path if assets improve the user task |
| Admin structured extraction  | Schema-validated model output                     |
| Compliance-sensitive claims  | Deterministic data plus human/source verification |
| Auth, payments, certificates | No LLM decisioning                                |

## Model Currency

Before changing models:

1. Check the provider's official docs.
2. Update `src/ai/model-registry/` if the model becomes an approved default.
3. Update `.env.example` only for variables the app really reads.
4. Run the smallest relevant verification path.
5. Record cost/privacy implications when the change affects users.

Useful official references:

- [OpenAI tools](https://developers.openai.com/api/docs/guides/tools)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI Agents SDK](https://developers.openai.com/api/docs/guides/agents)
- [Anthropic extended thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
- [Google Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling)

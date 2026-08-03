---
name: project-context
category: context
version: 2.0.0
description: CARSI project-specific knowledge
priority: 2
---

# CARSI Project Context Skill

Use this skill when working inside `/Users/phillmcgurk/CARSI`.

## Product Identity

- Canonical name: CARSI
- Alias: Online Training LMS
- Purpose: Online training and CEC learning platform for Australian cleaning and restoration professionals
- GitHub: `CleanExpo/CARSI`

The portfolio registry previously held the SSOT for identity at `../Unite-Hub/.portfolio/PORTFOLIO.yaml`; Unite-Hub was decommissioned 2026-06-20 and no active replacement registry is wired here.

## Current Stack

| Layer           | Current CARSI stack                                 |
| --------------- | --------------------------------------------------- |
| App             | Next.js 16 App Router                               |
| Runtime UI      | React 19                                            |
| Language        | TypeScript                                          |
| Styling         | Tailwind CSS v4 plus local design tokens/components |
| Database        | PostgreSQL                                          |
| ORM             | Prisma 7                                            |
| Payments        | Stripe                                              |
| Email           | Resend/server email helpers                         |
| AI assistant    | OpenAI-backed public/learner assistant              |
| Image AI        | Optional Google/Gemini image-generation path        |
| Deployment docs | DigitalOcean and production runbooks                |

Do not assume the old NodeJS-Starter-V1 FastAPI/LangGraph/Supabase backend exists in this repo. If a doc references `apps/backend`, verify before using it.

## Important Runtime Areas

| Area                         | Paths                                                       |
| ---------------------------- | ----------------------------------------------------------- |
| Public pages                 | `app/(public)/`                                             |
| Admin                        | `app/(admin)/`, `src/lib/admin/`                            |
| Learner/dashboard            | `app/(dashboard)/`, `app/dashboard/`, `src/components/lms/` |
| API routes                   | `app/api/`                                                  |
| Server logic                 | `src/lib/server/`                                           |
| Prisma schema/migrations     | `prisma/`                                                   |
| AI model policy              | `src/ai/`                                                   |
| Verification/audit utilities | `src/lib/agents/`, `src/lib/audit/`                         |
| Course seed/import scripts   | `scripts/`, `data/`                                         |
| Docs                         | `docs/`                                                     |

## Stack Discipline

- Prefer Next.js route handlers and server modules before adding a separate backend service.
- Keep Prisma as the database access layer unless a file already uses a different established path.
- Use Zod/types for external input and model output.
- Keep auth, payments, enrolments, certificates, discounts, and admin permissions deterministic.
- Avoid copying template docs or patterns forward unless the paths exist.
- Update docs when removing stale architecture assumptions.

## AI Discipline

- LLMs may assist with learner guidance, content drafting, admin summaries, visual generation, and audits.
- LLMs must not decide critical state transitions.
- Ground learner-facing AI in CARSI course/page data.
- Treat model IDs as volatile; check official provider docs before changing defaults.
- Prefer structured outputs/tool schemas whenever output affects app behaviour.
- Record evidence for AI changes: route response, test, screenshot, generated artefact, or audit result.

## Verification Commands

```bash
npm run type-check
npm run lint
npm run build
npm run test:e2e
npm run test:a11y
```

Use the smallest relevant check first. For broad stack changes, run type-check, lint, and build.

# Skills Index

**Total Skills**: 36+
**Last Updated**: CARSI LLM and stack hardening refresh, 18/06/2026

---

## By Category

### Australian (2 skills)

Context and compliance for Australian market (en-AU defaults, regulations, GEO).

| Skill                           | Priority | Auto-load | Description                                                                                            |
| ------------------------------- | -------- | --------- | ------------------------------------------------------------------------------------------------------ |
| **australian-context.skill.md** | 1        | ✅        | en-AU spelling, DD/MM/YYYY dates, AUD currency, Australian regulations (Privacy Act 1988, WCAG 2.1 AA) |
| **geo-australian.skill.md**     | 2        | ❌        | GEO optimization for Australian market (Brisbane → Sydney → Melbourne), AI search citations            |

---

### Context (2 skills)

Project knowledge and orchestration patterns.

| Skill                        | Priority | Auto-load | Description                                                                                            |
| ---------------------------- | -------- | --------- | ------------------------------------------------------------------------------------------------------ |
| **orchestration.skill.md**   | 1        | ✅        | Master coordinator routing, multi-agent patterns (Plan→Parallelize→Integrate), context partitioning    |
| **project-context.skill.md** | 2        | ❌        | CARSI-specific knowledge (Next.js 16, React 19, Prisma 7, PostgreSQL, Stripe, bounded AI integrations) |

---

### Design (3 skills)

CARSI visual system, accessible LMS interfaces, purposeful assets, locked design tokens.

| Skill                         | Priority | Auto-load | Description                                                                                              |
| ----------------------------- | -------- | --------- | -------------------------------------------------------------------------------------------------------- |
| **design-system.skill.md**    | 1        | ✅        | Locked design tokens, CARSI LMS patterns, accessible controls, no generic template UI                    |
| **foundation-first.skill.md** | 2        | ❌        | 7-layer foundation (psychology → personas → journeys → emotions → acceptance criteria), 8 missing states |
| **tailwind.skill.md**         | 3        | ❌        | Tailwind v4 patterns, utility-first CSS, responsive design                                               |

---

### Verification (3 skills)

Verification-first development, truth verification, error handling.

| Skill                           | Priority | Auto-load | Description                                                                                                                     |
| ------------------------------- | -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **verification-first.skill.md** | 1        | ✅        | 5 core rules (Prove It Works, Honest Failure, No Assumptions, Root Cause First, One Fix at a Time), 4 verification tiers        |
| **truth-finder.skill.md**       | 2        | ❌        | 4-tier source hierarchy (.gov.au=100%, .edu.au=80-94%), confidence scoring, publishing thresholds (95%+ verified, <40% blocked) |
| **error-handling.skill.md**     | 2        | ❌        | 4 principles (Fail Fast, Fail Clearly, Fail Safely, Fail Loudly), Australian-friendly error messages (en-AU)                    |

---

### Search Dominance (3 skills)

SEO Intelligence, GEO optimization, Blue Ocean discovery for Australian market.

| Skill                         | Priority | Auto-load | Description                                                                                        |
| ----------------------------- | -------- | --------- | -------------------------------------------------------------------------------------------------- |
| **search-dominance.skill.md** | 2        | ❌        | SEO takeover strategy (Brisbane → Queensland → Australia → NZ → Global), SERP feature optimization |
| **blue-ocean.skill.md**       | 2        | ❌        | Heat signature scanning, opportunity scoring formula: (Volume × Growth × Gap) / Competition        |
| **rank-monitoring.skill.md**  | 3        | ❌        | Real-time ranking checks (daily/3x week/weekly), DataForSEO/SEMrush/GSC integration, alert system  |

---

### Backend / Server (3 skills)

Next.js server modules and API routes are the default CARSI backend. FastAPI/LangGraph skills are legacy/reference-only unless a real separate service is introduced.

| Skill                          | Priority | Auto-load | Description                                                                                       |
| ------------------------------ | -------- | --------- | ------------------------------------------------------------------------------------------------- |
| **advanced-tool-use.skill.md** | 3        | ❌        | Context-efficient tool management, structured outputs, deferred loading, Australian context tools |
| **langgraph.skill.md**         | 3        | ❌        | Legacy/reference workflow patterns only; do not assume runtime LangGraph exists                   |
| **fastapi.skill.md**           | 3        | ❌        | Legacy/reference API patterns only; CARSI default is Next.js route handlers                       |

---

### Frontend (2 skills)

Next.js 16, React 19, CARSI LMS design system.

| Skill                   | Priority | Auto-load | Description                                                                                |
| ----------------------- | -------- | --------- | ------------------------------------------------------------------------------------------ |
| **nextjs.skill.md**     | 3        | ❌        | Next.js App Router, Server Components, server actions/routes, Australian context utilities |
| **components.skill.md** | 4        | ❌        | Reusable LMS UI components, accessibility, stable responsive layouts                       |

---

### Database (1 skill)

PostgreSQL migrations, Australian compliance.

| Skill                   | Priority | Auto-load | Description                                                                                               |
| ----------------------- | -------- | --------- | --------------------------------------------------------------------------------------------------------- |
| **migrations.skill.md** | 3        | ❌        | Database migration patterns, RLS policies, Australian fields (phone, state, postcode, ABN), audit logging |

---

### Workflow (3 skills)

Feature development, bug fixing, and autonomous task completion workflows.

| Skill                            | Priority | Auto-load | Description                                                                                                             |
| -------------------------------- | -------- | --------- | ----------------------------------------------------------------------------------------------------------------------- |
| **feature-development.skill.md** | 3        | ❌        | 6-phase workflow (Requirements → Design → Implementation → Testing → Documentation → PR), TDD-first, Australian context |
| **bug-fixing.skill.md**          | 3        | ❌        | 7-phase workflow (Reproduce → Locate → Root Cause → Fix → Regression Test → Document → PR), en-AU error messages        |
| **ralph-wiggum.skill.md**        | 2        | ❌        | Autonomous task loop (PRD → progress.txt → verification → commit), Matt Pocock/Jeffrey Huntley technique                |

---

## By Priority

### Priority 1 (Critical - Auto-load)

These skills are loaded automatically on every response.

| Skill                           | Category     | Description                                    |
| ------------------------------- | ------------ | ---------------------------------------------- |
| **verification-first.skill.md** | Verification | Verification-first development approach        |
| **orchestration.skill.md**      | Context      | Master coordinator routing                     |
| **australian-context.skill.md** | Australian   | en-AU defaults everywhere                      |
| **design-system.skill.md**      | Design       | CARSI visual system and no generic template UI |

**Total**: 4 skills

---

### Priority 2 (High - Loaded on demand)

Critical skills loaded when relevant tasks are detected.

| Skill                         | Category         | Description                              |
| ----------------------------- | ---------------- | ---------------------------------------- |
| **truth-finder.skill.md**     | Verification     | Fact verification, source validation     |
| **error-handling.skill.md**   | Verification     | Error handling patterns (en-AU messages) |
| **foundation-first.skill.md** | Design           | 7-layer foundation, 8 missing states     |
| **search-dominance.skill.md** | Search Dominance | SEO takeover strategy                    |
| **blue-ocean.skill.md**       | Search Dominance | Opportunity discovery                    |
| **geo-australian.skill.md**   | Australian       | Australian GEO optimization              |
| **project-context.skill.md**  | Context          | Project-specific knowledge               |
| **ralph-wiggum.skill.md**     | Workflow         | Autonomous task completion loop          |

**Total**: 8 skills

---

### Priority 3 (Standard - Task-specific)

Loaded when specific domains or technologies are involved.

| Skill                            | Category         | Description                           |
| -------------------------------- | ---------------- | ------------------------------------- |
| **advanced-tool-use.skill.md**   | Backend          | Tool management, context optimization |
| **langgraph.skill.md**           | Backend          | Legacy/reference workflow patterns    |
| **fastapi.skill.md**             | Backend          | Legacy/reference API patterns         |
| **nextjs.skill.md**              | Frontend         | Next.js App Router                    |
| **migrations.skill.md**          | Database         | Database migrations                   |
| **feature-development.skill.md** | Workflow         | Feature development workflow          |
| **bug-fixing.skill.md**          | Workflow         | Bug fixing workflow                   |
| **rank-monitoring.skill.md**     | Search Dominance | Real-time ranking monitoring          |
| **tailwind.skill.md**            | Design           | Tailwind v4 patterns                  |

**Total**: 9 skills

---

### Priority 4+ (Optional - Contextual)

Loaded only when explicitly relevant.

| Skill                           | Category | Description              |
| ------------------------------- | -------- | ------------------------ |
| **components.skill.md**         | Frontend | Reusable UI components   |
| _[Additional skills as needed]_ | Various  | Domain-specific patterns |

**Total**: 11+ skills

---

## Skill Loading Rules

### Auto-loading Skills (Priority 1)

These 4 skills are **ALWAYS** loaded on every response:

- `verification-first.skill.md` - Verification-first approach
- `orchestration.skill.md` - Master coordinator
- `australian-context.skill.md` - en-AU defaults
- `design-system.skill.md` - CARSI visual system

### Conditional Loading

#### By Task Type

| Task Type           | Skills Loaded                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| **Frontend**        | nextjs.skill.md, components.skill.md, design-system.skill.md, tailwind.skill.md                    |
| **Backend/Server**  | project-context.skill.md, advanced-tool-use.skill.md; legacy fastapi/langgraph only if paths exist |
| **Database**        | migrations.skill.md                                                                                |
| **SEO**             | search-dominance.skill.md, blue-ocean.skill.md, geo-australian.skill.md, rank-monitoring.skill.md  |
| **Content**         | truth-finder.skill.md                                                                              |
| **New Feature**     | feature-development.skill.md, foundation-first.skill.md                                            |
| **Bug Fix**         | bug-fixing.skill.md, error-handling.skill.md                                                       |
| **Autonomous Loop** | ralph-wiggum.skill.md, verification-first.skill.md                                                 |

#### By Agent

| Agent                   | Skills Pre-loaded                                                                |
| ----------------------- | -------------------------------------------------------------------------------- |
| **Orchestrator**        | orchestration.skill.md, verification-first.skill.md, australian-context.skill.md |
| **Standards**           | australian-context.skill.md, design-system.skill.md                              |
| **Verification**        | verification-first.skill.md, error-handling.skill.md                             |
| **Truth Finder**        | truth-finder.skill.md                                                            |
| **SEO Intelligence**    | search-dominance.skill.md, blue-ocean.skill.md, geo-australian.skill.md          |
| **Spec Builder**        | foundation-first.skill.md, project-context.skill.md, design-system.skill.md      |
| **Frontend Specialist** | nextjs.skill.md, components.skill.md, design-system.skill.md                     |
| **Backend Specialist**  | project-context.skill.md, advanced-tool-use.skill.md                             |
| **Database Specialist** | migrations.skill.md                                                              |
| **Ralph Wiggum**        | ralph-wiggum.skill.md, verification-first.skill.md, feature-development.skill.md |

---

## Integration with Hooks

Skills are automatically loaded by hooks:

### pre-response.hook.md

- **Always loads**: australian-context.skill.md, verification-first.skill.md
- **Routes to**: orchestration.skill.md for task routing

### pre-publish.hook.md (BLOCKING)

- **Always loads**: truth-finder.skill.md
- **Blocks**: Content with confidence <75%

### pre-deploy.hook.md (BLOCKING)

- **Always loads**: verification-first.skill.md
- **Blocks**: Deployments failing E2E/Lighthouse/security

### post-skill-load.hook.md

- **Loads dependencies**: Automatically loads `requires:` skills from frontmatter

### pre-agent-dispatch.hook.md

- **Loads agent skills**: Pre-loads skills based on agent type

### pre-seo-task.hook.md

- **Always loads**: search-dominance.skill.md, geo-australian.skill.md, australian-context.skill.md

---

## Australian-First Context

All skills enforce Australian defaults:

- **Language**: en-AU (colour, organisation, licence, metre, centre)
- **Date Format**: DD/MM/YYYY (NOT MM/DD/YYYY)
- **Currency**: AUD ($1,234.56, GST 10%)
- **Phone**: 04XX XXX XXX (mobile), (0X) XXXX XXXX (landline)
- **Postcode**: 4 digits (e.g., 4000 Brisbane)
- **States**: QLD, NSW, VIC, SA, WA, TAS, NT, ACT
- **Regulations**: Privacy Act 1988, WCAG 2.1 AA, SafeWork Australia
- **Default Locations**: Brisbane → Sydney → Melbourne

---

## Design System Enforcement

All skills enforce 2025-2026 aesthetic:

- **Layout**: Bento grids (modular, varying card sizes)
- **Surface**: Glassmorphism (rgba background, backdrop blur, border)
- **Colors**: Primary #0D9488 teal, soft colored shadows (NEVER pure black)
- **Icons**: Use established CARSI icon/component patterns; avoid generic template icon walls
- **Typography**: Inter (body), Cal Sans (headings), JetBrains Mono (code)
- **Spacing**: 8px base, 0.25rem unit
- **Border Radius**: 6px (sm) → 24px (2xl)
- **Micro-interactions**: hover-scale (1.02), 150ms transitions

**Forbidden**: Lucide icons, pure black shadows, flat gray boxes, Bootstrap aesthetic

---

## Skill Dependencies

Skills can require other skills via frontmatter:

```yaml
---
name: feature-development
requires:
  - verification/verification-first.skill.md
  - verification/error-handling.skill.md
  - australian/australian-context.skill.md
---
```

When a skill is loaded, its dependencies are automatically loaded by `post-skill-load.hook.md`.

---

## Skill File Structure

All skills follow this structure:

```markdown
---
name: skill-name
category: category-name
version: X.Y.Z
description: One-line description
author: Unite Group
priority: 1-10
auto_load: true/false # Priority 1 skills only
triggers: # Optional
  - keyword1
  - keyword2
requires: # Optional
  - category/skill.skill.md
---

# Skill Name

[Skill content in markdown]
```

---

## Updating Skills

To update a skill:

1. Edit the `.skill.md` file
2. Increment `version` in frontmatter
3. Update `Last Updated` in this INDEX.md
4. Test skill loading with orchestrator
5. Commit changes with descriptive message

---

## Creating New Skills

To create a new skill:

1. Create file in appropriate category: `skills/{category}/{name}.skill.md`
2. Add complete YAML frontmatter (name, category, version, description, priority)
3. Add Australian context where relevant
4. Add to this INDEX.md under correct category and priority
5. Update `.claude/agents/` files to reference new skill if needed
6. Test with orchestrator
7. Commit with message: `feat(skills): Add {name}.skill.md`

---

## See Also

- **Agents**: `.claude/agents/` - 19 specialized agents
- **Hooks**: `.claude/hooks/` - 10 automatic hooks (2 blocking)
- **Data**: `.claude/data/` - trusted-sources.yaml, design-tokens.json
- **Rules**: `.claude/rules/` - Path-specific auto-loading
- **README**: `.claude/README.md` - Complete architecture documentation

---

🦘 **Australian-first. Truth-first. SEO-dominant. Design-forward.**

_Phase 2 Complete - All 35+ skills migrated with `.skill.md` extension_

# Skills Registry - NodeJS-Starter-V1

This file provides an index of all available skills for AI coding agents working with this repository.

## Installed Skills

### Vercel Labs Agent Skills

Location: `.skills/vercel-labs-agent-skills/`

| Skill                       | Description                                     | Trigger Phrases                                       |
| --------------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| **react-best-practices**    | 57 React/Next.js performance optimisation rules | "optimise React", "review performance", "bundle size" |
| **web-design-guidelines**   | 100+ accessibility, performance, UX rules       | "review UI", "check accessibility", "audit design"    |
| **vercel-deploy-claimable** | One-command deployment to Vercel                | "deploy my app", "push to production"                 |

### Custom Skills

Location: `.skills/custom/`

| Skill                    | Description                                                                     | Trigger Phrases                                             |
| ------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **genesis-orchestrator** | Phase-locked execution for Next.js full-stack builds                            | "build", "implement", "create feature", "plan architecture" |
| **council-of-logic**     | Mathematical first principles validation (Turing, Von Neumann, Bezier, Shannon) | "optimise", "algorithm", "performance", "complexity"        |
| **scientific-luxury**    | Design system enforcement for Scientific Luxury tier UI                         | "design", "UI", "component", "styling", "animation"         |
| **skill-manager**        | Analyse skill gaps, generate new skills, browse catalogue, validate health      | "skill gap", "generate skill", "skill health", "missing skills" |
| **error-taxonomy**       | Structured error codes, categories, and user-facing messages                    | "error handling", "error codes", "error messages", "error response" |
| **data-validation**      | Zod and Pydantic validation patterns for input sanitisation                     | "validation", "Zod", "Pydantic", "schema", "sanitise", "input" |
| **input-sanitisation**   | XSS, SQL injection, and command injection prevention patterns                   | "XSS", "injection", "sanitise", "security", "escape", "OWASP" |
| **structured-logging**   | JSON-structured logging with correlation IDs and log levels                     | "logging", "logs", "observability", "tracing", "monitoring" |
| **api-contract**         | Typed API contracts between FastAPI (Pydantic) and Next.js (Zod)               | "API contract", "endpoint", "response type", "OpenAPI", "schema" |

### Identified Gaps

| Skill             | Description                                                                  | Status        |
| ----------------- | ---------------------------------------------------------------------------- | ------------- |
| **xaem-theme-ui** | Two-pass theme generation → code UI translation (high-entropy design themes) | Not installed |

**XAEM Gap Analysis**: The existing `scientific-luxury` skill enforces design constraints but does not generate themes. An XAEM-style skill would add a two-pass pipeline: (1) generate high-entropy visual themes (colour palettes, typography, spacing, animation curves), then (2) translate those themes into implementable code (CSS variables, Tailwind config, component styles). This complements `scientific-luxury` by handling the creative generation pass before constraint enforcement.

**Note**: Use `/skill-manager analyse` to run automated gap analysis across all installed skills and detect missing capabilities.

## Skill Priority

When multiple skills could apply, use this priority order:

1. **council-of-logic** - Always validate code quality first
2. **skill-manager** - For skill lifecycle and gap analysis
3. **error-taxonomy** - For structured error handling patterns
4. **data-validation** - For input sanitisation and schema patterns
5. **input-sanitisation** - For injection prevention and security
6. **structured-logging** - For observability and log patterns
7. **api-contract** - For typed frontend/backend API contracts
8. **genesis-orchestrator** - For workflow and phase management
9. **scientific-luxury** - For UI/design decisions
10. **react-best-practices** - For React-specific optimisations
11. **web-design-guidelines** - For accessibility and UX audits

## Skill Activation

Skills activate automatically based on context. You can also explicitly invoke them:

```
Apply the council-of-logic skill to this code.
Use scientific-luxury guidelines for this component.
Run genesis-orchestrator for this feature build.
```

## Integration with Claude Code

Skills are loaded on-demand. Only skill names and descriptions load at startup. Full SKILL.md content loads when the agent determines relevance.

### Installation for Claude Code

```bash
# Copy custom skills to Claude Code
cp -r .skills/custom/* ~/.claude/skills/

# Copy Vercel skills
cp -r .skills/vercel-labs-agent-skills/skills/* ~/.claude/skills/
```

## Creating New Skills

Follow the Vercel Skills format. Use `/skill-manager generate {name}` to automate skill creation with built-in validation.

```
.skills/custom/{skill-name}/
  SKILL.md              # Required: skill definition with frontmatter
  scripts/              # Optional: executable scripts
  references/           # Optional: supplementary documentation
```

### SKILL.md Frontmatter

```yaml
---
name: skill-name
description: One sentence describing when to use this skill.
license: MIT
metadata:
  author: NodeJS-Starter-V1
  version: '1.0.0'
  locale: en-AU
---
```

## Skill Compatibility

These skills are compatible with:

- Claude Code (claude-code)
- Cursor
- GitHub Copilot
- Windsurf
- Other AI coding agents that support the Skills format

## Australian Localisation

All custom skills enforce en-AU conventions:

- **Date**: DD/MM/YYYY
- **Time**: H:MM am/pm (AEST/AEDT)
- **Currency**: AUD ($)
- **Spelling**: colour, behaviour, optimisation, analyse, centre

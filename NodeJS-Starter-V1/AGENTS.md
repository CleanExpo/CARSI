# AGENTS.md

> Root configuration for AI coding agents. Uses **nearest-wins hierarchy** - agents read the closest AGENTS.md to their work context.

## Project Snapshot

| Attribute | Value |
|-----------|-------|
| Type | Monorepo (Turborepo) |
| Frontend | Next.js 15, React 19, Tailwind v4, shadcn/ui |
| Backend | FastAPI, LangGraph, Pydantic |
| Database | Supabase (PostgreSQL, pgvector, RLS) |
| Package Manager | pnpm (frontend), uv (backend) |

## Quick Start

```bash
# Install all dependencies
pnpm install

# Start all services (frontend + backend)
pnpm dev

# Frontend only
pnpm dev --filter=web

# Backend only
cd apps/backend && uv run uvicorn src.api.main:app --reload
```

## Universal Commands

```bash
# Type checking & linting
pnpm turbo run type-check lint

# Run all tests
pnpm turbo run test

# Backend tests
cd apps/backend && uv run pytest

# Database migrations
supabase db push
```

## Package Index (JIT)

Navigate to nearest AGENTS.md for detailed guidance:

| Package | Path | Purpose |
|---------|------|---------|
| Frontend | [`apps/web/AGENTS.md`](apps/web/AGENTS.md) | Next.js app, components, design system |
| Backend | [`apps/backend/AGENTS.md`](apps/backend/AGENTS.md) | FastAPI, agents, LangGraph |
| Database | [`supabase/AGENTS.md`](supabase/AGENTS.md) | Migrations, RLS policies, seed data |
| Skills | [`skills/AGENTS.md`](skills/AGENTS.md) | Agent behaviors, orchestration rules |

## Universal Conventions

### Code Style
- **TypeScript**: Explicit return types, no `any`, strict mode
- **Python**: Type hints, Pydantic models, PEP 8, async/await
- **Naming**: React `PascalCase.tsx`, utils `kebab-case.ts`, Python `snake_case.py`

### Commits
```bash
# Format: <type>(<scope>): <description>
feat(web): add dark mode toggle
fix(backend): resolve agent timeout
docs(skills): update orchestrator guide
```

### Branching
- `main` - Production ready
- `feature/<name>` - New features
- `fix/<name>` - Bug fixes

### PR Requirements
- [ ] All checks pass (type-check, lint, test)
- [ ] No `console.log` or debug statements
- [ ] Documentation updated if needed
- [ ] Breaking changes documented

## Security & Secrets

```bash
# NEVER commit these patterns:
*.env
*.env.local
*credentials*.json
*secret*

# Required env vars (see .env.example):
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
BACKEND_URL=http://localhost:8000
```

## Architecture Layers

```
Frontend: Components → Hooks → API Routes → Services
Backend:  API → Agents → Tools → Graphs → State
Database: Tables → RLS → Functions → Triggers
```

**Rule**: No cross-layer imports. Each layer only imports from the layer directly below.

## Search Patterns (JIT)

```bash
# Find component by name
rg "export.*function.*Button" apps/web/components/

# Find API route
rg "async def" apps/backend/src/api/

# Find agent
rg "class.*Agent" apps/backend/src/agents/

# Find skill by trigger
rg "triggers:" skills/ -A 3

# Find migration
ls supabase/migrations/
```

## Definition of Done

Before marking any task complete:

- [ ] Code compiles without errors
- [ ] All tests pass: `pnpm turbo run test`
- [ ] Type check passes: `pnpm turbo run type-check`
- [ ] Lint passes: `pnpm turbo run lint`
- [ ] No regressions in existing functionality
- [ ] Manually verified the change works

## Quick Reference

```bash
# Pre-PR check (copy-paste ready)
pnpm turbo run type-check lint test && echo "✅ Ready for PR"

# Start fresh dev environment
pnpm install && pnpm dev

# Database reset
supabase db reset
```

---

**Next**: Navigate to package-specific AGENTS.md for detailed patterns and examples.

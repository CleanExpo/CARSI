# CLAUDE.md — NodeJS-Starter-V1

> Self-contained AI starter template: Next.js 15 + FastAPI/LangGraph + PostgreSQL. Everything runs locally in Docker.

> **GOVERNANCE:** Load `memory.md` before performing any reasoning. It is the operational constitution for all agents, skills, and workflows. Defines Founder Communication Model, Definition of Finished, Agent Hierarchy, Blueprint First Protocol, and Completion Claim Protocol.

## Quick Commands

```bash
# Setup
pnpm run setup              # Unix/macOS
pnpm run setup:windows      # Windows

# Development
pnpm dev                    # Start all services
pnpm run verify             # Health check
just --list                 # View all task runner commands

# Docker
pnpm run docker:up          # Start PostgreSQL + Redis
pnpm run docker:down        # Stop services
pnpm run docker:reset       # Reset database

# Quality
pnpm turbo run test         # All tests
pnpm turbo run lint         # Linting
pnpm turbo run type-check   # Type checking

# Beads (AI Agent Memory)
.bin/bd.exe ready           # Show unblocked tasks
.bin/bd.exe create "Title"  # Create new task
.bin/bd.exe sync            # Sync to git

# Skill Manager
/skill-manager analyse      # Analyse skill gaps
/skill-manager generate X   # Generate new skill

# Browser Automation
/ui-review run              # Execute UI stories via Playwright
/automate-browser <task>    # Ad-hoc browser automation
```

## Architecture Routing

| What                                         | Where                                 |
| -------------------------------------------- | ------------------------------------- |
| Frontend (Next.js 15, React 19, Tailwind v4) | `apps/web/`                           |
| Backend (FastAPI, LangGraph, SQLAlchemy 2.0) | `apps/backend/`                       |
| API client (fetch wrapper)                   | `apps/web/lib/api/client.ts`          |
| Auth API                                     | `apps/web/lib/api/auth.ts`            |
| JWT middleware                               | `apps/web/middleware.ts`              |
| AI agents                                    | `apps/backend/src/agents/`            |
| FastAPI routes                               | `apps/backend/src/api/`               |
| JWT auth                                     | `apps/backend/src/auth/jwt.py`        |
| Database config                              | `apps/backend/src/config/database.py` |
| SQLAlchemy models                            | `apps/backend/src/db/`                |
| AI provider abstraction                      | `apps/backend/src/models/`            |
| State store (NullStateStore)                 | `apps/backend/src/state/`             |
| Database schema                              | `scripts/init-db.sql`                 |
| Design tokens                                | `apps/web/lib/design-tokens.ts`       |
| Playwright config                            | `apps/web/playwright.config.ts`       |

## Knowledge Retrieval

Query knowledge sources before loading docs into context. See `.claude/rules/retrieval-first.md`.

| Source                    | Use For                                           | Access                                    |
| ------------------------- | ------------------------------------------------- | ----------------------------------------- |
| **NotebookLM**            | Architecture, debugging, security, onboarding     | `nlm notebook query <id>`                 |
| **Context7 MCP**          | Library docs (Next.js, FastAPI, Playwright, etc.) | `resolve-library-id` → `get-library-docs` |
| **Skills** (67 installed) | Pattern libraries                                 | `.skills/custom/*/SKILL.md`               |
| **Jina Reader**           | Web content extraction                            | `https://r.jina.ai/{url}`                 |

NotebookLM config: `.claude/notebooklm/notebooks.json`
Full skill registry: `.skills/AGENTS.md`

## Authentication Flow

1. **Login**: `POST /api/auth/login` → bcrypt verify → JWT token → cookie
2. **Protected Routes**: Frontend middleware checks cookie; backend validates JWT
3. **Logout**: `POST /api/auth/logout` → clear cookie

Files: `apps/backend/src/auth/jwt.py`, `apps/web/lib/api/auth.ts`, `apps/web/middleware.ts`
Default credentials: `admin@local.dev` / `admin123`

## AI Provider System

```bash
# Default: Ollama (local, free)
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# Optional: Claude (cloud, paid)
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxx
```

Provider interface: `complete()`, `chat()`, `generate_embeddings()`
Selector: `apps/backend/src/models/selector.py`

## Environment Variables (Required — All Have Defaults)

```bash
DATABASE_URL=postgresql://starter_user:local_dev_password@localhost:5432/starter_db
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_EXPIRE_MINUTES=60
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Optional env vars: see `.env.example`

## Production Deployment

| Layer    | Platform      | URL / Notes                              |
| -------- | ------------- | ---------------------------------------- |
| Frontend | Vercel        | https://carsi-web.vercel.app             |
| Backend  | DigitalOcean  | Docker container (migrating from Fly.io) |
| Database | Supabase / DO | PostgreSQL 15 + pgvector                 |
| Email    | Mailpit (dev) | localhost:8025                           |

**Migration in progress**: Fly.io → DigitalOcean (Docker + managed Postgres)
Fly.io config files in `fly.toml`, `Dockerfile` are being superseded by `docker-compose.prod.yml` + DO droplet.

## State Store

Supabase removed. Backend uses **NullStateStore** for graceful degradation.

| File                           | Purpose                                                 |
| ------------------------------ | ------------------------------------------------------- |
| `src/state/null_store.py`      | NullStateStore + `_NullTableClient` chain               |
| `src/state/supabase.py`        | Re-export shim (`NullStateStore as SupabaseStateStore`) |
| `src/state/__init__.py`        | `get_state_store()` factory                             |
| `src/utils/supabase_client.py` | Safe `_NullClient` shim                                 |

Degraded: `/api/analytics/*` (empty), `/api/contractors/*` (503)

## Design System — Scientific Luxury

| Element    | Implementation                           |
| ---------- | ---------------------------------------- |
| Background | OLED Black (`#050505`)                   |
| Borders    | `border-[0.5px] border-white/[0.06]`     |
| Corners    | Sharp only (`rounded-sm`)                |
| Typography | JetBrains Mono (data), Editorial (names) |
| Animations | Framer Motion only                       |
| Layout     | Timeline/orbital                         |

**Spectral colours**: Cyan `#00F5FF` (active), Emerald `#00FF88` (success), Amber `#FFB800` (warning), Red `#FF4444` (error), Magenta `#FF00FF` (escalation)

Full system + banned elements: `docs/DESIGN_SYSTEM.md` | Skill: `.skills/custom/scientific-luxury/SKILL.md`

## Key Principles

1. **Local-First** — Everything runs locally. No cloud required for development.
2. **Zero Barriers** — No API keys, accounts, or configuration needed to start.
3. **Production Ready** — Real authentication, testing, CI/CD included.
4. **Retrieval-First** — Query Context7/NotebookLM/Skills before loading docs into context.

## Context Drift Prevention

Context drift occurs when project rules are lost during automatic context compaction.
This project has a 4-pillar defence built in:

| Pillar              | Mechanism               | File                             |
| ------------------- | ----------------------- | -------------------------------- |
| Immutable rules     | CONSTITUTION.md on disk | `.claude/memory/CONSTITUTION.md` |
| Session injection   | SessionStart hook       | `session-start-context.ps1`      |
| Per-message compass | UserPromptSubmit hook   | `user-prompt-compass.ps1`        |
| Pre-compaction save | PreCompact hook         | `pre-compact-save.py`            |

If you notice drift (wrong patterns, ignored rules), run:

```bash
cat .claude/memory/CONSTITUTION.md   # Re-read immutable rules
cat .claude/memory/current-state.md  # Check saved state
```

Full documentation: `.claude/rules/context-drift.md`

## Testing Discipline

**Iron Law**: No production code without a failing test first. See `.skills/custom/tdd/SKILL.md`.

| Layer    | Runner | Location              | Command                               |
| -------- | ------ | --------------------- | ------------------------------------- |
| Frontend | vitest | `apps/web/__tests__/` | `pnpm test --filter=web`              |
| Backend  | pytest | `apps/backend/tests/` | `cd apps/backend && uv run pytest -v` |
| All      | turbo  | Both                  | `pnpm turbo run test`                 |

**Three mandatory skills**: `tdd` | `systematic-debugging` | `verification-before-completion`

**Banned phrases** (run the command instead): "should work", "probably passes", "seems correct", "likely fixed"

## Agents & Skills

- **31 subagents**: `.claude/agents/*/agent.md`
- **67 skills**: `.skills/AGENTS.md` (full registry)
- **14 commands**: `.claude/commands/*.md`
- **Orchestrator**: `.claude/agents/orchestrator/agent.md`

## Documentation

| Document                                                               | Purpose          |
| ---------------------------------------------------------------------- | ---------------- |
| [`PROGRESS.md`](PROGRESS.md)                                           | Project status   |
| [`docs/LOCAL_SETUP.md`](docs/LOCAL_SETUP.md)                           | Setup guide      |
| [`docs/AI_PROVIDERS.md`](docs/AI_PROVIDERS.md)                         | Ollama vs Claude |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)                       | Design system    |
| [`docs/BEADS.md`](docs/BEADS.md)                                       | AI agent memory  |
| [`docs/SPEC_GENERATION.md`](docs/SPEC_GENERATION.md)                   | Spec workflows   |
| [`docs/OPTIONAL_SERVICES.md`](docs/OPTIONAL_SERVICES.md)               | Cloud upgrades   |
| [`docs/MULTI_AGENT_ARCHITECTURE.md`](docs/MULTI_AGENT_ARCHITECTURE.md) | Agent workflow   |

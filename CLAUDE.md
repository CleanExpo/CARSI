# CLAUDE.md - NodeJS-Starter-V1 Architecture

> **Self-Contained AI Starter Template**: Next.js 15 + FastAPI/LangGraph + PostgreSQL

## Quick Overview

This is a **self-contained AI application template** designed to work completely offline without API keys or cloud dependencies. Everything runs locally in Docker.

## Quick Commands

```bash
# Setup (one-time)
pnpm run setup              # Unix/macOS
pnpm run setup:windows      # Windows

# Development
pnpm dev                    # Start all services
pnpm run verify             # Health check

# Docker Management
pnpm run docker:up          # Start PostgreSQL + Redis
pnpm run docker:down        # Stop services
pnpm run docker:reset       # Reset database

# Testing & Quality
pnpm turbo run test         # All tests
pnpm turbo run lint         # Linting
pnpm turbo run type-check   # Type checking

# Dependency Verification
pnpm verify                 # Full verification + dependency check
pnpm verify:fix             # Auto-fix dependency issues
pnpm deps:clean             # Clean install dependencies

# Beads - AI Agent Memory
.bin/bd.exe ready           # Show unblocked tasks
.bin/bd.exe create "Title"  # Create new task
.bin/bd.exe sync            # Sync to git

# Skill Manager
/skill-manager analyse      # Analyse skill gaps
/skill-manager generate X   # Generate new skill
/skill-manager browse       # Browse skill catalogue
/skill-manager health X     # Validate skill quality

# Claude Code Hooks
claude /hooks               # View configured hooks
claude --debug              # Debug hook execution
powershell -ExecutionPolicy Bypass -File .claude/hooks/install-hooks.ps1  # Install hooks
```

## Architecture Overview

### Frontend (Next.js 15)

**Location**: `apps/web/`

- Next.js 15 with App Router
- React 19 with Server Components
- Tailwind CSS v4 + design tokens
- shadcn/ui components
- JWT authentication (cookie-based)

**Key Files**:

- `apps/web/lib/api/client.ts` - API client (fetch wrapper)
- `apps/web/lib/api/auth.ts` - Authentication API
- `apps/web/middleware.ts` - JWT auth middleware
- `apps/web/app/` - App Router pages

### Backend (FastAPI + LangGraph)

**Location**: `apps/backend/`

- FastAPI async framework
- LangGraph agent orchestration
- SQLAlchemy 2.0 ORM
- JWT authentication with bcrypt
- Dual AI providers (Ollama + Claude)

**Key Directories**:

- `src/agents/` - AI agent implementations
- `src/api/` - FastAPI routes and dependencies
- `src/auth/` - JWT token management
- `src/config/` - Database and settings
- `src/db/` - SQLAlchemy models
- `src/models/` - AI provider abstraction layer

### Database (PostgreSQL 15)

**Location**: Docker Compose

- PostgreSQL 15 with pgvector extension
- Redis 7 for caching
- Auto-migrations on startup
- Persistent volumes

**Schema Location**: `scripts/init-db.sql`

**Key Tables**:

- `users` - Authentication with bcrypt passwords
- `documents` - Document storage with vector embeddings
- `contractors` - Contractor profiles
- `availability_slots` - Scheduling system

### AI Integration

**Default**: Ollama (local, free)
**Optional**: Claude API (cloud, paid)

**Provider Files**:

- `apps/backend/src/models/base_provider.py` - Abstract interface
- `apps/backend/src/models/ollama_provider.py` - Local AI
- `apps/backend/src/models/anthropic.py` - Cloud AI
- `apps/backend/src/models/selector.py` - Auto-detection

## Project Structure

```
NodeJS-Starter-V1/
├── apps/
│   ├── web/                    # Next.js Frontend
│   │   ├── app/                # App Router
│   │   ├── components/         # React components
│   │   ├── lib/api/            # API client
│   │   └── middleware.ts       # JWT auth
│   └── backend/                # Python Backend
│       ├── src/
│       │   ├── agents/         # AI agents
│       │   ├── api/            # FastAPI routes
│       │   ├── auth/           # JWT authentication
│       │   ├── config/         # Configuration
│       │   ├── db/             # Database models
│       │   └── models/         # AI providers
│       └── tests/              # Pytest tests
├── .beads/                     # AI agent memory (Beads tasks)
├── .bin/                       # Binary tools (bd.exe)
├── .claude/                    # Claude Code configuration
│   ├── agents/                 # Agent definitions
│   ├── commands/               # Slash commands
│   ├── hooks/scripts/          # Automation hook scripts
│   ├── primers/                # Agent primers
│   ├── rules/                  # Agent rules and profiles
│   └── settings.json           # Hook configuration
├── .skills/                    # Agent skills (55 installed)
│   ├── custom/                 # Custom skills
│   ├── vercel-labs-agent-skills/ # Vercel skills
│   └── AGENTS.md               # Full skill registry
├── docs/                       # Documentation
│   ├── guides/                 # Setup and deployment guides
│   ├── internal/               # Framework reference docs
│   ├── features/               # Feature specifications
│   ├── reference/              # API documentation
│   ├── releases/               # Release notes
│   └── reports/                # Test and verification reports
├── scripts/                    # Setup scripts
├── docker-compose.yml          # PostgreSQL + Redis
└── .env.example                # Environment template
```

## Development Workflow

### 1. Initial Setup

```bash
# Clone and setup
git clone https://github.com/CleanExpo/NodeJS-Starter-V1.git
cd NodeJS-Starter-V1
pnpm run setup

# Start development
pnpm dev
```

### 2. Development Cycle

```bash
# Make changes to code
# Hot reload works automatically

# Run tests before committing
pnpm turbo run test

# Check code quality
pnpm turbo run lint type-check
```

### 3. Database Changes

```bash
# If you modify database schema:
cd apps/backend

# Create migration
uv run alembic revision --autogenerate -m "description"

# Apply migration
uv run alembic upgrade head

# Or reset completely (destroys data)
pnpm run docker:reset
```

## Authentication Flow

### JWT-Based (No External Auth Service)

1. **Login**: `POST /api/auth/login`
   - User submits email/password
   - Backend verifies with bcrypt
   - Returns JWT token
   - Frontend stores in cookie

2. **Protected Routes**:
   - Frontend middleware checks cookie
   - Redirects to login if missing
   - Backend validates JWT on API requests

3. **Logout**: `POST /api/auth/logout`
   - Frontend clears cookie
   - Backend invalidates session

**Implementation**:

- Backend: `apps/backend/src/auth/jwt.py`
- Frontend: `apps/web/lib/api/auth.ts`
- Middleware: `apps/web/middleware.ts`

## AI Provider System

### How It Works

The template uses a **provider abstraction layer** that allows switching between local and cloud AI:

```python
# apps/backend/src/models/selector.py

# Automatically selects provider based on:
1. AI_PROVIDER environment variable
2. Availability of API keys
3. Fallback to Ollama if no key
```

### Default: Ollama (Local)

```bash
# .env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

### Optional: Claude (Cloud)

```bash
# .env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxx
```

### Provider Interface

All providers implement:

- `complete()` - Single completion
- `chat()` - Chat messages
- `generate_embeddings()` - Vector embeddings

## Database Architecture

### Connection Strategy

**Dual Engine Pattern**:

- **Async Engine**: For API requests (asyncpg driver)
- **Sync Engine**: For migrations (psycopg2 driver)

```python
# apps/backend/src/config/database.py

# API usage
async with AsyncSessionLocal() as session:
    result = await session.execute(query)

# Migrations
# Alembic uses sync engine automatically
```

### Key Models

**User** (`users` table):

- Email/password authentication
- JWT-based sessions
- Admin flag

**Document** (`documents` table):

- Title, content, metadata
- Vector embeddings (pgvector)
- Full-text search ready

**Contractor** (`contractors` table):

- Profile information
- Availability tracking
- Document associations

## Testing Strategy

### Backend Tests (Pytest)

```bash
cd apps/backend

# All tests
uv run pytest

# With coverage
uv run pytest --cov

# Specific test file
uv run pytest tests/test_auth.py
```

### Frontend Tests (Vitest)

```bash
# All tests
pnpm test --filter=web

# Watch mode
pnpm test:watch --filter=web

# E2E tests
pnpm test:e2e --filter=web
```

### CI/CD

GitHub Actions runs:

- All tests (no external services needed)
- Linting (ESLint + Ruff)
- Type checking (TypeScript + mypy)
- Security scans (NPM Audit + Trivy)

**No secrets required!** The CI works out of the box.

## Design System - Scientific Luxury Tier

All UI components must follow the **Scientific Luxury** design system. Full enforcement is handled by the `scientific-luxury` skill; theme generation by the `xaem-theme-ui` skill.

### Mandatory Elements

| Element           | Implementation                                      |
| ----------------- | --------------------------------------------------- |
| Background        | OLED Black (`#050505`)                              |
| Borders           | Single pixel (`border-[0.5px] border-white/[0.06]`) |
| Corners           | Sharp only (`rounded-sm`)                           |
| Typography        | JetBrains Mono (data), Editorial (names)            |
| Animations        | Framer Motion only (no CSS transitions)             |
| Layout            | Timeline/orbital (no card grids)                    |
| Status Indicators | Breathing orbs with spectral colours                |

### Spectral Colour System

| Colour  | Hex       | Usage                          |
| ------- | --------- | ------------------------------ |
| Cyan    | `#00F5FF` | Active, in-progress            |
| Emerald | `#00FF88` | Success, completed             |
| Amber   | `#FFB800` | Warning, verification          |
| Red     | `#FF4444` | Error, failed                  |
| Magenta | `#FF00FF` | Escalation, human intervention |

### Banned Elements

- Standard Bootstrap/Tailwind cards
- Symmetrical grids (`grid-cols-2`, `grid-cols-4`)
- Lucide/FontAwesome icons for status
- Linear transitions
- White/light backgrounds
- `rounded-lg`, `rounded-xl`

**Full Documentation**: [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)
**Design Tokens**: `apps/web/lib/design-tokens.ts`

## Agent Skills System

This project includes **55 installed skills** compatible with Vercel's Agent Skills format, covering 12 categories with full coverage.

**Location**: `.skills/`
**Full Registry**: [`.skills/AGENTS.md`](.skills/AGENTS.md)

### Key Skills

| Category                | Skills | Examples                                                    |
| ----------------------- | ------ | ----------------------------------------------------------- |
| Error Handling          | 5      | `error-taxonomy`, `error-boundary`, `retry-strategy`        |
| Security & Auth         | 9      | `input-sanitisation`, `rbac-patterns`, `oauth-flow`         |
| API & Integration       | 6      | `api-contract`, `api-client`, `webhook-handler`             |
| Observability           | 6      | `structured-logging`, `tracing-patterns`, `metrics-collector`|
| Infrastructure          | 4      | `docker-patterns`, `ci-cd-patterns`, `infrastructure-as-code`|
| Workflow & Orchestration| 6      | `state-machine`, `saga-pattern`, `workflow-engine`          |
| UI & Design             | 4      | `scientific-luxury`, `xaem-theme-ui`, `react-best-practices`|
| Meta / Orchestration    | 3      | `genesis-orchestrator`, `council-of-logic`, `skill-manager` |
| Content & Communication | 6      | `email-template`, `pdf-generator`, `slack-integration`      |
| Data & Search           | 5      | `vector-search`, `search-indexer`, `data-transform`         |
| Caching & Resilience    | 3      | `cache-strategy`, `resilience-patterns`, `rate-limiter`     |
| Other                   | 3      | `i18n-patterns`, `changelog-generator`, `feature-flag`      |

### Skill Manager

```bash
/skill-manager analyse      # Run gap analysis
/skill-manager generate X   # Generate new skill
/skill-manager health X     # Validate skill quality
/skill-manager browse       # Browse catalogue
```

## Multi-Agent Architecture

Hierarchical agent workflow for AI-assisted development.

```
Developer (Human) -> Senior PM -> Orchestrator -> Specialists (A/B/C/D)
```

| Agent              | Domain                              |
| ------------------ | ----------------------------------- |
| **Orchestrator**   | Task decomposition, synthesis       |
| **Specialist A**   | Architecture, design, API contracts |
| **Specialist B**   | Implementation, coding, refactoring |
| **Specialist C**   | Testing, validation, coverage       |
| **Specialist D**   | Documentation, review, knowledge    |

**Protocols**: Context isolation, quality gates, escalation path.

**Full Documentation**: [`docs/MULTI_AGENT_ARCHITECTURE.md`](docs/MULTI_AGENT_ARCHITECTURE.md)
**Rules**: `.claude/rules/genesis-hive-mind.md`, `.claude/rules/council-of-logic.md`

## Beads - AI Agent Memory

Persistent, git-backed task tracking across AI coding sessions.

**Location**: `.bin/bd.exe` (Windows) | `.beads/` (data)

```bash
.bin/bd.exe ready                          # Show unblocked tasks
.bin/bd.exe create "Task title" -p 0       # Create task with priority
.bin/bd.exe close bd-xxx --reason "Done"   # Close task
.bin/bd.exe sync                           # Sync to git
```

### Session End Protocol

Before ending any session: file remaining work as Beads tasks, close completed tasks, sync and push.

**Full Documentation**: [`docs/BEADS.md`](docs/BEADS.md)

## Claude Code Hooks

Automated shell commands at key lifecycle points.

**Location**: `.claude/hooks/scripts/` | Configuration: `.claude/settings.json`

| Hook Event       | Script                      | Purpose                                          |
| ---------------- | --------------------------- | ------------------------------------------------ |
| **SessionStart** | `session-start-context.ps1` | Loads git status, Beads tasks, Australian locale  |
| **PostToolUse**  | `post-edit-format.ps1`      | Auto-formats files after Edit/Write               |
| **PreToolUse**   | `pre-bash-validate.py`      | Validates bash commands, blocks dangerous ones    |
| **Notification** | `notification-alert.ps1`    | Windows toast notifications when input needed     |
| **Stop**         | `stop-verify-todos.py`      | Verifies work completion before allowing stop     |

## Spec Generation

Every feature and project phase requires a specification document before implementation.

- **Project Phase Spec**: `docs/phases/phase-X-spec.md`
- **Feature Spec**: `docs/features/[feature-name]/spec.md`
- **Modes**: Interview (comprehensive), Template (fast), Validation (review)

**Full Documentation**: [`docs/SPEC_GENERATION.md`](docs/SPEC_GENERATION.md)

## Optional Upgrades

See [`docs/OPTIONAL_SERVICES.md`](docs/OPTIONAL_SERVICES.md) for production deployment:

- **Frontend**: Vercel, Netlify, Cloudflare Pages
- **Backend**: DigitalOcean, Railway, Fly.io, Render
- **Database**: Managed PostgreSQL
- **Cloud AI**: Claude API
- **Services**: Codecov, Snyk, Sentry, PostHog

## Key Principles

1. **Local-First** - Everything runs on your machine. No cloud required for development.
2. **Zero Barriers** - No API keys, accounts, or configuration needed to start.
3. **Production Ready** - Real authentication, testing, CI/CD included.
4. **Optional Upgrades** - Easy path to cloud services when ready.

## Environment Variables

### Required (All Have Defaults)

```bash
# Database
DATABASE_URL=postgresql://starter_user:local_dev_password@localhost:5432/starter_db

# JWT
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_EXPIRE_MINUTES=60

# AI Provider
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# API
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Optional (Cloud Upgrades)

```bash
# Anthropic Claude
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# Other AI Providers
OPENAI_API_KEY=sk-xxx
GOOGLE_AI_API_KEY=xxx

# External Services
SENTRY_DSN=xxx
POSTHOG_API_KEY=xxx
```

## Documentation

| Document                                                               | Purpose                            |
| ---------------------------------------------------------------------- | ---------------------------------- |
| [`README.md`](README.md)                                              | Overview and quick start           |
| [`PROGRESS.md`](PROGRESS.md)                                          | Project status and phase tracking  |
| [`docs/LOCAL_SETUP.md`](docs/LOCAL_SETUP.md)                          | Complete setup guide               |
| [`docs/AI_PROVIDERS.md`](docs/AI_PROVIDERS.md)                        | Ollama vs Claude                   |
| [`docs/OPTIONAL_SERVICES.md`](docs/OPTIONAL_SERVICES.md)              | Deployment guides                  |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)                      | Scientific Luxury design system    |
| [`docs/MULTI_AGENT_ARCHITECTURE.md`](docs/MULTI_AGENT_ARCHITECTURE.md)| Multi-agent workflow specification |
| [`docs/BEADS.md`](docs/BEADS.md)                                      | AI agent memory system             |
| [`docs/SPEC_GENERATION.md`](docs/SPEC_GENERATION.md)                  | Spec generation workflows          |
| [`docs/new-project-checklist.md`](docs/new-project-checklist.md)      | 3-step setup checklist             |
| [`.skills/AGENTS.md`](.skills/AGENTS.md)                              | Full 55-skill registry             |
| [`docs/reference/VIBE_CODING_VS_SENIOR_ENGINEERS.md`](docs/reference/VIBE_CODING_VS_SENIOR_ENGINEERS.md) | AI vs human engineering analysis |

## Quick Reference

**Start Development**: `pnpm dev`
**Run Tests**: `pnpm turbo run test`
**Check Health**: `pnpm run verify`
**Reset Database**: `pnpm run docker:reset`
**Default Credentials**: admin@local.dev / admin123

---

**Built for developers who want to build AI apps without barriers.**

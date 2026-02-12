# CLAUDE.md - NodeJS-Starter-V1 Architecture

> **Self-Contained AI Starter Template**: Next.js 15 + FastAPI/LangGraph + PostgreSQL

## 🎯 Quick Overview

This is a **self-contained AI application template** designed to work completely offline without API keys or cloud dependencies. Everything runs locally in Docker.

## 📋 Quick Commands

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

## 🏗️ Architecture Overview

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

## 📂 Project Structure

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
│   ├── hooks/scripts/          # Automation hook scripts
│   ├── rules/                  # Agent rules and profiles
│   └── settings.json           # Hook configuration
├── .skills/                    # Agent skills (Vercel format)
├── docs/                       # Documentation
│   ├── MULTI_AGENT_ARCHITECTURE.md  # Agent workflow spec
│   ├── DESIGN_SYSTEM.md        # Scientific Luxury design
│   ├── BEADS.md                # Agent memory system
│   ├── LOCAL_SETUP.md          # Setup guide
│   ├── AI_PROVIDERS.md         # Ollama vs Claude
│   └── OPTIONAL_SERVICES.md    # Deployment guides
├── scripts/                    # Setup scripts
├── docker-compose.yml          # PostgreSQL + Redis
└── .env.example                # Environment template
```

## 🔄 Development Workflow

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

## 🔐 Authentication Flow

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

## 🤖 AI Provider System

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

## 📊 Database Architecture

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

## 🧪 Testing Strategy

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

## 🚀 Optional Upgrades

### When You're Ready for Production

See [`docs/OPTIONAL_SERVICES.md`](docs/OPTIONAL_SERVICES.md) for:

**Frontend Hosting**:

- Vercel (recommended)
- Netlify
- Cloudflare Pages

**Backend Hosting**:

- DigitalOcean App Platform
- Railway
- Fly.io
- Render

**Database Hosting**:

- Keep Docker (works fine)
- Upgrade to managed PostgreSQL

**Cloud AI**:

- Claude API ($3-75/1M tokens)
- Better quality than local

**External Services**:

- Codecov (coverage tracking)
- Snyk (security scanning)
- Sentry (error monitoring)
- PostHog (analytics)

## 🎯 Key Principles

### 1. Local-First

Everything runs on your machine. No cloud required for development.

### 2. Zero Barriers

No API keys, accounts, or configuration needed to start.

### 3. Production Ready

Real authentication, testing, CI/CD included.

### 4. Optional Upgrades

Easy path to cloud services when ready.

## 📝 Spec Generation System ✅ NEW

**Principle**: Every feature and project phase requires a specification document before implementation.

### Automatic Detection

The system automatically detects when you start new work and prompts for spec.md generation if one doesn't exist.

### Spec Types

- **Project Phase Spec**: For architectural changes (Phase 0-9 style)
  - Location: `docs/phases/phase-X-spec.md`
  - Links to PROGRESS.md
- **Feature Spec**: For focused features
  - Location: `docs/features/[feature-name]/spec.md`
  - Links to feature branch

### Generation Modes

- **Interview Mode**: Spec Builder Agent conducts 6-phase interactive interview (comprehensive)
- **Template Mode**: Pre-filled template for quick start (fast)
- **Validation Mode**: Reviews existing specs for completeness and compliance

### Verification

Specs must be ≥80% complete before implementation:

- ✅ All 6 phases have content
- ✅ Australian context specified (en-AU, DD/MM/YYYY, AUD)
- ✅ Design system compliance (NO Lucide icons, design tokens)
- ✅ Verification criteria defined

**See**: `docs/SPEC_GENERATION.md` for full documentation and workflows

## 🎨 Design System - Scientific Luxury Tier

This framework implements a **Scientific Luxury** design system. All UI components must follow these rules:

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

## 🧠 Agent Skills System

This project includes a skills system compatible with Vercel's Agent Skills format.

**Location**: `.skills/`

### Installed Skills

| Skill                   | Trigger                         | Purpose                                                        |
| ----------------------- | ------------------------------- | -------------------------------------------------------------- |
| `genesis-orchestrator`  | "build", "implement", "plan"    | Phase-locked workflow execution                                |
| `council-of-logic`      | "optimise", "algorithm", "O(n)" | Mathematical validation (Turing, Von Neumann, Bezier, Shannon) |
| `scientific-luxury`     | "design", "UI", "component"     | Design system enforcement                                      |
| `react-best-practices`  | "React performance", "bundle"   | 57 Vercel React optimisation rules                             |
| `web-design-guidelines` | "accessibility", "UX audit"     | 100+ accessibility & UX rules                                  |
| `skill-manager`         | "skill gap", "generate skill"   | Analyse gaps, generate skills, validate health                 |

### Installation

```bash
# Windows
.\.skills\install.ps1

# Unix/macOS
bash .skills/install.sh
```

### Creating Custom Skills

See `.skills/AGENTS.md` for the full skills registry and creation guide.

## 🤝 Multi-Agent Architecture

This project implements a **hierarchical multi-agent workflow** for AI-assisted development. All AI agents must follow these protocols.

**Full Documentation**: [`docs/MULTI_AGENT_ARCHITECTURE.md`](docs/MULTI_AGENT_ARCHITECTURE.md)

### Hierarchy

```
Developer (Human) → Senior PM → Orchestrator → Specialists (A/B/C/D)
```

### Agent Roles

| Agent | Domain | Context Focus |
|-------|--------|---------------|
| **Orchestrator** | Task decomposition, work distribution, synthesis | All coordination |
| **Specialist A** | Architecture, design, ADRs, API contracts | Design docs only |
| **Specialist B** | Implementation, coding, refactoring | Code only |
| **Specialist C** | Testing, validation, coverage | Tests only |
| **Specialist D** | Documentation, review, knowledge | Docs only |

### Core Protocols

1. **Linear Integration**: Every task tracked in Linear with full audit trail
2. **Context Isolation**: Each specialist operates in isolated context
3. **Quality Gates**: No phase advances without verification
4. **Escalation Path**: Specialist → Orchestrator → PM → Developer

### Quick Triggers

```
@orchestrator decompose: [task]
@specialist-a design: [component]
@specialist-b implement: [feature]
@specialist-c test: [component]
@specialist-d document: [feature]
```

### Integration Points

| System | Connection |
|--------|------------|
| Genesis Hive Mind | Orchestrator = GENESIS_DEV |
| Council of Logic | Quality gates invoke council validation |
| Beads | Tasks sync to `.beads/` |
| Linear | Primary task tracking |

## 🧵 Beads - AI Agent Memory System

This project uses **Beads** (`bd`) for persistent, git-backed task tracking across AI coding sessions.

**Location**: `.bin/bd.exe` (Windows) | `.beads/` (data)

### Why Beads?

| Problem | Beads Solution |
|---------|----------------|
| Tasks forgotten between sessions | Git-backed persistence |
| No dependency tracking | `bd ready` shows unblocked tasks |
| Merge conflicts in shared projects | Collision-free hash IDs |
| No audit trail | Full git history |

### Essential Commands

```bash
# View actionable tasks
.bin/bd.exe ready

# Create task with priority
.bin/bd.exe create "Implement feature" -p 0

# Create subtask
.bin/bd.exe create "Write tests" --parent bd-abc1

# Update status
.bin/bd.exe update bd-abc1 --status in_progress

# Close task
.bin/bd.exe close bd-abc1 --reason "Completed"

# Sync to git (always before session end)
.bin/bd.exe sync
```

### Session End Protocol ("Land the Plane")

**CRITICAL**: Before ending any session:

```bash
# 1. File remaining work
.bin/bd.exe create "TODO: Remaining work" -p 2

# 2. Update statuses
.bin/bd.exe close bd-xxx --reason "Done"

# 3. Sync and push
git pull --rebase
.bin/bd.exe sync
git push

# 4. Verify
git status  # Must show "up to date with origin/main"
```

**Full Documentation**: [`docs/BEADS.md`](docs/BEADS.md)

---

## 🪝 Claude Code Hooks - Automated Workflows

This project uses **Claude Code Hooks** for automated shell command execution at key lifecycle points.

**Location**: `.claude/hooks/scripts/` | Configuration: `.claude/settings.json`

### Installed Hooks

| Hook Event | Script | Purpose |
|------------|--------|---------|
| **SessionStart** | `session-start-context.ps1` | Loads git status, Beads tasks, PROGRESS.md, Australian locale |
| **PostToolUse** | `post-edit-format.ps1` | Auto-formats files after Edit/Write (Prettier, Black) |
| **PreToolUse** | `pre-bash-validate.py` | Validates bash commands, blocks dangerous ones, suggests alternatives |
| **Notification** | `notification-alert.ps1` | Windows toast notifications when Claude needs input |
| **Stop** | `stop-verify-todos.py` | Verifies work completion before allowing stop |

### Quick Commands

```powershell
# Install/verify hooks (one-time)
powershell -ExecutionPolicy Bypass -File .claude/hooks/install-hooks.ps1

# View configured hooks in Claude Code
claude /hooks

# Debug mode - see hook execution
claude --debug

# Toggle verbose mode (during session)
# Press Ctrl+O
```

### How Hooks Work

1. **SessionStart** - Fires when Claude Code starts, loads project context automatically
2. **PostToolUse (Edit|Write)** - After any file edit, auto-runs Prettier/Black
3. **PreToolUse (Bash)** - Before bash commands, validates for safety
4. **Notification** - On permission prompts, shows Windows toast alert
5. **Stop** - Before Claude stops, checks for uncommitted work

### Blocked Commands

The `pre-bash-validate.py` hook blocks dangerous commands:

- `rm -rf /` - Filesystem destruction
- `sudo rm -rf` - Elevated destructive commands
- Fork bombs and disk writes
- Direct device access

**Suggestions** are provided for:

- `grep` → `rg` (ripgrep)
- `find -name` → `fd`
- `cat` → `bat` (syntax highlighting)

### Configuration

Hooks are configured in `.claude/settings.json` under the `"hooks"` key. Each hook specifies:

- **matcher**: Tool pattern to match (e.g., `"Edit|Write"`, `"Bash"`)
- **type**: `"command"` for shell execution
- **command**: The script to run
- **timeout**: Maximum execution time in seconds

### Creating Custom Hooks

1. Create script in `.claude/hooks/scripts/`
2. Add configuration to `.claude/settings.json`
3. Test with `claude --debug`

**Hook Input**: JSON via stdin with `tool_name`, `tool_input`, `session_id`
**Hook Output**: Exit code 0 (success), 2 (block), or JSON with decisions

**Full Documentation**: [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks)

---

## 📚 Documentation

| Document                                                                       | Purpose                           |
| ------------------------------------------------------------------------------ | --------------------------------- |
| [`README.md`](README.md)                                                       | Overview and quick start          |
| [`docs/LOCAL_SETUP.md`](docs/LOCAL_SETUP.md)                                   | Complete setup guide              |
| [`docs/AI_PROVIDERS.md`](docs/AI_PROVIDERS.md)                                 | Ollama vs Claude                  |
| [`docs/OPTIONAL_SERVICES.md`](docs/OPTIONAL_SERVICES.md)                       | Deployment guides                 |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)                               | Scientific Luxury design system   |
| [`docs/MULTI_AGENT_ARCHITECTURE.md`](docs/MULTI_AGENT_ARCHITECTURE.md)         | Multi-agent workflow specification|
| [`docs/BEADS.md`](docs/BEADS.md)                                               | AI agent memory system            |
| [Claude Code Hooks](https://code.claude.com/docs/en/hooks)                     | Automated workflow hooks          |
| [`docs/new-project-checklist.md`](docs/new-project-checklist.md)               | 3-step setup                      |

## 🔧 Troubleshooting

### Docker Services Not Starting

```bash
# Check Docker is running
docker ps

# Restart services
docker compose down && docker compose up -d

# View logs
docker compose logs -f postgres
```

### Ollama Not Working

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull llama3.1:8b
ollama pull nomic-embed-text

# Start Ollama
ollama serve
```

### Port Conflicts

```bash
# Check what's using ports
lsof -i :3000  # Frontend
lsof -i :8000  # Backend
lsof -i :5432  # PostgreSQL

# Change ports in .env if needed
```

### Dependencies Not Installing

```bash
# Clear and reinstall
rm -rf node_modules apps/*/node_modules
pnpm install

# Backend
cd apps/backend && rm -rf .venv && uv sync
```

## 📝 Environment Variables

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

## 🎓 Learning Resources

**Frameworks**:

- [Next.js Docs](https://nextjs.org/docs) - Frontend
- [FastAPI Docs](https://fastapi.tiangolo.com/) - Backend
- [LangGraph Docs](https://langchain-ai.github.io/langgraph/) - Agents

**Tools**:

- [Ollama Docs](https://ollama.com/) - Local AI
- [PostgreSQL Docs](https://www.postgresql.org/docs/) - Database
- [shadcn/ui](https://ui.shadcn.com/) - UI Components

**Concepts**:

- [JWT Authentication](https://jwt.io/introduction)
- [RAG (Retrieval Augmented Generation)](https://www.pinecone.io/learn/retrieval-augmented-generation/)
- [Vector Embeddings](https://www.pinecone.io/learn/vector-embeddings/)

---

## 🚀 Quick Reference

**Start Development**: `pnpm dev`
**Run Tests**: `pnpm turbo run test`
**Check Health**: `pnpm run verify`
**Reset Database**: `pnpm run docker:reset`

**Default Credentials**: admin@local.dev / admin123

---

**Built for developers who want to build AI apps without barriers** ❤️

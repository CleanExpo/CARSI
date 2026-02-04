# CLAUDE.md - NodeJS-Starter-V1 AI Development Environment

> **AI-Powered Development with Automated Quality Assurance**  
> Next.js 15 + FastAPI/LangGraph + PostgreSQL + Claude Code Integration

## 🎯 Project Identity

This is not just a starter template—it's a **self-governing AI development environment** that combines:

- 🤖 **AI Agent Orchestration** - Multi-agent system with specialized roles
- 🪝 **Claude Code Hooks** - Automated security, quality, and compliance enforcement
- 🏗️ **Builder/Validator Pattern** - Strict quality assurance through paired execution
- 🇦🇺 **Australian Standards** - en-AU spelling, DD/MM/YYYY dates, AUD currency by default

**Key Principle**: *Quality is enforced automatically, not assumed.*

---

## 📋 Quick Commands

### Development
```bash
pnpm dev                    # Start all services
pnpm run verify             # Health check
pnpm plan "Task name"       # Generate Builder/Validator plan
```

### Testing & Quality
```bash
pnpm turbo run test         # All tests
pnpm turbo run lint         # Linting
pnpm turbo run type-check   # Type checking
claude hooks-status         # Check Claude Hooks status
```

### Docker Management
```bash
pnpm run docker:up          # Start PostgreSQL + Redis
pnpm run docker:down        # Stop services
pnpm run docker:reset       # Reset database
```

### Hook Log Analysis
```bash
# View today's logs
cat .claude/logs/security-$(date +%Y-%m-%d).log | jq
cat .claude/logs/quality-$(date +%Y-%m-%d).log | jq
cat .claude/logs/australian-$(date +%Y-%m-%d).log | jq
```

---

## 🏗️ Core Systems

### 1. Claude Code Hooks (Automated Governance)

**What**: Event-driven scripts that validate every action  
**Why**: Catches issues before they become problems  
**How**: Runs automatically at key lifecycle points

#### Security Hooks (Pre-Execution)
| Hook | Triggers | Protection |
|------|----------|------------|
| `security-validator` | Before Bash commands | Blocks `rm -rf /`, `sudo`, destructive ops |
| `protected-files-guardian` | Before file edits | Protects `.env`, secrets, lock files |
| `mcp-validator` | Before MCP tools | Validates memory/database operations |

#### Quality Hooks (Post-Execution)
| Hook | Triggers | Validation |
|------|----------|------------|
| `quality-gate` | After file edits | Type-check, lint, debug detection |
| `australian-compliance` | After file edits | en-AU spelling, DD/MM/YYYY, AUD |
| `post-command-logger` | After commands | Audit trail of all operations |
| `failure-analyzer` | On failures | Smart error analysis with fixes |

#### Session Hooks
| Hook | Triggers | Purpose |
|------|----------|---------|
| `session-bootstrap` | Session start | Initialize context, check environment |
| `subagent-context` | Subagent spawn | Provide agent-specific guidance |
| `notify-permission` | Permission prompts | Desktop notifications |

**Location**: `.claude/hooks/`  
**Documentation**: `.claude/hooks/README.md`

---

### 2. Builder/Validator Pattern (Quality Assurance)

**Core Principle**: Every implementation task MUST have independent verification.

```
Builder → Validator → [Next Builder]
   ↓           ↓
Implement   Verify
   ↓           ↓
Output ───→ Pass/Fail
```

**Golden Rule**: No Builder proceeds until the previous Validator passes.

#### When to Use

**Mandatory**:
- ✅ New feature implementation
- ✅ Refactoring existing code
- ✅ Database migrations
- ✅ API endpoint creation

**Optional**:
- 🟡 Simple bug fixes (< 5 lines)
- 🟡 Documentation-only changes

#### How to Generate Plans

```bash
# Via pnpm (recommended)
pnpm plan "Implement user authentication API"
pnpm plan "Add dark mode toggle" --estimates

# Via PowerShell
Import-Module ./scripts/plan-w-team.ps1
plan_w_team -Task "Refactor database" -IncludeEstimates

# Via Node.js
node scripts/plan-w-team.js "Audit security" --estimates
```

**Output**: `specs/plan.md` with structured Builder/Validator pairs

#### Validation Checklist

**Code Validation**:
- [ ] File exists at expected path
- [ ] Syntax valid (no parse errors)
- [ ] Follows project conventions
- [ ] Barrel exports updated
- [ ] No debug statements left

**Test Validation**:
- [ ] Tests exist for new functionality
- [ ] Tests pass (`pnpm test`, `pytest`)
- [ ] Coverage >80% for new code
- [ ] Edge cases covered

**Integration Validation**:
- [ ] Works with existing systems
- [ ] No breaking changes
- [ ] API contracts maintained

**Documentation Validation**:
- [ ] README updated (if needed)
- [ ] Code comments added (if complex)
- [ ] Deployment notes created (if needed)

**Documentation**: `skills/workflow/BUILDER_VALIDATOR.md`

---

### 3. AI Agent Orchestration

**Orchestrator Agent**: Routes tasks to specialized agents  
**Specialized Agents**: Frontend, Backend, Database, Test, SEO, Verification

#### Agent Types

| Agent | Specialty | Location |
|-------|-----------|----------|
| Frontend | Next.js 15, React 19, Tailwind v4 | `.claude/agents/frontend-specialist/` |
| Backend | FastAPI, LangGraph, Pydantic | `.claude/agents/backend-specialist/` |
| Database | Supabase, PostgreSQL, RLS | `.claude/agents/database-specialist/` |
| Test | Vitest, pytest, Playwright | `.claude/agents/test-engineer/` |
| SEO | Australian search dominance | `.claude/agents/seo-intelligence/` |
| Verification | Independent validation | `.claude/agents/verification/` |

#### Workflow
```
User Request
    ↓
Orchestrator (analyzes, routes)
    ↓
Spawn Specialized Agents (parallel)
    ↓
Collect & Merge Results
    ↓
Independent Verification
    ↓
    ├─→ Pass: Proceed
    └─→ Fail: Iterate (max 3) → Escalate
```

---

## 🔄 Development Workflow

### The Quality-First Development Cycle

```
┌─────────────────────────────────────────────────────────────┐
│  1. PLAN (for complex tasks)                                │
│     pnpm plan "Implement feature X"                         │
│     → Generates specs/plan.md with Builder/Validator pairs  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. IMPLEMENT (Builder phase)                               │
│     - Write code following patterns                         │
│     - Claude Hooks validate automatically                   │
│     - Australian compliance enforced                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. VALIDATE (Validator phase)                              │
│     - Verify implementation meets requirements              │
│     - Run tests, check integration                          │
│     - Update documentation                                  │
│     → If pass: proceed to next Builder                      │
│     → If fail: fix and re-validate                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. COMMIT (all checks pass)                                │
│     pnpm turbo run test lint type-check                     │
│     git add .                                               │
│     git commit -m "feat: description"                       │
└─────────────────────────────────────────────────────────────┘
```

### Step-by-Step Example: Adding a Feature

**Step 1: Generate Plan**
```bash
pnpm plan "Add user profile page with avatar upload"
# Output: specs/plan.md created
```

**Step 2: Review Plan**
```bash
code specs/plan.md
# Review the 4-phase plan with Builder/Validator pairs
```

**Step 3: Execute Phase 1 (Setup)**
```
Phase 1.1 Builder: Create profile page directory structure
→ Hooks auto-check: security, file protection

Phase 1.1 Validator: Verify directories exist
→ Check: ls -la apps/web/app/profile/
→ Result: PASS
```

**Step 4: Execute Phase 2 (Core)**
```
Phase 2.1 Builder: Create profile form component
→ Hooks auto-check: quality, Australian compliance

Phase 2.1 Validator: Verify component renders
→ Check: Component mounts without errors
→ Result: PASS
```

**Step 5: Continue Through All Phases**
- Phase 3: Integration & Testing
- Phase 4: Documentation & Handover

**Step 6: Final Validation**
```bash
pnpm turbo run test lint type-check
# All automated checks pass
```

**Step 7: Commit**
```bash
git add .
git commit -m "feat(profile): Add user profile with avatar upload

- Created profile page with form validation
- Added avatar upload with image processing
- Integrated with user API
- Added comprehensive tests (>80% coverage)
- Updated documentation"
```

---

## 🛡️ Quality Assurance

### Automated Protections

**Security** (Blocks dangerous operations):
- Destructive commands (`rm -rf /`, `sudo`)
- Sensitive file edits (`.env`, private keys)
- Path traversal attacks (`../`)
- Secret exposure in code

**Quality** (Async validation after edits):
- TypeScript type checking
- ESLint/Ruff linting
- Debug statement detection (`console.log`)
- Barrel file export validation
- Error handling pattern checks

**Australian Compliance** (en-AU standards):
- US → AU spelling (color→colour, organize→organise)
- DD/MM/YYYY date format
- AUD currency specification
- Australia/Brisbane timezone
- 'en-AU' locale formatting

### Interpreting Hook Feedback

**Security Warning** (Yellow):
```
⚠️  Warning: Force push detected - can overwrite remote history
Action: Review before proceeding (hook allows but warns)
```

**Quality Issue** (Red):
```
❌ TypeScript errors found:
   apps/web/components/Profile.tsx:15 - Type 'string' not assignable to type 'number'
Action: Fix errors before continuing
```

**Australian Compliance Note** (Blue):
```
🇦🇺 US spelling 'color' found - use Australian 'colour'
Action: Update spelling to match project standards
```

---

## 📂 Project Structure

```
NodeJS-Starter-V1/
├── apps/
│   ├── web/                    # Next.js Frontend
│   └── backend/                # Python Backend
├── .claude/                    # Claude Code Integration
│   ├── hooks/                  # 11 automated hooks
│   │   ├── security-validator.sh
│   │   ├── quality-gate.sh
│   │   ├── australian-compliance.sh
│   │   └── README.md
│   ├── agents/                 # Specialized AI agents
│   │   ├── orchestrator/
│   │   ├── frontend-specialist/
│   │   ├── backend-specialist/
│   │   └── database-specialist/
│   ├── settings.json           # Hooks configuration
│   └── logs/                   # Hook execution logs
├── skills/                     # Agent skills library
│   └── workflow/
│       └── BUILDER_VALIDATOR.md
├── scripts/
│   ├── plan-w-team.js         # Builder/Validator CLI
│   ├── plan-w-team.ps1        # PowerShell module
│   ├── setup.sh
│   └── verify.sh
├── specs/                      # Generated execution plans
│   └── plan.md
├── docs/                       # Documentation
├── docker-compose.yml         # PostgreSQL + Redis
└── package.json
```

---

## 🏗️ Architecture Overview

### Frontend (Next.js 15)
**Location**: `apps/web/`
- Next.js 15 with App Router
- React 19 with Server Components
- Tailwind CSS v4 + design tokens
- shadcn/ui components
- JWT authentication (cookie-based)

### Backend (FastAPI + LangGraph)
**Location**: `apps/backend/`
- FastAPI async framework
- LangGraph agent orchestration
- SQLAlchemy 2.0 ORM
- JWT authentication with bcrypt
- Dual AI providers (Ollama + Claude)

### Database (PostgreSQL 15)
**Location**: Docker Compose
- PostgreSQL 15 with pgvector extension
- Redis 7 for caching
- Auto-migrations on startup
- Persistent volumes

---

## 🚨 Escalation Criteria

Escalate to human when:

1. **Builder fails 3 times** on same task
   - Unclear requirements
   - Architectural decision needed

2. **Validator fails 3 times** on same check
   - Systemic issue detected
   - Approach needs rethinking

3. **Unclear requirements**
   - Don't proceed with assumptions
   - Request clarification first

4. **Breaking changes detected**
   - Pause and assess impact
   - Get approval before proceeding

---

## 🔧 Troubleshooting

### Hook Issues

**Hooks not firing:**
```bash
# Check JSON syntax
jq . .claude/settings.json

# Verify jq installed
which jq
```

**Disable hooks temporarily:**
```json
// .claude/settings.local.json
{
  "disableAllHooks": true
}
```

**View hook logs:**
```bash
# Security events
cat .claude/logs/security-$(date +%Y-%m-%d).log | jq

# Quality checks
cat .claude/logs/quality-$(date +%Y-%m-%d).log | jq

# Australian compliance
cat .claude/logs/australian-$(date +%Y-%m-%d).log | jq
```

### Builder/Validator Issues

**Validation keeps failing:**
- Check specific validation criteria in `specs/plan.md`
- Ensure you're not self-validating (independent verification required)
- Escalate after 3 failures

**Plan generation fails:**
```bash
# Check Node.js version
node --version  # Requires 16+

# Check PowerShell version (Windows)
$PSVersionTable.PSVersion  # Requires 5.1+
```

### Common Errors

**"Permission denied" on hooks (Unix):**
```bash
chmod +x .claude/hooks/*.sh
```

**"Module not found" for plan-w-team:**
```bash
# Ensure you're in project root
pwd  # Should show .../NodeJS-Starter-V1

# Use full path
node ./scripts/plan-w-team.js "Your task"
```

---

## 📚 Documentation Index

| Document | Purpose |
|----------|---------|
| [`README.md`](README.md) | Overview and quick start |
| [`CLAUDE-HOOKS-IMPLEMENTATION.md`](CLAUDE-HOOKS-IMPLEMENTATION.md) | Hooks implementation details |
| [`BUILDER_VALIDATOR_IMPLEMENTATION.md`](BUILDER_VALIDATOR_IMPLEMENTATION.md) | Builder/Validator pattern guide |
| [`.claude/hooks/README.md`](.claude/hooks/README.md) | Hook development guide |
| [`skills/workflow/BUILDER_VALIDATOR.md`](skills/workflow/BUILDER_VALIDATOR.md) | Agent skill definition |
| [`docs/LOCAL_SETUP.md`](docs/LOCAL_SETUP.md) | Environment setup |
| [`docs/AI_PROVIDERS.md`](docs/AI_PROVIDERS.md) | Ollama vs Claude configuration |

---

## 🎯 Key Principles

### 1. Automated Quality
Quality is enforced by hooks, not assumed. Every edit is validated.

### 2. Strict Builder/Validator
No self-attestation. Every implementation has independent verification.

### 3. Australian Standards
en-AU spelling, DD/MM/YYYY dates, AUD currency by default.

### 4. Local-First
Everything runs locally. No cloud required for development.

### 5. Zero Barriers
No API keys needed to start. Sensible defaults included.

### 6. Production Ready
Real authentication, testing, CI/CD, and monitoring included.

---

## 🚀 Quick Reference

**Start Development**: `pnpm dev`  
**Generate Plan**: `pnpm plan "Task description"`  
**Run Tests**: `pnpm turbo run test`  
**Check Hooks**: `claude hooks-status`  
**View Logs**: `cat .claude/logs/security-$(date +%Y-%m-%d).log | jq`  
**Verify Setup**: `pnpm run verify`  
**Reset Database**: `pnpm run docker:reset`

**Default Credentials**: admin@local.dev / admin123

---

**Built for developers who demand quality without barriers** ❤️🇦🇺

*Last Updated: 2025-02-04 | Version: 2.0.0*

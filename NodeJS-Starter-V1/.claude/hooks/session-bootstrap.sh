#!/bin/bash
# =============================================================================
# Session Bootstrap Hook for NodeJS-Starter-V1
# SessionStart hook - Initializes project context
# =============================================================================
# This hook runs when a Claude Code session starts, loading project context,
# checking environment, and displaying relevant information.
# =============================================================================

# Read JSON input from stdin
INPUT=$(cat)

# Extract data
SOURCE=$(echo "$INPUT" | jq -r '.source // empty')
MODEL=$(echo "$INPUT" | jq -r '.model // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# Configuration
PROJECT_DIR="${CLAUDE_PROJECT_DIR}"
LOG_FILE="${PROJECT_DIR}/.claude/logs/sessions-$(date +%Y-%m-%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

# Log session start
TIMESTAMP=$(date -Iseconds 2>/dev/null || date "+%Y-%m-%dT%H:%M:%S")
echo "{\"timestamp\":\"$TIMESTAMP\",\"session_id\":\"$SESSION_ID\",\"source\":\"$SOURCE\",\"model\":\"$MODEL\",\"event\":\"session_start\"}" >> "$LOG_FILE"

# Initialize context output
CONTEXT=""

# =============================================================================
# PROJECT INFO
# =============================================================================

CONTEXT+="🚀 NodeJS-Starter-V1 Session Initialized\n"
CONTEXT+="=====================================\n\n"

# Check project structure
if [ -f "$PROJECT_DIR/package.json" ]; then
    PROJECT_NAME=$(jq -r '.name // "unknown"' "$PROJECT_DIR/package.json" 2>/dev/null)
    PROJECT_VERSION=$(jq -r '.version // "unknown"' "$PROJECT_DIR/package.json" 2>/dev/null)
    CONTEXT+="📦 Project: $PROJECT_NAME v$PROJECT_VERSION\n"
fi

# Check for turborepo
if [ -f "$PROJECT_DIR/turbo.json" ]; then
    CONTEXT+="⚡ Turborepo monorepo detected\n"
fi

CONTEXT+="\n"

# =============================================================================
# ENVIRONMENT STATUS
# =============================================================================

CONTEXT+="🔧 Environment Status:\n"

# Check Node.js
if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version 2>/dev/null)
    CONTEXT+="   ✅ Node.js: $NODE_VERSION\n"
else
    CONTEXT+="   ❌ Node.js: Not installed\n"
fi

# Check pnpm
if command -v pnpm &>/dev/null; then
    PNPM_VERSION=$(pnpm --version 2>/dev/null)
    CONTEXT+="   ✅ pnpm: $PNPM_VERSION\n"
else
    CONTEXT+="   ❌ pnpm: Not installed\n"
fi

# Check Docker
if command -v docker &>/dev/null; then
    if docker ps &>/dev/null; then
        CONTEXT+="   ✅ Docker: Running\n"
    else
        CONTEXT+="   ⚠️  Docker: Installed but not running\n"
    fi
else
    CONTEXT+="   ⚠️  Docker: Not installed\n"
fi

# Check Supabase CLI
if command -v supabase &>/dev/null; then
    CONTEXT+="   ✅ Supabase CLI: Installed\n"
else
    CONTEXT+="   ⚠️  Supabase CLI: Not installed\n"
fi

# Check Python/uv for backend
if [ -d "$PROJECT_DIR/apps/backend" ]; then
    if command -v uv &>/dev/null; then
        CONTEXT+="   ✅ uv (Python): Installed\n"
    else
        CONTEXT+="   ⚠️  uv (Python): Not installed\n"
    fi
fi

CONTEXT+="\n"

# =============================================================================
# PROJECT STATUS
# =============================================================================

CONTEXT+="📊 Project Status:\n"

# Check node_modules
if [ -d "$PROJECT_DIR/node_modules" ]; then
    CONTEXT+="   ✅ Dependencies installed\n"
else
    CONTEXT+="   ⚠️  Dependencies not installed - Run: pnpm install\n"
fi

# Check .env files
ENV_FILES=0
[ -f "$PROJECT_DIR/.env" ] && ((ENV_FILES++))
[ -f "$PROJECT_DIR/apps/web/.env.local" ] && ((ENV_FILES++))
[ -f "$PROJECT_DIR/apps/backend/.env" ] && ((ENV_FILES++))

if [ $ENV_FILES -ge 2 ]; then
    CONTEXT+="   ✅ Environment files configured\n"
else
    CONTEXT+="   ⚠️  Environment files missing - Copy from .env.example\n"
fi

# Check git status
if [ -d "$PROJECT_DIR/.git" ]; then
    BRANCH=$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null)
    if [ -n "$BRANCH" ]; then
        CONTEXT+="   🌿 Git branch: $BRANCH\n"
    fi
    
    # Check for uncommitted changes
    if git -C "$PROJECT_DIR" diff --quiet 2>/dev/null && git -C "$PROJECT_DIR" diff --cached --quiet 2>/dev/null; then
        CONTEXT+="   ✅ Working directory clean\n"
    else
        CONTEXT+="   ⚠️  Uncommitted changes present\n"
    fi
fi

CONTEXT+="\n"

# =============================================================================
# ACTIVE HOOKS
# =============================================================================

if [ -f "$PROJECT_DIR/.claude/settings.json" ]; then
    HOOK_COUNT=$(jq '.hooks | keys | length' "$PROJECT_DIR/.claude/settings.json" 2>/dev/null || echo "0")
    CONTEXT+="🪝 Active Claude Hooks: $HOOK_COUNT event types configured\n"
    CONTEXT+="   • Security validation (PreToolUse)\n"
    CONTEXT+="   • Quality gates (PostToolUse)\n"
    CONTEXT+="   • Australian compliance (PostToolUse)\n"
    CONTEXT+="   • Task completeness (Stop)\n"
    CONTEXT+="\n"
fi

# =============================================================================
# QUICK COMMANDS
# =============================================================================

CONTEXT+="⌨️  Quick Commands:\n"
CONTEXT+="   pnpm dev              - Start all services\n"
CONTEXT+="   pnpm turbo run build  - Build all packages\n"
CONTEXT+="   pnpm turbo run test   - Run all tests\n"
CONTEXT+="   claude hooks-status   - Check hooks status\n"
CONTEXT+="\n"

# =============================================================================
# PROGRESS TRACKING
# =============================================================================

if [ -f "$PROJECT_DIR/PROGRESS.md" ]; then
    # Extract summary from PROGRESS.md if it exists
    PROGRESS_SUMMARY=$(head -50 "$PROJECT_DIR/PROGRESS.md" 2>/dev/null | grep -E "^#{1,2} " | head -5)
    if [ -n "$PROGRESS_SUMMARY" ]; then
        CONTEXT+="📈 Latest Progress:\n"
        CONTEXT+="$PROGRESS_SUMMARY\n"
        CONTEXT+="\n"
    fi
fi

CONTEXT+="=====================================\n"
CONTEXT+"Ready to code! 🇦🇺\n"

# Output context for Claude
jq -n \
    --arg context "$CONTEXT" \
    '{
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": $context
        }
    }'

exit 0

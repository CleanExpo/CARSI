#!/bin/bash
# =============================================================================
# Subagent Context Hook for NodeJS-Starter-V1
# SubagentStart hook - Injects context for specialized agents
# =============================================================================
# This hook provides relevant context when subagents are spawned based on their
# agent type (frontend, backend, database, etc.)
# =============================================================================

# Read JSON input from stdin
INPUT=$(cat)

# Extract data
AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // empty')
AGENT_ID=$(echo "$INPUT" | jq -r '.agent_id // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# Exit if no agent type
if [ -z "$AGENT_TYPE" ]; then
    exit 0
fi

# Configuration
PROJECT_DIR="${CLAUDE_PROJECT_DIR}"
LOG_FILE="${PROJECT_DIR}/.claude/logs/subagents-$(date +%Y-%m-%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

# Log subagent start
TIMESTAMP=$(date -Iseconds 2>/dev/null || date "+%Y-%m-%dT%H:%M:%S")
echo "{\"timestamp\":\"$TIMESTAMP\",\"session_id\":\"$SESSION_ID\",\"agent_id\":\"$AGENT_ID\",\"agent_type\":\"$AGENT_TYPE\",\"event\":\"subagent_start\"}" >> "$LOG_FILE"

# Initialize context
CONTEXT=""

# =============================================================================
# AGENT-SPECIFIC CONTEXT
# =============================================================================

case "$AGENT_TYPE" in
    "frontend"|"frontend-specialist")
        CONTEXT+="🎨 Frontend Agent Context:\n"
        CONTEXT+="   • Framework: Next.js 15 with App Router\n"
        CONTEXT+="   • Styling: Tailwind CSS v4, shadcn/ui components\n"
        CONTEXT+="   • Language: TypeScript with strict mode\n"
        CONTEXT+="   • Location: apps/web/\n"
        CONTEXT+="   • Components: Use @/components/ui for shadcn\n"
        CONTEXT+="   • Icons: Custom AI-generated (NO Lucide)\n"
        CONTEXT+="   • Australian: en-AU spelling, DD/MM/YYYY dates\n"
        CONTEXT+="   • Required states: loading, error, empty, success\n"
        CONTEXT+="   • Pattern: async/await with try/catch in API calls\n"
        
        # Check for AGENTS.md
        if [ -f "$PROJECT_DIR/apps/web/AGENTS.md" ]; then
            CONTEXT+="\n   📄 See: apps/web/AGENTS.md for detailed patterns\n"
        fi
        ;;
    
    "backend"|"backend-specialist")
        CONTEXT+="⚙️ Backend Agent Context:\n"
        CONTEXT+="   • Framework: FastAPI with async/await\n"
        CONTEXT+="   • Validation: Pydantic models\n"
        CONTEXT+="   • Agents: LangGraph for agent orchestration\n"
        CONTEXT+="   • Location: apps/backend/src/\n"
        CONTEXT+="   • Pattern: API → Service → Repository → Database\n"
        CONTEXT+="   • Error handling: Custom AppError classes\n"
        CONTEXT+="   • Type hints: Required on all functions\n"
        CONTEXT+="   • Testing: pytest with async support\n"
        
        if [ -f "$PROJECT_DIR/apps/backend/AGENTS.md" ]; then
            CONTEXT+="\n   📄 See: apps/backend/AGENTS.md for detailed patterns\n"
        fi
        ;;
    
    "database"|"database-specialist")
        CONTEXT+="🗄️ Database Agent Context:\n"
        CONTEXT+="   • Platform: Supabase (PostgreSQL)\n"
        CONTEXT+="   • Security: Row Level Security (RLS) required\n"
        CONTEXT+="   • Migrations: supabase/migrations/\n"
        CONTEXT+="   • Pattern: migrations are immutable after push\n"
        CONTEXT+="   • Types: Auto-generated from database\n"
        CONTEXT+="   • Relationships: Define foreign keys with actions\n"
        CONTEXT+="   • Indexes: Add for frequently queried columns\n"
        
        if [ -f "$PROJECT_DIR/supabase/AGENTS.md" ]; then
            CONTEXT+="\n   📄 See: supabase/AGENTS.md for migration patterns\n"
        fi
        ;;
    
    "test"|"test-engineer")
        CONTEXT+="🧪 Test Agent Context:\n"
        CONTEXT+="   • Frontend: Vitest + React Testing Library\n"
        CONTEXT+="   • Backend: pytest with async support\n"
        CONTEXT+="   • E2E: Playwright tests\n"
        CONTEXT+="   • Pattern: Arrange → Act → Assert\n"
        CONTEXT+="   • Coverage: Aim for 80%+ on critical paths\n"
        CONTEXT+="   • Naming: describe/it blocks with clear intent\n"
        ;;
    
    "seo"|"seo-intelligence")
        CONTEXT+="🔍 SEO Agent Context:\n"
        CONTEXT+="   • Focus: Australian search dominance\n"
        CONTEXT+="   • Technical: Core Web Vitals, structured data\n"
        CONTEXT+="   • Content: Truth-verified with citations\n"
        CONTEXT+="   • URLs: Semantic slugs with keywords\n"
        CONTEXT+="   • Meta: Unique titles/descriptions per page\n"
        CONTEXT+="   • Mobile: Responsive, fast loading\n"
        ;;
    
    "verify"|"verification")
        CONTEXT+="✅ Verification Agent Context:\n"
        CONTEXT+="   • Role: Independent, evidence-based verification\n"
        CONTEXT+="   • NO self-attestation of quality\n"
        CONTEXT+="   • Check: Functionality, security, performance\n"
        CONTEXT+="   • Evidence: Screenshots, logs, test results\n"
        CONTEXT+="   • Standards: Australian compliance, WCAG 2.1\n"
        ;;
    
    "code-reviewer"|"review")
        CONTEXT+="👀 Code Review Agent Context:\n"
        CONTEXT+="   • Focus: Quality, security, maintainability\n"
        CONTEXT+="   • Check: Type safety, error handling, tests\n"
        CONTEXT+="   • Architecture: Layer violations, imports\n"
        CONTEXT+="   • Performance: Async patterns, memoization\n"
        CONTEXT+="   • Australian: en-AU spelling, local formats\n"
        ;;
    
    *)
        # Generic context for unknown agent types
        CONTEXT+="🤖 Agent Context ($AGENT_TYPE):\n"
        CONTEXT+="   • Project: NodeJS-Starter-V1 monorepo\n"
        CONTEXT+="   • Architecture: Foundation-first, strict typing\n"
        CONTEXT+="   • Verification: Required before completion\n"
        CONTEXT+="   • Australian: en-AU standards compliance\n"
        ;;
esac

CONTEXT+="\n💡 Tip: Use 'claude verify' to check work before finishing\n"

# Output context
jq -n \
    --arg context "$CONTEXT" \
    '{
        "hookSpecificOutput": {
            "hookEventName": "SubagentStart",
            "additionalContext": $context
        }
    }'

exit 0

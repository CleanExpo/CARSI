#!/bin/bash
# =============================================================================
# Failure Analyzer Hook for NodeJS-Starter-V1
# PostToolUseFailure hook for Bash commands - Analyzes command failures
# =============================================================================
# This hook analyzes failed commands and provides context for recovery.
# =============================================================================

# Read JSON input from stdin
INPUT=$(cat)

# Extract data from input
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // empty')
ERROR=$(echo "$INPUT" | jq -r '.error // empty')
IS_INTERRUPT=$(echo "$INPUT" | jq -r '.is_interrupt // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# Exit if interrupted by user
if [ "$IS_INTERRUPT" == "true" ]; then
    exit 0
fi

# Configuration
LOG_FILE="${CLAUDE_PROJECT_DIR}/.claude/logs/failures-$(date +%Y-%m-%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

# Extract command
COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // empty')

# Exit if no command
if [ -z "$COMMAND" ]; then
    exit 0
fi

# Function to log failure
log_failure() {
    local category="$1"
    local suggestion="$2"
    local timestamp=$(date -Iseconds 2>/dev/null || date "+%Y-%m-%dT%H:%M:%S")
    
    echo "{\"timestamp\":\"$timestamp\",\"session_id\":\"$SESSION_ID\",\"category\":\"$category\",\"command\":\"$(echo "$COMMAND" | sed 's/"/\\"/g')\",\"error\":\"$(echo "$ERROR" | sed 's/"/\\"/g')\",\"suggestion\":\"$suggestion\"}" >> "$LOG_FILE"
}

# Analyze error patterns and suggest fixes
SUGGESTIONS=()

# Check for common error patterns
if echo "$ERROR" | grep -qiE "command not found|No such file or directory"; then
    # Command or file not found
    if echo "$COMMAND" | grep -qE "npm|pnpm|yarn"; then
        SUGGESTIONS+=("📦 Package manager command failed. Try:")
        SUGGESTIONS+=("   - Check if node_modules exists: ls node_modules")
        SUGGESTIONS+=("   - Install dependencies: pnpm install")
        SUGGESTIONS+=("   - Check package.json exists in current directory")
    elif echo "$COMMAND" | grep -qE "supabase"; then
        SUGGESTIONS+=("🗄️ Supabase CLI command failed. Try:")
        SUGGESTIONS+=("   - Verify Supabase CLI is installed: supabase --version")
        SUGGESTIONS+=("   - Check if you're in the project root directory")
        SUGGESTIONS+=("   - Verify supabase/config.toml exists")
    elif echo "$COMMAND" | grep -qE "docker"; then
        SUGGESTIONS+=("🐳 Docker command failed. Try:")
        SUGGESTIONS+=("   - Check Docker is running: docker ps")
        SUGGESTIONS+=("   - Verify docker-compose.yml exists")
    elif echo "$COMMAND" | grep -qE "uv|python"; then
        SUGGESTIONS+=("🐍 Python/uv command failed. Try:")
        SUGGESTIONS+=("   - Check Python version: python --version")
        SUGGESTIONS+=("   - Verify virtual environment: uv venv")
        SUGGESTIONS+=("   - Install dependencies: uv sync")
    elif echo "$COMMAND" | grep -qE "git"; then
        SUGGESTIONS+=("🌿 Git command failed. Try:")
        SUGGESTIONS+=("   - Check git repository: git status")
        SUGGESTIONS+=("   - Verify branch exists: git branch -a")
    fi
    
    log_failure "NOT_FOUND" "${SUGGESTIONS[0]}"
    
elif echo "$ERROR" | grep -qiE "permission denied|Permission denied|EACCES"; then
    SUGGESTIONS+=("🔒 Permission denied. Try:")
    SUGGESTIONS+=("   - Check file permissions: ls -la")
    SUGGESTIONS+=("   - Make script executable: chmod +x <script>")
    SUGGESTIONS+=("   - Check directory ownership")
    
    log_failure "PERMISSION" "${SUGGESTIONS[0]}"
    
elif echo "$ERROR" | grep -qiE "port.*already in use|EADDRINUSE|address already in use"; then
    SUGGESTIONS+=("🔌 Port already in use. Try:")
    SUGGESTIONS+=("   - Find process using port: lsof -i :<port>")
    SUGGESTIONS+=("   - Kill process: kill -9 <PID>")
    SUGGESTIONS+=("   - Use different port in .env file")
    
    log_failure "PORT_IN_USE" "${SUGGESTIONS[0]}"
    
elif echo "$ERROR" | grep -qiE "Module not found|Cannot find module|ImportError|ModuleNotFoundError"; then
    if echo "$COMMAND" | grep -qE "node|npm|pnpm"; then
        SUGGESTIONS+=("📦 Node.js module not found. Try:")
        SUGGESTIONS+=("   - Install dependencies: pnpm install")
        SUGGESTIONS+=("   - Check import path is correct")
        SUGGESTIONS+=("   - Verify module exists in package.json")
    else
        SUGGESTIONS+=("🐍 Python module not found. Try:")
        SUGGESTIONS+=("   - Install dependencies: uv sync")
        SUGGESTIONS+=("   - Check import statement")
        SUGGESTIONS+=("   - Verify module in pyproject.toml")
    fi
    
    log_failure "MODULE_NOT_FOUND" "${SUGGESTIONS[0]}"
    
elif echo "$ERROR" | grep -qiE "timeout|ETIMEDOUT|timed out"; then
    SUGGESTIONS+=("⏱️ Command timed out. Try:")
    SUGGESTIONS+=("   - Increase timeout value")
    SUGGESTIONS+=("   - Check network connectivity")
    SUGGESTIONS+=("   - Verify external services are running")
    
    log_failure "TIMEOUT" "${SUGGESTIONS[0]}"
    
elif echo "$ERROR" | grep -qiE "connection refused|ECONNREFUSED|cannot connect"; then
    SUGGESTIONS+=("🔌 Connection refused. Try:")
    SUGGESTIONS+=("   - Check if service is running: docker ps")
    SUGGESTIONS+=("   - Verify port configuration in .env")
    SUGGESTIONS+=("   - Start services: pnpm dev or docker compose up")
    
    log_failure "CONNECTION_REFUSED" "${SUGGESTIONS[0]}"
    
elif echo "$ERROR" | grep -qiE "syntax error|SyntaxError|ParseError"; then
    SUGGESTIONS+=("📝 Syntax error detected. Try:")
    SUGGESTIONS+=("   - Check for missing brackets, quotes, or semicolons")
    SUGGESTIONS+=("   - Run type-check: pnpm turbo run type-check")
    SUGGESTIONS+=("   - Check file encoding is UTF-8")
    
    log_failure "SYNTAX_ERROR" "${SUGGESTIONS[0]}"
    
elif echo "$ERROR" | grep -qiE "test.*fail|FAILED|AssertionError"; then
    SUGGESTIONS+=("🧪 Tests failed. Try:")
    SUGGESTIONS+=("   - Run tests with verbose output: pnpm test -- --verbose")
    SUGGESTIONS+=("   - Check specific failing test file")
    SUGGESTIONS+=("   - Update snapshots if intentional: pnpm test -- -u")
    
    log_failure "TEST_FAILURE" "${SUGGESTIONS[0]}"
    
elif echo "$ERROR" | grep -qiE "lint.*error|ESLint|prettier"; then
    SUGGESTIONS+=("🔍 Linting errors found. Try:")
    SUGGESTIONS+=("   - Auto-fix issues: pnpm turbo run lint:fix")
    SUGGESTIONS+=("   - Check specific file mentioned in error")
    SUGGESTIONS+=("   - Run prettier: pnpm format")
    
    log_failure "LINT_ERROR" "${SUGGESTIONS[0]}"
    
else
    # Generic error
    SUGGESTIONS+=("❓ Command failed with error: $ERROR")
    SUGGESTIONS+=("   - Check command syntax and arguments")
    SUGGESTIONS+=("   - Verify all prerequisites are met")
    SUGGESTIONS+=("   - Check logs for more details")
    
    log_failure "UNKNOWN" "Generic error"
fi

# Output suggestions if any
if [ ${#SUGGESTIONS[@]} -gt 0 ]; then
    OUTPUT="\n❌ Command Failed: $ERROR\n\n💡 Suggestions:\n"
    for suggestion in "${SUGGESTIONS[@]}"; do
        OUTPUT+="$suggestion\n"
    done
    
    jq -n \
        --arg output "$OUTPUT" \
        '{
            "hookSpecificOutput": {
                "hookEventName": "PostToolUseFailure",
                "additionalContext": $output
            }
        }'
    exit 0
fi

exit 0

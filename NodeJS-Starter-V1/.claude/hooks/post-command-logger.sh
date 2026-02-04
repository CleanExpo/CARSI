#!/bin/bash
# =============================================================================
# Post-Command Logger Hook for NodeJS-Starter-V1
# PostToolUse hook for Bash commands - Logs command execution
# =============================================================================
# This hook logs command execution for audit purposes and provides context
# for future reference.
# =============================================================================

# Read JSON input from stdin
INPUT=$(cat)

# Extract data from input
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // empty')
TOOL_RESPONSE=$(echo "$INPUT" | jq -r '.tool_response // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# Exit early if not Bash
if [ "$TOOL_NAME" != "Bash" ]; then
    exit 0
fi

# Configuration
LOG_FILE="${CLAUDE_PROJECT_DIR}/.claude/logs/commands-$(date +%Y-%m-%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

# Extract command details
COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // empty')
DESCRIPTION=$(echo "$TOOL_INPUT" | jq -r '.description // empty')
TIMEOUT=$(echo "$TOOL_INPUT" | jq -r '.timeout // empty')

# Exit if no command
if [ -z "$COMMAND" ]; then
    exit 0
fi

# Truncate very long commands for logging
if [ ${#COMMAND} -gt 200 ]; then
    LOG_COMMAND="${COMMAND:0:197}..."
else
    LOG_COMMAND="$COMMAND"
fi

# Determine command category
categorize_command() {
    local cmd="$1"
    
    if echo "$cmd" | grep -qE '^\s*git\s'; then
        echo "git"
    elif echo "$cmd" | grep -qE '^\s*(npm|pnpm|yarn)\s'; then
        echo "package"
    elif echo "$cmd" | grep -qE '^\s*docker\s'; then
        echo "docker"
    elif echo "$cmd" | grep -qE '^\s*supabase\s'; then
        echo "supabase"
    elif echo "$cmd" | grep -qE '^\s*(uv|pip|python)\s'; then
        echo "python"
    elif echo "$cmd" | grep -qE '^\s*(mkdir|touch|rm|cp|mv|chmod|chown)\s'; then
        echo "filesystem"
    elif echo "$cmd" | grep -qE '^\s*(cat|grep|find|ls|echo)\s'; then
        echo "utility"
    elif echo "$cmd" | grep -qE '^\s*curl\s|^\s*wget\s'; then
        echo "network"
    else
        echo "other"
    fi
}

CATEGORY=$(categorize_command "$COMMAND")

# Create log entry
TIMESTAMP=$(date -Iseconds 2>/dev/null || date "+%Y-%m-%dT%H:%M:%S")

# Build JSON log entry
log_entry=$(jq -n \
    --arg timestamp "$TIMESTAMP" \
    --arg session_id "$SESSION_ID" \
    --arg category "$CATEGORY" \
    --arg command "$LOG_COMMAND" \
    --arg description "$DESCRIPTION" \
    --arg cwd "$CWD" \
    '{
        timestamp: $timestamp,
        session_id: $session_id,
        category: $category,
        command: $command,
        description: $description,
        cwd: $cwd
    }')

# Append to log file
echo "$log_entry" >> "$LOG_FILE"

# Silent success
exit 0

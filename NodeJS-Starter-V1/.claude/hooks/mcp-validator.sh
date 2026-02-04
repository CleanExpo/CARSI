#!/bin/bash
# =============================================================================
# MCP Validator Hook for NodeJS-Starter-V1
# PreToolUse hook for MCP tool operations - Validates MCP write operations
# =============================================================================
# This hook logs and validates MCP tool operations, especially write operations
# to memory and external services.
# =============================================================================

# Read JSON input from stdin
INPUT=$(cat)

# Extract data from input
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# Exit early if not an MCP tool
if [[ ! "$TOOL_NAME" =~ ^mcp__ ]]; then
    exit 0
fi

# Configuration
LOG_FILE="${CLAUDE_PROJECT_DIR}/.claude/logs/mcp-$(date +%Y-%m-%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

# Extract MCP server and tool name
# Format: mcp__<server>__<tool>
MCP_SERVER=$(echo "$TOOL_NAME" | sed 's/mcp__//;s/__.*//')
MCP_TOOL=$(echo "$TOOL_NAME" | sed 's/mcp__[^_]*__//')

# Function to log MCP events
log_mcp_event() {
    local level="$1"
    local message="$2"
    local timestamp=$(date -Iseconds 2>/dev/null || date "+%Y-%m-%dT%H:%M:%S")
    
    echo "{\"timestamp\":\"$timestamp\",\"session_id\":\"$SESSION_ID\",\"level\":\"$level\",\"mcp_server\":\"$MCP_SERVER\",\"mcp_tool\":\"$MCP_TOOL\",\"message\":\"$message\"}" >> "$LOG_FILE"
}

# Log the MCP operation
log_mcp_event "INFO" "MCP operation initiated"

# Validate based on MCP server
case "$MCP_SERVER" in
    "memory")
        # Memory operations - validate write operations
        if [[ "$MCP_TOOL" =~ ^(create|update|delete|store) ]]; then
            # Check for large data writes
            INPUT_SIZE=$(echo "$TOOL_INPUT" | wc -c)
            if [ "$INPUT_SIZE" -gt 10000 ]; then
                log_mcp_event "WARNING" "Large memory write operation ($INPUT_SIZE bytes)"
                
                jq -n \
                    --arg size "$INPUT_SIZE" \
                    '{
                        "hookSpecificOutput": {
                            "hookEventName": "PreToolUse",
                            "permissionDecision": "allow",
                            "permissionDecisionReason": "Large memory write detected",
                            "additionalContext": "Large data write to memory ($size bytes). Ensure this is intentional and not accidental storage of large files."
                        }
                    }'
                exit 0
            fi
        fi
        
        # Check for deletion operations
        if [[ "$MCP_TOOL" =~ ^(delete|clear|remove) ]]; then
            log_mcp_event "WARNING" "Memory deletion operation"
            
            jq -n \
                '{
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "ask",
                        "permissionDecisionReason": "Memory deletion operation detected. This will permanently remove stored data."
                    }
                }'
            exit 0
        fi
        ;;
    
    "github")
        # GitHub operations - validate write operations
        if [[ "$MCP_TOOL" =~ ^(create|update|delete|merge|push) ]]; then
            log_mcp_event "WARNING" "GitHub write operation: $MCP_TOOL"
            
            # Check for destructive operations
            if [[ "$MCP_TOOL" =~ ^(delete|remove|close) ]]; then
                jq -n \
                    --arg tool "$MCP_TOOL" \
                    '{
                        "hookSpecificOutput": {
                            "hookEventName": "PreToolUse",
                            "permissionDecision": "ask",
                            "permissionDecisionReason": "Destructive GitHub operation detected. This may affect remote repositories."
                        }
                    }'
                exit 0
            fi
        fi
        ;;
    
    "filesystem")
        # Filesystem MCP operations - similar validation to Write/Edit
        if [[ "$MCP_TOOL" =~ ^(write|edit|delete|move) ]]; then
            # Extract file path from input
            FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.path // .file_path // empty')
            
            if [ -n "$FILE_PATH" ]; then
                # Check for protected files
                if echo "$FILE_PATH" | grep -qE '\.(env|key|pem|p12|pfx)$|secrets|credentials'; then
                    log_mcp_event "CRITICAL" "Attempt to modify sensitive file via MCP: $FILE_PATH"
                    
                    jq -n \
                        --arg file "$FILE_PATH" \
                        '{
                            "hookSpecificOutput": {
                                "hookEventName": "PreToolUse",
                                "permissionDecision": "ask",
                                "permissionDecisionReason": "Attempting to modify sensitive file via MCP filesystem. Ensure this is intentional."
                            }
                        }'
                    exit 0
                fi
                
                # Check for deletion operations
                if [[ "$MCP_TOOL" =~ ^(delete|remove) ]]; then
                    log_mcp_event "WARNING" "File deletion via MCP: $FILE_PATH"
                    
                    jq -n \
                        --arg file "$FILE_PATH" \
                        '{
                            "hookSpecificOutput": {
                                "hookEventName": "PreToolUse",
                                "permissionDecision": "ask",
                                "permissionDecisionReason": "File deletion via MCP filesystem. This operation cannot be undone."
                            }
                        }'
                    exit 0
                fi
            fi
        fi
        ;;
    
    "postgres"|"database")
        # Database operations
        if [[ "$MCP_TOOL" =~ ^(query|execute) ]]; then
            # Extract query from input
            QUERY=$(echo "$TOOL_INPUT" | jq -r '.query // .sql // empty')
            
            if [ -n "$QUERY" ]; then
                # Check for destructive SQL operations
                if echo "$QUERY" | grep -qiE '^\s*(DROP|DELETE|TRUNCATE|ALTER\s+TABLE\s+.*DROP)'; then
                    log_mcp_event "CRITICAL" "Destructive database operation detected"
                    
                    jq -n \
                        '{
                            "hookSpecificOutput": {
                                "hookEventName": "PreToolUse",
                                "permissionDecision": "ask",
                                "permissionDecisionReason": "Destructive database operation (DROP/DELETE/TRUNCATE) detected. This may result in data loss."
                            }
                        }'
                    exit 0
                fi
                
                # Check for write operations
                if echo "$QUERY" | grep -qiE '^\s*(INSERT|UPDATE|DELETE)'; then
                    log_mcp_event "WARNING" "Database write operation"
                    
                    jq -n \
                        '{
                            "hookSpecificOutput": {
                                "hookEventName": "PreToolUse",
                                "permissionDecision": "allow",
                                "permissionDecisionReason": "Database write operation",
                                "additionalContext": "Write operation to database. Ensure data integrity and backup before proceeding."
                            }
                        }'
                    exit 0
                fi
            fi
        fi
        ;;
    
    "slack"|"discord"|"teams")
        # Messaging/notification operations
        if [[ "$MCP_TOOL" =~ ^(send|post|notify) ]]; then
            log_mcp_event "INFO" "Notification operation via $MCP_SERVER"
            
            jq -n \
                --arg server "$MCP_SERVER" \
                '{
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "allow",
                        "permissionDecisionReason": "Notification operation",
                        "additionalContext": "Sending notification via $server. Ensure no sensitive information is included in the message."
                    }
                }'
            exit 0
        fi
        ;;
esac

# Default: silently allow
exit 0

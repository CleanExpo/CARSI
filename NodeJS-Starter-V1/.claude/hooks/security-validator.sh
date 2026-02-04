#!/bin/bash
# =============================================================================
# Security Validator Hook for NodeJS-Starter-V1
# PreToolUse hook for Bash commands - Validates command safety
# =============================================================================
# This hook analyzes Bash commands before execution and warns/logs potentially
# dangerous operations while allowing them to proceed (balanced approach).
# =============================================================================

# Read JSON input from stdin
INPUT=$(cat)

# Extract command from input
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# Exit early if not a Bash command
if [ "$TOOL_NAME" != "Bash" ]; then
    exit 0
fi

# Exit if no command provided
if [ -z "$COMMAND" ]; then
    exit 0
fi

# Configuration
LOG_FILE="${CLAUDE_PROJECT_DIR}/.claude/logs/security-$(date +%Y-%m-%d).log"
WARNINGS=()
BLOCK_REASON=""
ALLOWED=true

# Create logs directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log security events
log_security_event() {
    local level="$1"
    local message="$2"
    local timestamp=$(date -Iseconds 2>/dev/null || date "+%Y-%m-%dT%H:%M:%S")
    
    echo "{\"timestamp\":\"$timestamp\",\"session_id\":\"$SESSION_ID\",\"level\":\"$level\",\"command\":\"$(echo "$COMMAND" | sed 's/"/\\"/g')\",\"cwd\":\"$CWD\",\"message\":\"$message\"}" >> "$LOG_FILE"
}

# =============================================================================
# DANGEROUS PATTERN DETECTION
# =============================================================================

# Pattern 1: Destructive file operations
detect_destructive_ops() {
    # Check for rm -rf (especially targeting system directories)
    if echo "$COMMAND" | grep -qE 'rm\s+-rf?\s+(/|~/?$|\$HOME/?$|\./\s*$)'; then
        BLOCK_REASON="Destructive operation: Attempting to delete root, home, or current directory"
        ALLOWED=false
        return
    fi
    
    # Check for rm -rf with wildcards that could hit system files
    if echo "$COMMAND" | grep -qE 'rm\s+-rf?\s+.*\*.*(/|etc|usr|var|bin|lib)'; then
        WARNINGS+=("Warning: rm with wildcard near system directories")
        log_security_event "WARNING" "rm with wildcard detected"
    fi
    
    # Check for recursive delete in sensitive locations
    if echo "$COMMAND" | grep -qE 'rm\s+.*-r.*\.(git|env|claude)'; then
        WARNINGS+=("Warning: Attempting to delete .git, .env, or .claude directory")
        log_security_event "WARNING" "Recursive delete of sensitive directory"
    fi
}

# Pattern 2: Privilege escalation
detect_privilege_escalation() {
    # Check for sudo
    if echo "$COMMAND" | grep -qE '^\s*sudo\s'; then
        WARNINGS+=("Warning: sudo command detected - requires elevated privileges")
        log_security_event "WARNING" "sudo command detected"
    fi
    
    # Check for su command
    if echo "$COMMAND" | grep -qE '^\s*su\s'; then
        WARNINGS+=("Warning: su command detected")
        log_security_event "WARNING" "su command detected"
    fi
}

# Pattern 3: Network operations
detect_network_ops() {
    # Check for curl/wget to suspicious URLs
    if echo "$COMMAND" | grep -qE '(curl|wget).*\.\.(exe|sh|bat|ps1)'; then
        WARNINGS+=("Warning: Downloading executable files")
        log_security_event "WARNING" "Downloading potentially executable content"
    fi
    
    # Check for netcat or similar
    if echo "$COMMAND" | grep -qE '\b(nc|netcat|ncat)\b'; then
        WARNINGS+=("Warning: Network tool (nc/netcat) detected")
        log_security_event "WARNING" "Network tool usage detected"
    fi
}

# Pattern 4: Database operations
detect_database_ops() {
    # Check for database drops
    if echo "$COMMAND" | grep -qiE 'drop\s+(database|db|table|schema)'; then
        WARNINGS+=("CRITICAL: Database DROP operation detected")
        log_security_event "CRITICAL" "Database DROP operation"
    fi
    
    # Check for destructive Supabase operations
    if echo "$COMMAND" | grep -qE 'supabase\s+db\s+(reset|delete)'; then
        WARNINGS+=("Warning: Destructive Supabase database operation")
        log_security_event "WARNING" "Supabase destructive operation"
    fi
}

# Pattern 5: Git operations
detect_git_ops() {
    # Check for force pushes
    if echo "$COMMAND" | grep -qE 'git\s+push\s+.*--force'; then
        WARNINGS+=("Warning: Force push detected - can overwrite remote history")
        log_security_event "WARNING" "Git force push detected"
    fi
    
    # Check for destructive git operations
    if echo "$COMMAND" | grep -qE 'git\s+(clean\s+-f|reset\s+--hard)'; then
        WARNINGS+=("Warning: Destructive git operation (clean -f or reset --hard)")
        log_security_event "WARNING" "Destructive git operation"
    fi
}

# Pattern 6: File system operations
detect_filesystem_ops() {
    # Check for chmod on system files
    if echo "$COMMAND" | grep -qE 'chmod\s+.*(/etc|/usr|/bin|/lib)'; then
        WARNINGS+=("Warning: Changing permissions on system directories")
        log_security_event "WARNING" "System directory permission change"
    fi
    
    # Check for chown to root
    if echo "$COMMAND" | grep -qE 'chown\s+.*root'; then
        WARNINGS+=("Warning: Changing ownership to root")
        log_security_event "WARNING" "Root ownership change"
    fi
}

# Pattern 7: Docker operations
detect_docker_ops() {
    # Check for docker system prune
    if echo "$COMMAND" | grep -qE 'docker\s+(system\s+prune|volume\s+rm|network\s+prune)'; then
        WARNINGS+=("Warning: Destructive Docker cleanup operation")
        log_security_event "WARNING" "Docker cleanup operation"
    fi
    
    # Check for docker rm -f on all containers
    if echo "$COMMAND" | grep -qE 'docker\s+rm\s+-f.*\$\(docker\s+ps'; then
        WARNINGS+=("Warning: Force removing all Docker containers")
        log_security_event "WARNING" "Mass Docker container removal"
    fi
}

# Pattern 8: Environment variable exposure
detect_env_exposure() {
    # Check for commands that might expose secrets
    if echo "$COMMAND" | grep -qE '(echo|print|cat)\s+.*\.(env|secrets|credentials|key)'; then
        WARNINGS+=("Warning: Potential secret exposure")
        log_security_event "WARNING" "Potential secret exposure"
    fi
    
    # Check for env var printing with sensitive patterns
    if echo "$COMMAND" | grep -qE 'echo\s+\$.*(KEY|SECRET|TOKEN|PWD|PASSWORD)'; then
        WARNINGS+=("Warning: Printing sensitive environment variable")
        log_security_event "WARNING" "Sensitive env var access"
    fi
}

# Run all detection functions
detect_destructive_ops
detect_privilege_escalation
detect_network_ops
detect_database_ops
detect_git_ops
detect_filesystem_ops
detect_docker_ops
detect_env_exposure

# =============================================================================
# DECISION OUTPUT
# =============================================================================

# For balanced approach: Log warnings but allow unless critical
if [ "$ALLOWED" = false ]; then
    # Block critical operations
    log_security_event "BLOCKED" "$BLOCK_REASON"
    
    # Output blocking JSON
    jq -n \
        --arg reason "$BLOCK_REASON" \
        '{
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": $reason
            }
        }'
    exit 0
else
    # Allow but provide warnings as context
    if [ ${#WARNINGS[@]} -gt 0 ]; then
        # Log the allowed command with warnings
        log_security_event "ALLOWED_WITH_WARNINGS" "Command allowed with ${#WARNINGS[@]} warning(s)"
        
        # Build warning message
        WARNING_TEXT=$(printf "%s\n" "${WARNINGS[@]}" | head -5)
        
        # Output with additional context
        jq -n \
            --arg warnings "$WARNING_TEXT" \
            '{
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "allow",
                    "permissionDecisionReason": "Command allowed with warnings",
                    "additionalContext": $warnings
                }
            }'
        exit 0
    else
        # Clean command, silently allow
        exit 0
    fi
fi

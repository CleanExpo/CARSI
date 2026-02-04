#!/bin/bash
# =============================================================================
# Protected Files Guardian Hook for NodeJS-Starter-V1
# PreToolUse hook for Edit/Write operations - Protects sensitive files
# =============================================================================
# This hook prevents accidental modification of critical project files while
# allowing intentional edits with explicit warnings.
# =============================================================================

# Read JSON input from stdin
INPUT=$(cat)

# Extract data from input
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
OLD_STRING=$(echo "$INPUT" | jq -r '.tool_input.old_string // empty')
NEW_STRING=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# Exit early if not Edit or Write
if [ "$TOOL_NAME" != "Edit" ] && [ "$TOOL_NAME" != "Write" ]; then
    exit 0
fi

# Exit if no file path
if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Configuration
LOG_FILE="${CLAUDE_PROJECT_DIR}/.claude/logs/files-$(date +%Y-%m-%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

# Protected file patterns (regex)
declare -a PROTECTED_PATTERNS=(
    # Environment and secrets
    "\\.env$"
    "\\.env\\."
    "credentials"
    "secret"
    "token"
    "key\\.json$"
    "\\.pem$"
    "\\.key$"
    "\\.p12$"
    "\\.pfx$"
    
    # Git internals
    "\\.git/"
    "\\.gitignore$"
    "\\.gitattributes$"
    
    # Project configuration (block accidental overwrites)
    "pnpm-lock\\.yaml$"
    "package-lock\\.json$"
    "yarn\\.lock$"
    "uv\\.lock$"
    
    # CI/CD configuration
    "\\.github/workflows/"
    "\\.gitlab-ci\\.yml$"
    
    # Infrastructure
    "terraform\\.tfstate"
    "\\.tfstate\\.backup"
    "kubeconfig"
    
    # Claude Code internals
    "\\.claude/settings\\.local\\.json$"
    "\\.claude/logs/"
)

# Critical patterns (require explicit confirmation)
declare -a CRITICAL_PATTERNS=(
    "\\.env\\.local$"
    "\\.env\\.production$"
    "id_rsa"
    "\\.ssh/"
    "supabase/config\\.toml$"
)

# Function to log file operations
log_file_event() {
    local level="$1"
    local message="$2"
    local timestamp=$(date -Iseconds 2>/dev/null || date "+%Y-%m-%dT%H:%M:%S")
    
    echo "{\"timestamp\":\"$timestamp\",\"session_id\":\"$SESSION_ID\",\"level\":\"$level\",\"tool\":\"$TOOL_NAME\",\"file\":\"$FILE_PATH\",\"message\":\"$message\"}" >> "$LOG_FILE"
}

# Function to check if path matches any pattern
matches_pattern() {
    local path="$1"
    shift
    local patterns=("$@")
    
    for pattern in "${patterns[@]}"; do
        if echo "$path" | grep -qE "$pattern"; then
            return 0
        fi
    done
    return 1
}

# Check for path traversal attacks
check_path_traversal() {
    if echo "$FILE_PATH" | grep -qE "\\.\\./|\\.\\.\\\\"; then
        log_file_event "BLOCKED" "Path traversal attempt detected"
        
        jq -n \
            --arg file "$FILE_PATH" \
            '{
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": "Path traversal attempt detected. File paths containing \"../\" are not allowed for security reasons."
                }
            }'
        exit 0
    fi
}

# Check for absolute paths outside project
check_absolute_path() {
    if [[ "$FILE_PATH" =~ ^/ ]]; then
        # Allow if within project directory
        if [[ "$FILE_PATH" == "$CLAUDE_PROJECT_DIR"* ]]; then
            return 0
        fi
        
        # Block absolute paths outside project
        log_file_event "WARNING" "Absolute path outside project directory: $FILE_PATH"
        
        jq -n \
            --arg file "$FILE_PATH" \
            '{
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "ask",
                    "permissionDecisionReason": "Attempting to write to absolute path outside project directory. Please confirm this is intentional."
                }
            }'
        exit 0
    fi
}

# Check protected patterns
check_protected_files() {
    if matches_pattern "$FILE_PATH" "${PROTECTED_PATTERNS[@]}"; then
        # Check if it's a critical pattern
        if matches_pattern "$FILE_PATH" "${CRITICAL_PATTERNS[@]}"; then
            log_file_event "CRITICAL" "Attempt to modify critical protected file"
            
            jq -n \
                --arg file "$FILE_PATH" \
                '{
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "ask",
                        "permissionDecisionReason": "CRITICAL: Attempting to modify sensitive file. This file contains secrets or critical configuration. Please confirm you understand the risks."
                    }
                }'
            exit 0
        else
            # Regular protected file - warn but allow with context
            log_file_event "WARNING" "Modifying protected file pattern"
            
            jq -n \
                --arg file "$FILE_PATH" \
                '{
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "allow",
                        "permissionDecisionReason": "Modifying protected file pattern - proceed with caution",
                        "additionalContext": "⚠️ This file matches a protected pattern. Ensure you are not accidentally overwriting important configuration or secrets."
                    }
                }'
            exit 0
        fi
    fi
}

# Check for potential secret exposure in content
check_secret_exposure() {
    local content="${NEW_STRING}${CONTENT}"
    
    # Check for common secret patterns
    if echo "$content" | grep -qE '(password|passwd|pwd)\s*[=:]\s*["\047][^"\047]+["\047]'; then
        log_file_event "WARNING" "Potential password in file content"
        
        jq -n \
            --arg file "$FILE_PATH" \
            '{
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "ask",
                    "permissionDecisionReason": "Potential password detected in file content. Consider using environment variables instead."
                }
            }'
        exit 0
    fi
    
    # Check for API keys
    if echo "$content" | grep -qE '(api[_-]?key|apikey)\s*[=:]\s*["\047][a-zA-Z0-9_\-]{20,}["\047]'; then
        log_file_event "WARNING" "Potential API key in file content"
        
        jq -n \
            --arg file "$FILE_PATH" \
            '{
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "ask",
                    "permissionDecisionReason": "Potential API key detected in file content. Use environment variables or a secrets manager instead."
                }
            }'
        exit 0
    fi
    
    # Check for private keys
    if echo "$content" | grep -qE 'BEGIN\s+(RSA|DSA|EC|OPENSSH)\s+PRIVATE\s+KEY'; then
        log_file_event "CRITICAL" "Private key detected in file content"
        
        jq -n \
            --arg file "$FILE_PATH" \
            '{
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": "Private key detected! Never commit private keys to version control. Use environment variables or a secrets manager."
                }
            }'
        exit 0
    fi
}

# Run checks
check_path_traversal
check_absolute_path
check_protected_files
check_secret_exposure

# All checks passed - silently allow
exit 0

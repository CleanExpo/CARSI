#!/bin/bash
# =============================================================================
# Quality Gate Hook for NodeJS-Starter-V1
# PostToolUse hook for Write/Edit operations - Runs quality checks async
# =============================================================================
# This hook runs quality checks asynchronously after file modifications,
# batching checks when multiple files are edited in sequence.
# =============================================================================

# Read JSON input from stdin
INPUT=$(cat)

# Extract data from input
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# Exit early if not Write or Edit
if [ "$TOOL_NAME" != "Write" ] && [ "$TOOL_NAME" != "Edit" ]; then
    exit 0
fi

# Exit if no file path
if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Configuration
LOG_FILE="${CLAUDE_PROJECT_DIR}/.claude/logs/quality-$(date +%Y-%m-%d).log"
BATCH_FILE="${CLAUDE_PROJECT_DIR}/.claude/logs/quality-batch-${SESSION_ID}.txt"
LOCK_FILE="${CLAUDE_PROJECT_DIR}/.claude/logs/quality-lock-${SESSION_ID}.lock"
mkdir -p "$(dirname "$LOG_FILE")"

# File extensions that trigger quality checks
declare -a CHECKED_EXTENSIONS=(
    "ts" "tsx" "js" "jsx" "json" "md" "yml" "yaml"
    "py" "toml"
)

# Function to log quality events
log_quality_event() {
    local level="$1"
    local message="$2"
    local timestamp=$(date -Iseconds 2>/dev/null || date "+%Y-%m-%dT%H:%M:%S")
    
    echo "{\"timestamp\":\"$timestamp\",\"session_id\":\"$SESSION_ID\",\"level\":\"$level\",\"file\":\"$FILE_PATH\",\"message\":\"$message\"}" >> "$LOG_FILE"
}

# Get file extension
get_extension() {
    local filename="$1"
    echo "${filename##*.}" | tr '[:upper:]' '[:lower:]'
}

# Check if file should be checked
should_check_file() {
    local ext=$(get_extension "$FILE_PATH")
    
    for checked_ext in "${CHECKED_EXTENSIONS[@]}"; do
        if [ "$ext" == "$checked_ext" ]; then
            return 0
        fi
    done
    return 1
}

# Exit if file doesn't need checking
if ! should_check_file; then
    exit 0
fi

# Add file to batch
echo "$FILE_PATH" >> "$BATCH_FILE"
log_quality_event "INFO" "Added to quality check batch"

# Check if we're already running quality checks (batch after idle time)
if [ -f "$LOCK_FILE" ]; then
    # Another instance is processing, just add to batch
    exit 0
fi

# Create lock file
touch "$LOCK_FILE"

# Function to cleanup lock file
cleanup() {
    rm -f "$LOCK_FILE"
}
trap cleanup EXIT

# Wait for idle time (3 seconds) to batch multiple file changes
sleep 3

# Read all files in batch
declare -a FILES_TO_CHECK=()
if [ -f "$BATCH_FILE" ]; then
    while IFS= read -r line; do
        [ -n "$line" ] && FILES_TO_CHECK+=("$line")
    done < "$BATCH_FILE"
    rm -f "$BATCH_FILE"
fi

# Exit if no files to check
if [ ${#FILES_TO_CHECK[@]} -eq 0 ]; then
    exit 0
fi

# Deduplicate files
unique_files=($(printf "%s\n" "${FILES_TO_CHECK[@]}" | sort -u))

# Log batch processing
log_quality_event "INFO" "Processing quality batch: ${#unique_files[@]} unique files"

# Initialize results
ERRORS=()
WARNINGS=()

# Function to run type check for TypeScript files
run_typecheck() {
    local ts_files=()
    
    for file in "${unique_files[@]}"; do
        if [[ "$file" =~ \.(ts|tsx)$ ]]; then
            ts_files+=("$file")
        fi
    done
    
    if [ ${#ts_files[@]} -eq 0 ]; then
        return 0
    fi
    
    log_quality_event "INFO" "Running TypeScript type check"
    
    # Determine which package this file belongs to
    local project_root="${CLAUDE_PROJECT_DIR}"
    
    # Check if it's a web (Next.js) file
    if echo "${ts_files[@]}" | grep -q "apps/web"; then
        cd "$project_root/apps/web" 2>/dev/null || cd "$project_root"
        if [ -f "package.json" ]; then
            local result=$(pnpm run type-check 2>&1)
            local exit_code=$?
            
            if [ $exit_code -ne 0 ]; then
                ERRORS+=("TypeScript errors in apps/web:")
                ERRORS+=("$result")
            fi
        fi
        cd "$project_root"
    fi
    
    # Check backend Python files (using mypy if available)
    if echo "${unique_files[@]}" | grep -q "apps/backend"; then
        cd "$project_root/apps/backend" 2>/dev/null || cd "$project_root"
        if command -v uv &>/dev/null && [ -f "pyproject.toml" ]; then
            local result=$(uv run mypy src/ 2>&1 || echo "mypy not configured")
            if echo "$result" | grep -q "error:"; then
                WARNINGS+=("Python type hints issues:")
                WARNINGS+=("$result")
            fi
        fi
        cd "$project_root"
    fi
}

# Function to run lint check
run_lint() {
    log_quality_event "INFO" "Running lint check"
    
    local project_root="${CLAUDE_PROJECT_DIR}"
    cd "$project_root"
    
    # Run turbo lint if available
    if [ -f "turbo.json" ]; then
        local result=$(pnpm turbo run lint --output-logs=errors-only 2>&1)
        local exit_code=$?
        
        if [ $exit_code -ne 0 ]; then
            ERRORS+=("Lint errors found:")
            ERRORS+=("$result")
        fi
    fi
}

# Function to check for console.log/debug statements
check_debug_statements() {
    log_quality_event "INFO" "Checking for debug statements"
    
    local found_debug=false
    local debug_files=()
    
    for file in "${unique_files[@]}"; do
        if [[ "$file" =~ \.(ts|tsx|js|jsx)$ ]]; then
            if [ -f "$file" ]; then
                # Check for console.log, console.debug, debugger
                if grep -nE '(console\.(log|debug|warn|error)\(|debugger;)' "$file" | grep -v "eslint-disable" | head -5 > /dev/null 2>&1; then
                    found_debug=true
                    debug_files+=("$file")
                fi
            fi
        fi
    done
    
    if [ "$found_debug" = true ]; then
        WARNINGS+=("Debug statements found (remove before commit):")
        for f in "${debug_files[@]}"; do
            WARNINGS+=("  - $f")
        done
    fi
}

# Function to check for proper exports
check_barrel_exports() {
    log_quality_event "INFO" "Checking barrel file exports"
    
    for file in "${unique_files[@]}"; do
        # If file is in a directory with index.ts, check if it's exported
        local dir=$(dirname "$file")
        local barrel="$dir/index.ts"
        local filename=$(basename "$file" .ts)
        filename=$(basename "$filename" .tsx)
        
        if [ -f "$barrel" ]; then
            if ! grep -q "export.*$filename" "$barrel" 2>/dev/null; then
                # Only warn if it's not the barrel file itself
                if [ "$(basename "$file")" != "index.ts" ] && [ "$(basename "$file")" != "index.tsx" ]; then
                    WARNINGS+=("File $file may need to be exported from $barrel")
                fi
            fi
        fi
    done
}

# Function to check for missing error handling
check_error_handling() {
    log_quality_event "INFO" "Checking error handling patterns"
    
    for file in "${unique_files[@]}"; do
        if [[ "$file" =~ \.(ts|tsx|js|jsx)$ ]]; then
            if [ -f "$file" ]; then
                # Check async functions without try/catch
                local async_count=$(grep -c "async function\|async (" "$file" 2>/dev/null || echo 0)
                local try_count=$(grep -c "try {" "$file" 2>/dev/null || echo 0)
                
                if [ "$async_count" -gt 0 ] && [ "$try_count" -eq 0 ]; then
                    # Check if it's an API route file
                    if [[ "$file" =~ api.*route\.(ts|js)$ ]]; then
                        WARNINGS+=("API route $file may be missing error handling (try/catch)")
                    fi
                fi
            fi
        fi
    done
}

# Run all checks
run_typecheck
run_lint
check_debug_statements
check_barrel_exports
check_error_handling

# Prepare output
OUTPUT=""
if [ ${#ERRORS[@]} -gt 0 ]; then
    OUTPUT+="❌ ERRORS FOUND:\n"
    for error in "${ERRORS[@]}"; do
        OUTPUT+="$error\n"
    done
    OUTPUT+="\n"
fi

if [ ${#WARNINGS[@]} -gt 0 ]; then
    OUTPUT+="⚠️  WARNINGS:\n"
    for warning in "${WARNINGS[@]}"; do
        OUTPUT+="$warning\n"
    done
fi

# Output results
if [ -n "$OUTPUT" ]; then
    log_quality_event "WARNING" "Quality issues found"
    
    # Output as systemMessage for the next conversation turn
    jq -n \
        --arg output "$OUTPUT" \
        '{
            "systemMessage": $output
        }'
    exit 0
else
    log_quality_event "INFO" "All quality checks passed"
    
    # Silent success - no output needed for async hooks
    exit 0
fi

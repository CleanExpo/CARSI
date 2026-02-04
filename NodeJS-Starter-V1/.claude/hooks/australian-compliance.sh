#!/bin/bash
# =============================================================================
# Australian Compliance Hook for NodeJS-Starter-V1
# PostToolUse hook for Write/Edit operations - Validates Australian standards
# =============================================================================
# This hook ensures all code and content follows Australian standards:
# - Spelling (en-AU)
# - Date formats (DD/MM/YYYY)
# - Currency (AUD/$)
# - Timezones (Australia/Brisbane default)
# =============================================================================

# Read JSON input from stdin
INPUT=$(cat)

# Extract data from input
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
NEW_STRING=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

# Exit early if not Write or Edit
if [ "$TOOL_NAME" != "Write" ] && [ "$TOOL_NAME" != "Edit" ]; then
    exit 0
fi

# Exit if no file path
if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Configuration
LOG_FILE="${CLAUDE_PROJECT_DIR}/.claude/logs/australian-$(date +%Y-%m-%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

# File extensions to check
declare -a CHECKED_EXTENSIONS=(
    "ts" "tsx" "js" "jsx" "md" "mdx" "json" "yml" "yaml"
    "py" "html" "css" "scss"
)

# Function to log compliance events
log_compliance_event() {
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

# Get the content to check
check_content="${CONTENT}${NEW_STRING}"

# If it's an edit, read the file to get full context
if [ -f "$FILE_PATH" ]; then
    full_content=$(cat "$FILE_PATH" 2>/dev/null)
else
    full_content="$check_content"
fi

# Initialize issues array
declare -a ISSUES=()

# =============================================================================
# AUSTRALIAN SPELLING CHECKS
# =============================================================================

check_australian_spelling() {
    log_compliance_event "INFO" "Checking Australian spelling conventions"
    
    # US -> AU spelling differences
    declare -a US_SPELLINGS=(
        "color:colour"
        "center:centre"
        "theater:theatre"
        "organize:organise"
        "organizing:organising"
        "organization:organisation"
        "behavior:behaviour"
        "behavioral:behavioural"
        "analyze:analyse"
        "analyzing:analysing"
        "customize:customise"
        "customizing:customising"
        "authorization:authorisation"
        "authorize:authorise"
        "optimization:optimisation"
        "optimize:optimise"
        "maximize:maximise"
        "minimize:minimise"
        "initialize:initialise"
        "localization:localisation"
        "meter:metre"
        "liter:litre"
        "defense:defence"
        "offense:offence"
        "traveling:travelling"
        "traveled:travelled"
        "canceled:cancelled"
        "canceling:cancelling"
        "favor:favour"
        "favorite:favourite"
        "honor:honour"
        "humor:humour"
        "labor:labour"
        "neighbor:neighbour"
        "program:programme"
    )
    
    for spelling_pair in "${US_SPELLINGS[@]}"; do
        IFS=':' read -r us au <<< "$spelling_pair"
        
        # Check for US spelling (case insensitive)
        if echo "$full_content" | grep -qiE "\b$us\b"; then
            # Skip if it's in a code context that requires US spelling (e.g., CSS properties)
            if [[ "$FILE_PATH" =~ \.(css|scss)$ ]] && [ "$us" == "color" ]; then
                continue
            fi
            
            # Skip if it's in a library/API name
            if echo "$full_content" | grep -qiE "(MaterialUI|Bootstrap|Normalize\.css|Authorization|Localization)"; then
                continue
            fi
            
            local matches=$(echo "$full_content" | grep -inE "\b$us\b" | head -3)
            ISSUES+=("US spelling '$us' found - use Australian '$au':")
            ISSUES+=("$matches")
            ISSUES+=("")
        fi
    done
}

# =============================================================================
# DATE FORMAT CHECKS
# =============================================================================

check_date_formats() {
    log_compliance_event "INFO" "Checking date formats"
    
    # Check for US date format (MM/DD/YYYY) - could be ambiguous
    if echo "$full_content" | grep -qE '\b(0?[1-9]|1[0-2])[/-](0?[1-9]|[12][0-9]|3[01])[/-][0-9]{4}\b'; then
        # Check if it looks like it could be a date
        local matches=$(echo "$full_content" | grep -inE '\b(0?[1-9]|1[0-2])[/-](0?[1-9]|[12][0-9]|3[01])[/-][0-9]{4}\b' | head -3)
        ISSUES+=("Potential US date format (MM/DD/YYYY) found - use Australian DD/MM/YYYY:")
        ISSUES+=("$matches")
        ISSUES+=("")
    fi
    
    # Check for ISO format (acceptable but flag for review)
    if echo "$full_content" | grep -qE '[0-9]{4}-[0-9]{2}-[0-9]{2}'; then
        local matches=$(echo "$full_content" | grep -inE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -3)
        ISSUES+=("Note: ISO date format (YYYY-MM-DD) found. This is acceptable for APIs/databases but consider DD/MM/YYYY for user-facing content.")
        ISSUES+=("")
    fi
}

# =============================================================================
# CURRENCY CHECKS
# =============================================================================

check_currency() {
    log_compliance_event "INFO" "Checking currency formats"
    
    # Check for USD without explicit mention
    if echo "$full_content" | grep -qiE '\$[0-9,]+(\.[0-9]{2})?\s*(USD|dollars?)'; then
        local matches=$(echo "$full_content" | grep -inE '\$[0-9,]+(\.[0-9]{2})?\s*(USD|dollars?)' | head -3)
        ISSUES+=("USD currency found - confirm if this should be AUD for Australian context:")
        ISSUES+=("$matches")
        ISSUES+=("")
    fi
    
    # Check for bare $ signs (should specify AUD or use $ symbol with context)
    if echo "$full_content" | grep -qE '(price|cost|amount|fee|payment).*:?\s*\$[0-9]'; then
        if ! echo "$full_content" | grep -qE 'AUD|\$\s*AUD|Australian'; then
            local matches=$(echo "$full_content" | grep -inE '(price|cost|amount|fee|payment).*:?\s*\$[0-9]' | head -3)
            ISSUES+=("Currency amounts found without AUD specification. Consider adding 'AUD' or '$' context:")
            ISSUES+=("$matches")
            ISSUES+=("")
        fi
    fi
}

# =============================================================================
# TIMEZONE CHECKS
# =============================================================================

check_timezones() {
    log_compliance_event "INFO" "Checking timezone settings"
    
    # Check for hardcoded non-Australian timezones in code
    if [[ "$FILE_PATH" =~ \.(ts|tsx|js|jsx|py)$ ]]; then
        if echo "$full_content" | grep -qE '"(America/New_York|America/Los_Angeles|Europe/London|UTC)"'; then
            local matches=$(echo "$full_content" | grep -inE '"(America/New_York|America/Los_Angeles|Europe/London)"' | head -3)
            ISSUES+=("Non-Australian timezone found in code - verify if intentional:")
            ISSUES+=("$matches")
            ISSUES+=("")
        fi
        
        # Check for missing timezone specification
        if echo "$full_content" | grep -qE 'new Date\(\)|Date\.now\(\)'; then
            if ! echo "$full_content" | grep -qE 'Australia/(Brisbane|Sydney|Melbourne)|toLocaleString.*timeZone'; then
                ISSUES+=("Date operations found without explicit timezone. Consider specifying 'Australia/Brisbane' for Australian context.")
                ISSUES+=("")
            fi
        fi
    fi
}

# =============================================================================
# LANGUAGE/LOCALE CHECKS
# =============================================================================

check_locale() {
    log_compliance_event "INFO" "Checking locale settings"
    
    # Check for hardcoded US locale
    if [[ "$FILE_PATH" =~ \.(ts|tsx|js|jsx|py)$ ]]; then
        if echo "$full_content" | grep -qE "(en-US|en_US|'en-US'|\"en-US\")"; then
            local matches=$(echo "$full_content" | grep -inE "(en-US|en_US|'en-US'|\"en-US\")" | head -3)
            ISSUES+=("US locale (en-US) found - consider using 'en-AU' for Australian context:")
            ISSUES+=("$matches")
            ISSUES+=("")
        fi
        
        # Check for locale methods without AU specification
        if echo "$full_content" | grep -qE 'toLocaleString|toLocaleDateString|toLocaleTimeString|Intl\.DateTimeFormat|Intl\.NumberFormat'; then
            if ! echo "$full_content" | grep -qE "'en-AU'|\"en-AU\""; then
                ISSUES+=("Locale-aware formatting found without 'en-AU' specification. Consider adding locale: 'en-AU'.")
                ISSUES+=("")
            fi
        fi
    fi
}

# =============================================================================
# REGULATORY COMPLIANCE CHECKS
# =============================================================================

check_regulatory_compliance() {
    log_compliance_event "INFO" "Checking regulatory compliance hints"
    
    # Privacy Act 1988 references
    if echo "$full_content" | grep -qiE 'privacy.*policy|privacy.*notice|collect.*personal.*information'; then
        if ! echo "$full_content" | grep -qiE 'Privacy Act.*1988|Australian Privacy Principles|APPs'; then
            ISSUES+=("Privacy-related content found. Ensure compliance with Privacy Act 1988 and Australian Privacy Principles.")
            ISSUES+=("")
        fi
    fi
    
    # WCAG accessibility
    if [[ "$FILE_PATH" =~ \.(tsx|jsx|html)$ ]]; then
        if echo "$full_content" | grep -qE '<img[^>]*>'; then
            if ! echo "$full_content" | grep -qE 'alt='; then
                ISSUES+=("Images found without alt attributes. Ensure WCAG 2.1 AA compliance for accessibility.")
                ISSUES+=("")
            fi
        fi
    fi
}

# Run all checks
log_compliance_event "INFO" "Starting Australian compliance check"

check_australian_spelling
check_date_formats
check_currency
check_timezones
check_locale
check_regulatory_compliance

# Prepare output
if [ ${#ISSUES[@]} -gt 0 ]; then
    log_compliance_event "WARNING" "Australian compliance issues found"
    
    OUTPUT="🇦🇺 AUSTRALIAN COMPLIANCE NOTES:\n\n"
    for issue in "${ISSUES[@]}"; do
        OUTPUT+="$issue\n"
    done
    
    OUTPUT+="\n💡 Reminder: This project follows Australian standards:\n"
    OUTPUT+="   • Spelling: en-AU (organisation, colour, centre, etc.)\n"
    OUTPUT+="   • Dates: DD/MM/YYYY format\n"
    OUTPUT+="   • Currency: AUD ($) with explicit labeling\n"
    OUTPUT+="   • Timezone: Australia/Brisbane (UTC+10)\n"
    OUTPUT+="   • Locale: 'en-AU' for formatting\n"
    
    # Output as systemMessage
    jq -n \
        --arg output "$OUTPUT" \
        '{
            "systemMessage": $output
        }'
    exit 0
else
    log_compliance_event "INFO" "Australian compliance check passed"
    exit 0
fi

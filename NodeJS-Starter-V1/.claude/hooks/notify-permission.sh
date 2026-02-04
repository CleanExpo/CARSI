#!/bin/bash
# =============================================================================
# Notification Permission Hook for NodeJS-Starter-V1
# Notification hook for permission_prompt - Desktop notifications
# =============================================================================
# This hook sends desktop notifications when Claude Code needs user permission.
# Supports macOS (osascript), Linux (notify-send), and Windows (PowerShell).
# =============================================================================

# Read JSON input from stdin
INPUT=$(cat)

# Extract data
MESSAGE=$(echo "$INPUT" | jq -r '.message // empty')
TITLE=$(echo "$INPUT" | jq -r '.title // "Claude Code"')
NOTIFICATION_TYPE=$(echo "$INPUT" | jq -r '.notification_type // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

# Exit if not a permission prompt
if [ "$NOTIFICATION_TYPE" != "permission_prompt" ]; then
    exit 0
fi

# Configuration
LOG_FILE="${CLAUDE_PROJECT_DIR}/.claude/logs/notifications-$(date +%Y-%m-%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

# Log notification
TIMESTAMP=$(date -Iseconds 2>/dev/null || date "+%Y-%m-%dT%H:%M:%S")
echo "{\"timestamp\":\"$TIMESTAMP\",\"session_id\":\"$SESSION_ID\",\"type\":\"$NOTIFICATION_TYPE\",\"title\":\"$TITLE\",\"message\":\"$(echo "$MESSAGE" | cut -c1-100)\"}" >> "$LOG_FILE"

# Determine OS and send notification
detect_os() {
    case "$(uname -s)" in
        Darwin*) echo "macos" ;;
        Linux*) echo "linux" ;;
        CYGWIN*|MINGW*|MSYS*) echo "windows" ;;
        *) echo "unknown" ;;
    esac
}

OS=$(detect_os)

# Send notification based on OS
send_notification() {
    local title="$1"
    local message="$2"
    
    case "$OS" in
        macos)
            # macOS notification using osascript
            if command -v osascript &>/dev/null; then
                osascript -e "display notification \"$message\" with title \"$title\" sound name \"default\"" 2>/dev/null
            fi
            ;;
        
        linux)
            # Linux notification using notify-send
            if command -v notify-send &>/dev/null; then
                notify-send "$title" "$message" --urgency=normal 2>/dev/null
            fi
            ;;
        
        windows)
            # Windows notification using PowerShell
            if command -v powershell &>/dev/null; then
                powershell -Command "
                    Add-Type -AssemblyName System.Windows.Forms
                    `$global:balloon = New-Object System.Windows.Forms.NotifyIcon
                    `$path = (Get-Process -Id `$pid).Path
                    `$balloon.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon(`$path)
                    `$balloon.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
                    `$balloon.BalloonTipText = '$message'
                    `$balloon.BalloonTipTitle = '$title'
                    `$balloon.Visible = `$true
                    `$balloon.ShowBalloonTip(5000)
                " 2>/dev/null
            fi
            ;;
    esac
}

# Truncate message if too long
if [ ${#MESSAGE} -gt 150 ]; then
    DISPLAY_MESSAGE="${MESSAGE:0:147}..."
else
    DISPLAY_MESSAGE="$MESSAGE"
fi

# Send the notification
send_notification "$TITLE" "$DISPLAY_MESSAGE"

# Silent success
exit 0

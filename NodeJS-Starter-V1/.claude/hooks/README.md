# Claude Code Hooks for NodeJS-Starter-V1

> Automated quality, security, and Australian compliance enforcement for the NodeJS-Starter-V1 monorepo.

## Overview

This directory contains [Claude Code Hooks](https://code.claude.com/docs/en/hooks) that automatically execute at specific points during a Claude Code session. These hooks enforce project standards, validate security, and maintain Australian compliance (en-AU) without manual intervention.

## 🪝 Hook Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Claude Code Session Lifecycle                 │
├─────────────────────────────────────────────────────────────────┤
│  SessionStart → UserPromptSubmit → PreToolUse → Tool Execution   │
│                      ↓                                            │
│  PostToolUse/PostToolUseFailure → Stop → SessionEnd              │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 File Structure

```
.claude/
├── settings.json              # Main hooks configuration
├── settings.local.json        # User-specific overrides (gitignored)
├── hooks/
│   ├── README.md             # This file
│   ├── security-validator.sh      # PreToolUse: Validates command safety
│   ├── protected-files-guardian.sh # PreToolUse: Protects sensitive files
│   ├── mcp-validator.sh          # PreToolUse: Validates MCP operations
│   ├── quality-gate.sh           # PostToolUse: Async quality checks
│   ├── australian-compliance.sh  # PostToolUse: Australian standards
│   ├── post-command-logger.sh    # PostToolUse: Command audit logging
│   ├── failure-analyzer.sh       # PostToolUseFailure: Error analysis
│   ├── session-bootstrap.sh      # SessionStart: Initialize context
│   ├── subagent-context.sh       # SubagentStart: Agent-specific context
│   └── notify-permission.sh      # Notification: Desktop notifications
└── logs/                      # Hook execution logs
    ├── security-YYYY-MM-DD.log
    ├── quality-YYYY-MM-DD.log
    ├── australian-YYYY-MM-DD.log
    ├── commands-YYYY-MM-DD.log
    ├── failures-YYYY-MM-DD.log
    ├── sessions-YYYY-MM-DD.log
    ├── subagents-YYYY-MM-DD.log
    └── notifications-YYYY-MM-DD.log
```

## 🔒 Security Hooks (PreToolUse)

### security-validator.sh
**Triggers:** Before every Bash command  
**Purpose:** Validates command safety and blocks dangerous operations

**Detects:**
- Destructive operations (`rm -rf /`, `sudo`)
- Database drops and destructive operations
- Git force pushes and destructive git ops
- Docker system prune
- Environment variable exposure

**Behavior:**
- 🔴 **Blocks** critical operations (returns `permissionDecision: deny`)
- 🟡 **Warns** on suspicious operations (returns `permissionDecision: allow` with context)
- 🟢 **Allows** safe operations silently

### protected-files-guardian.sh
**Triggers:** Before every Write/Edit operation  
**Purpose:** Prevents accidental modification of sensitive files

**Protects:**
- Environment files (`.env`, `.env.local`, `.env.production`)
- Secrets and keys (`.pem`, `.key`, `credentials`)
- Lock files (`pnpm-lock.yaml`, `package-lock.json`)
- Git internals (`.git/`, `.gitignore`)
- Claude Code settings (`.claude/settings.local.json`)

**Behavior:**
- 🔴 **Blocks** path traversal attacks (`../`)
- 🟡 **Asks** for critical files (`.env.local`, private keys)
- 🟡 **Warns** for protected patterns
- 🟢 **Allows** standard files silently

### mcp-validator.sh
**Triggers:** Before MCP tool write operations  
**Purpose:** Validates MCP operations for safety

**Validates:**
- Memory server: Large writes (>10KB), deletions
- GitHub: Destructive operations (delete, close)
- Filesystem: Sensitive file access, deletions
- Database: DROP, DELETE, TRUNCATE operations
- Notifications: Message content appropriateness

## ⚡ Quality Hooks (PostToolUse)

### quality-gate.sh
**Triggers:** After Write/Edit operations (async)  
**Purpose:** Runs quality checks in background

**Checks:**
- TypeScript type checking (via `pnpm type-check`)
- Lint validation (via `pnpm turbo run lint`)
- Debug statement detection (`console.log`, `debugger`)
- Barrel file exports (index.ts completeness)
- API route error handling patterns

**Features:**
- Batches multiple file changes (3-second idle time)
- Runs asynchronously (doesn't block editing)
- Reports errors and warnings as system messages

### australian-compliance.sh
**Triggers:** After Write/Edit operations (async)  
**Purpose:** Validates Australian standards compliance

**Validates:**
- **Spelling:** US → AU conversions (color→colour, organize→organise)
- **Dates:** DD/MM/YYYY format (flags MM/DD/YYYY)
- **Currency:** AUD specification with $
- **Timezones:** Australia/Brisbane preference
- **Locale:** 'en-AU' for formatting functions
- **Regulations:** Privacy Act 1988, WCAG 2.1 AA hints

**Exceptions:**
- CSS properties requiring US spelling (e.g., `color`)
- Library/API names (MaterialUI, Authorization headers)
- ISO date format (acceptable for APIs)

## 📝 Logging Hooks

### post-command-logger.sh
**Triggers:** After successful Bash commands (async)  
**Purpose:** Audit trail of command execution

**Logs:**
- Timestamp, session ID, command category
- Command (truncated to 200 chars)
- Description and working directory

**Categories:** git, package, docker, supabase, python, filesystem, utility, network, other

### failure-analyzer.sh
**Triggers:** After failed Bash commands  
**Purpose:** Analyzes failures and suggests fixes

**Recognizes:**
- Command not found (suggests installation steps)
- Permission denied (suggests chmod/chown)
- Port in use (suggests process management)
- Module not found (suggests dependency installation)
- Connection refused (suggests service startup)
- Syntax errors, test failures, lint errors

## 🚀 Session Hooks

### session-bootstrap.sh
**Triggers:** On session start/resume  
**Purpose:** Initialize project context and environment status

**Displays:**
- Project info (name, version, turborepo status)
- Environment status (Node.js, pnpm, Docker, Supabase CLI)
- Project status (dependencies, .env files, git status)
- Active hooks summary
- Quick commands reference
- Latest progress from PROGRESS.md

### subagent-context.sh
**Triggers:** When subagents are spawned  
**Purpose:** Provide agent-type-specific context

**Supports:**
- **Frontend agents:** Next.js 15, Tailwind, shadcn/ui patterns
- **Backend agents:** FastAPI, LangGraph, Pydantic patterns
- **Database agents:** Supabase, RLS, migration patterns
- **Test agents:** Vitest, pytest, Playwright patterns
- **SEO agents:** Australian search dominance patterns
- **Verification agents:** Evidence-based verification standards
- **Code reviewer agents:** Quality and security check patterns

## 🔔 Notification Hooks

### notify-permission.sh
**Triggers:** On permission prompts  
**Purpose:** Desktop notifications when user input needed

**Platforms:**
- macOS: `osascript` notifications
- Linux: `notify-send` notifications
- Windows: PowerShell balloon notifications

## 🛠️ Configuration

### Main Configuration (.claude/settings.json)

```json
{
  "hooks": {
    "SessionStart": [...],
    "PreToolUse": [...],
    "PostToolUse": [...],
    "PostToolUseFailure": [...],
    "Stop": [...],
    "UserPromptSubmit": [...],
    "Notification": [...],
    "SubagentStart": [...]
  }
}
```

### User Overrides (.claude/settings.local.json)

Create this file for personal preferences (gitignored):

```json
{
  "hooks": {
    "disableAllHooks": false,
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/my-custom-hook.sh"
          }
        ]
      }
    ]
  }
}
```

## 📊 Log Files

All hooks write structured JSON logs to `.claude/logs/`:

```bash
# View today's security log
cat .claude/logs/security-$(date +%Y-%m-%d).log | jq

# View all quality issues from today
cat .claude/logs/quality-$(date +%Y-%m-%d).log | jq 'select(.level == "WARNING")'

# View Australian compliance issues
cat .claude/logs/australian-$(date +%Y-%m-%d).log | jq
```

## 🔧 Development

### Adding a New Hook

1. Create script in `.claude/hooks/`:
```bash
#!/bin/bash
# Read JSON input
INPUT=$(cat)
# Extract data
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
# Your logic here
exit 0
```

2. Make it executable:
```bash
chmod +x .claude/hooks/my-hook.sh
```

3. Register in `.claude/settings.json`:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/my-hook.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### Testing Hooks

Test hooks manually with sample JSON:

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' | \
  ./.claude/hooks/security-validator.sh | jq
```

### Hook Output Format

**Allow with context:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Reason",
    "additionalContext": "Context for Claude"
  }
}
```

**Block operation:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Why blocked"
  }
}
```

**System message (async hooks):**
```json
{
  "systemMessage": "Message for next conversation turn"
}
```

## 🚨 Troubleshooting

### Hooks not firing
1. Check `.claude/settings.json` syntax: `jq . .claude/settings.json`
2. Verify scripts are executable: `ls -la .claude/hooks/`
3. Check for jq dependency: `which jq`
4. Review logs: `cat .claude/logs/*.log`

### JSON parsing errors
- Ensure scripts output valid JSON only
- Check for shell profile text in stdout
- Use `jq -n` for JSON construction

### Performance issues
- Async hooks run in background (use `"async": true`)
- Adjust timeouts in settings.json
- Batch operations where possible

### Disabling hooks temporarily
```json
{
  "disableAllHooks": true
}
```

Or use `/hooks` menu in Claude Code to toggle.

## 📚 References

- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks)
- [Automate Workflows with Hooks](https://code.claude.com/docs/en/hooks-guide)
- [Hook Configuration Schema](https://code.claude.com/docs/en/settings#hook-configuration)

## 🤝 Contributing

When adding new hooks:
1. Follow existing naming convention: `<purpose>-<action>.sh`
2. Include header comments with purpose and trigger
3. Add to this README
4. Test with sample JSON input
5. Ensure proper exit codes (0 for success)

## 📝 License

Part of NodeJS-Starter-V1 - See project LICENSE

---

**Last Updated:** 2025-02-04  
**Version:** 2.0.0  
**Australian Compliance:** ✅ en-AU standards enforced

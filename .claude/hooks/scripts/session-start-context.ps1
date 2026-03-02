# Session Start Context Loader for Claude Code
# Loads project context at the beginning of each session
# Returns JSON with additionalContext for Claude

$ErrorActionPreference = "SilentlyContinue"

# Build context sections
$contextParts = @()

# 1. Git Status
$gitStatus = git status --porcelain 2>&1
$gitBranch = git rev-parse --abbrev-ref HEAD 2>&1
$uncommittedCount = ($gitStatus | Measure-Object -Line).Lines

if ($uncommittedCount -gt 0) {
    $contextParts += "GIT: Branch '$gitBranch' with $uncommittedCount uncommitted changes"
} else {
    $contextParts += "GIT: Branch '$gitBranch' (clean)"
}

# 2. Recent Commits (last 3)
$recentCommits = git log --oneline -3 2>&1
if ($LASTEXITCODE -eq 0) {
    $commitList = ($recentCommits -join ", ")
    $contextParts += "RECENT COMMITS: $commitList"
}

# 3. Beads Tasks (if available)
$beadsPath = "$env:CLAUDE_PROJECT_DIR\.bin\bd.exe"
if (Test-Path $beadsPath) {
    $readyTasks = & $beadsPath ready 2>&1 | Select-Object -First 5
    if ($readyTasks) {
        $taskCount = ($readyTasks | Measure-Object -Line).Lines
        $contextParts += "BEADS: $taskCount ready tasks"
    }
}

# 4. PROGRESS.md Status (if exists)
$progressPath = "$env:CLAUDE_PROJECT_DIR\PROGRESS.md"
if (Test-Path $progressPath) {
    $progressContent = Get-Content $progressPath -Raw -ErrorAction SilentlyContinue
    if ($progressContent -match "## Current Phase[:\s]*([^\n]+)") {
        $currentPhase = $Matches[1].Trim()
        $contextParts += "PHASE: $currentPhase"
    }
}

# 5. Australian Locale Context
$contextParts += "LOCALE: en-AU (DD/MM/YYYY, AUD, AEST/AEDT)"

# 6. CONSTITUTION.md — inject immutable rules
$constitutionPath = "$env:CLAUDE_PROJECT_DIR\.claude\memory\CONSTITUTION.md"
if (Test-Path $constitutionPath) {
    $constitution = Get-Content $constitutionPath -Raw -ErrorAction SilentlyContinue
    if ($constitution) {
        $contextParts += "CONSTITUTION: $($constitution.Substring(0, [Math]::Min(800, $constitution.Length)))"
    }
}

# 7. Check for pending type errors
$typeCheckResult = pnpm turbo run type-check --dry-run 2>&1
if ($LASTEXITCODE -ne 0) {
    $contextParts += "WARNING: Type check may have errors"
}

# Build final context string
$context = $contextParts -join " | "

# Output JSON for Claude Code
$output = @{
    hookSpecificOutput = @{
        hookEventName = "SessionStart"
        additionalContext = "SESSION CONTEXT: $context"
    }
} | ConvertTo-Json -Depth 3 -Compress

Write-Output $output
exit 0

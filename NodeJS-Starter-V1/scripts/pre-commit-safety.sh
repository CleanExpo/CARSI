#!/bin/bash

# =============================================================================
# Pre-commit Safety Hook
# Prevents accidental commits of sensitive data
# =============================================================================

echo "🔒 Running pre-commit safety checks..."

# -----------------------------------------------------------------------------
# Check for API keys in staged files
# -----------------------------------------------------------------------------

PATTERNS=(
  "sk_live_"
  "sk-ant-api"
  "AKIA[0-9A-Z]{16}"
  "-----BEGIN RSA PRIVATE KEY-----"
  "-----BEGIN OPENSSH PRIVATE KEY-----"
)

for pattern in "${PATTERNS[@]}"; do
  if git diff --cached --name-only | xargs grep -l "$pattern" 2>/dev/null; then
    echo "❌ ERROR: Found sensitive pattern '$pattern' in staged files!"
    echo "Remove the sensitive data before committing."
    exit 1
  fi
done

# -----------------------------------------------------------------------------
# Check for .env files being committed
# -----------------------------------------------------------------------------

if git diff --cached --name-only | grep -E "^\.env$|^\.env\.staging$|^\.env\.production$"; then
  echo "❌ ERROR: Attempting to commit .env file!"
  echo "Only .env.development and .env.production.template should be committed."
  exit 1
fi

# -----------------------------------------------------------------------------
# Check for large files
# -----------------------------------------------------------------------------

MAX_SIZE=5242880  # 5MB

for file in $(git diff --cached --name-only); do
  if [ -f "$file" ]; then
    size=$(wc -c < "$file")
    if [ "$size" -gt "$MAX_SIZE" ]; then
      echo "❌ ERROR: File $file is larger than 5MB ($size bytes)"
      echo "Consider using Git LFS for large files."
      exit 1
    fi
  fi
done

echo "✅ Pre-commit safety checks passed"
exit 0

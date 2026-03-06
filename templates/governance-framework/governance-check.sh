#!/usr/bin/env bash
# Governance Framework Installation Checker
# Run: bash scripts/governance-check.sh
# Verifies all required governance files are present.

set -e

PASS=0
FAIL=0
WARN=0

check_file() {
  local path="$1"
  local required="$2"
  if [ -f "$path" ]; then
    echo "  ✅ $path"
    PASS=$((PASS + 1))
  elif [ "$required" = "required" ]; then
    echo "  ❌ MISSING (required): $path"
    FAIL=$((FAIL + 1))
  else
    echo "  ⚠️  MISSING (optional): $path"
    WARN=$((WARN + 1))
  fi
}

check_dir() {
  local path="$1"
  local required="$2"
  if [ -d "$path" ]; then
    echo "  ✅ $path/"
    PASS=$((PASS + 1))
  elif [ "$required" = "required" ]; then
    echo "  ❌ MISSING (required): $path/"
    FAIL=$((FAIL + 1))
  else
    echo "  ⚠️  MISSING (optional): $path/"
    WARN=$((WARN + 1))
  fi
}

echo ""
echo "🔍 Governance Framework Check"
echo "================================"
echo ""

echo "📋 Core Constitution:"
check_file "memory.md" "required"
check_file "CLAUDE.md" "required"
check_file ".claude/memory/CONSTITUTION.md" "required"
echo ""

echo "📁 Agent Framework Docs:"
check_dir "docs/agent-framework" "required"
check_file "docs/agent-framework/SENIOR_PM_AGENT.md" "required"
check_file "docs/agent-framework/SENIOR_ORCHESTRATOR_AGENT.md" "required"
check_file "docs/agent-framework/SENIOR_SPECIALIST_AGENTS.md" "required"
check_file "docs/agent-framework/SUB_AGENT_PROTOCOL.md" "required"
check_file "docs/agent-framework/RECOMMENDED_SKILL_MAP.md" "required"
echo ""

echo "🛠  Governance Skills:"
check_file ".skills/custom/outcome-translator/SKILL.md" "required"
check_file ".skills/custom/definition-of-done-builder/SKILL.md" "required"
check_file ".skills/custom/blueprint-first/SKILL.md" "required"
check_file ".skills/custom/finished-audit/SKILL.md" "required"
check_file ".skills/custom/evidence-verifier/SKILL.md" "required"
check_file ".skills/custom/model-currency-checker/SKILL.md" "required"
check_file ".skills/custom/visual-excellence-enforcer/SKILL.md" "required"
check_file ".skills/custom/delegation-planner/SKILL.md" "required"
echo ""

echo "🤖 AI Module:"
check_file "src/ai/model-registry/index.ts" "required"
check_file "src/ai/model-registry/providers/gemini.ts" "required"
check_file "src/ai/version-checks/check-model-currency.ts" "required"
check_file "src/ai/graphics/routing-policy.ts" "required"
check_file "src/ai/audits/visual-audit.ts" "required"
echo ""

echo "📦 Templates:"
check_dir "templates/governance-framework" "optional"
echo ""

echo "================================"
echo "Results: ✅ $PASS passed | ⚠️  $WARN warnings | ❌ $FAIL failed"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "❌ GOVERNANCE CHECK FAILED — $FAIL required files missing"
  echo "   Run: cp templates/governance-framework/* . to restore missing files"
  exit 1
else
  echo "✅ GOVERNANCE CHECK PASSED"
fi

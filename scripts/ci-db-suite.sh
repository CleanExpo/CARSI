#!/usr/bin/env bash
# Run one database-backed npm test script in CI and FAIL if it did not actually run.
#
# WHY THIS WRAPPER EXISTS
#
# Every suite in this family is written to skip loudly rather than fail when there is no
# database: without DATABASE_URL they print "SKIPPED (not a pass)" and exit 0. That is right for
# a developer running them by hand, and wrong for CI, where exit 0 is the only thing the job
# reports. A misconfigured service, a renamed env var or a dropped `env:` block would give a
# green "Learner Data Protection" job that exercised nothing at all — a guard whose silence
# reads as a pass, which is the exact failure mode these suites exist to prevent.
#
# The same applies to a PARTIAL run: the suites print "PARTIAL" and name the cases they skipped
# when a fixture is missing (e.g. only one course in the database, so no rival owner exists).
# Those cases are not proven, so CI must not accept them.
#
# Usage: scripts/ci-db-suite.sh <npm-script-name>
set -uo pipefail

script="${1:?usage: ci-db-suite.sh <npm-script-name>}"
log="$(mktemp)"
trap 'rm -f "$log"' EXIT

if [ -z "${DATABASE_URL:-}" ]; then
  echo "::error::DATABASE_URL is unset, so '$script' would skip rather than run."
  exit 1
fi

npm run "$script" 2>&1 | tee "$log"
code=${PIPESTATUS[0]}

if grep -qE 'SKIPPED \(not a pass\)' "$log"; then
  echo "::error::'$script' SKIPPED instead of running — it exercised no database."
  exit 1
fi
if grep -qE '^⚠ PARTIAL|PARTIAL —' "$log"; then
  echo "::error::'$script' ran only PARTIALLY — some cases were not proven."
  exit 1
fi
if [ "$code" -ne 0 ]; then
  echo "::error::'$script' failed with exit code $code."
  exit "$code"
fi

echo "$script: ran and passed."

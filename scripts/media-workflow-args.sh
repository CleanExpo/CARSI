#!/usr/bin/env bash
# Builds the script arguments for .github/workflows/generate-course-media.yml.
# Inputs arrive only through env (never interpolated into the workflow's shell):
#   INPUT_MODE  plan | dry-run | generate
#   INPUT_SLUG  optional course slug
#   INPUT_LIMIT optional whole number
# Writes `phase=` and `extra=` to $GITHUB_OUTPUT.
#
# Each value is validated as ONE whole string with a bash regex. A line-based check
# (grep) passes "good-slug<newline>phase=..." because grep matches the first line, and
# the newline then forges extra lines in $GITHUB_OUTPUT. Bash [[ =~ ]] anchors ^ and $
# to the whole string, and the character classes exclude newline and carriage return.
set -euo pipefail

fail() { echo "::error::$1"; exit 1; }

case "${INPUT_MODE:-}" in
  plan)     PHASE="--plan" ;;
  dry-run)  PHASE="--generate --dry-run" ;;
  generate) PHASE="--generate --yes --persist=seed" ;;
  *)        fail "mode must be plan, dry-run or generate" ;;
esac

SLUG="${INPUT_SLUG:-}"
LIMIT="${INPUT_LIMIT:-}"
SLUG_RE='^[a-z0-9][a-z0-9-]{0,120}$'
LIMIT_RE='^[0-9]{1,4}$'

if [ -n "$SLUG" ] && ! [[ "$SLUG" =~ $SLUG_RE ]]; then
  fail "slug must be lowercase letters, digits and hyphens on one line"
fi
if [ -n "$LIMIT" ] && ! [[ "$LIMIT" =~ $LIMIT_RE ]]; then
  fail "limit must be a whole number on one line"
fi

EXTRA=""
if [ -n "$SLUG" ]; then EXTRA="$EXTRA --slug=$SLUG"; fi
if [ -n "$LIMIT" ]; then EXTRA="$EXTRA --limit=$LIMIT"; fi

: "${GITHUB_OUTPUT:?GITHUB_OUTPUT is not set}"
{
  echo "phase=$PHASE"
  echo "extra=$EXTRA"
} >> "$GITHUB_OUTPUT"

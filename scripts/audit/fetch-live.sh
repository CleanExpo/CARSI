#!/usr/bin/env bash
# GP-567 — refresh the live-site snapshot the audit reads from.
#
# Raw HTTP only. Never a summariser: GP-519 records a WebFetch summary
# fabricating CEC hours on these exact pages, and a naive regex then producing
# its own false positive. Both needed a positive control before the truth held.
#
# The snapshot is deliberately NOT committed — it is large and it goes stale.
# Re-run this before any audit cycle; inventory.json records the access date.
set -euo pipefail

DIR="$(git rev-parse --show-toplevel)/.audit-cache"
mkdir -p "$DIR"

fetch() {
  local url="$1" out="$2"
  local code
  code=$(curl -sS -A "Mozilla/5.0 (CARSI GP-567 audit)" "$url" -o "$DIR/$out" -w '%{http_code}')
  if [ "$code" != "200" ]; then
    echo "FAIL: $url returned HTTP $code — refusing to audit against a non-200 response" >&2
    exit 1
  fi
  printf '%-14s HTTP %s  %s bytes\n' "$out" "$code" "$(wc -c <"$DIR/$out" | tr -d ' ')"
}

fetch "https://carsi.com.au/courses" courses.html
fetch "https://carsi.com.au/sitemap.xml" sitemap.xml

echo "snapshot access date: $(date -u +%Y-%m-%d)"

#!/bin/bash
# CARSI SessionStart hook — installs dependencies so a Claude Code cloud session can run
# type-check, lint and the unit tests straight away.
#
# Runs synchronously: the session waits for it. That costs a few seconds at startup and buys
# the guarantee that nothing runs `npm run type-check` against an empty node_modules.
#
# Idempotent. The install only runs when a file that decides what gets installed has changed
# since it last succeeded. The hash file lives inside node_modules, so it disappears with the
# packages it describes — a container that keeps the checkout but loses node_modules reinstalls
# rather than skipping. node_modules is gitignored (.gitignore:4), so the file is never staged.
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}"

# Local machines manage their own dependencies; this hook is for cloud sessions only.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

hashes=node_modules/.session-start.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  # Drop the old hashes first: if the install dies partway, the next session retries it
  # instead of trusting a stale pass.
  rm -f "$hashes"

  # `npm install` rather than `npm ci`: it reuses whatever the cached container image already
  # has instead of deleting node_modules and starting over. The lockfile is still respected.
  # postinstall runs `prisma generate`, which writes the client to src/generated/prisma —
  # type-check and build both fail without it. It needs no live database: prisma.config.ts
  # falls back to a generate-only placeholder URL when DATABASE_URL is unset.
  #
  # Retried because the cloud session's egress proxy intermittently resets a tunnel mid-
  # transfer (observed: one ECONNRESET in two runs while writing this hook). A reset leaves a
  # half-written node_modules, which the next attempt repairs. After the last attempt the
  # non-zero status stands and set -e ends the hook with no hash file written, so the next
  # session installs again rather than trusting a partial tree.
  attempt=1
  until npm install --no-audit --no-fund; do
    if [ "$attempt" -ge 3 ]; then
      echo "session-start: npm install failed after $attempt attempts" >&2
      exit 1
    fi
    echo "session-start: npm install failed (attempt $attempt), retrying..." >&2
    attempt=$((attempt + 1))
    sleep $((attempt * 5))
  done

  # Everything that decides what the install produces. prisma/schema.prisma and
  # prisma.config.ts are here because they change the generated client, not the packages.
  sha256sum \
    .claude/hooks/session-start.sh \
    package.json \
    package-lock.json \
    prisma/schema.prisma \
    prisma.config.ts \
    > "$hashes" || rm -f "$hashes"
fi

# Not installed here: Playwright browsers (already in the cloud image) and Postgres. `npm run
# test:e2e` and `npm run test:pg` need a live database and stay a CI job — see ci.yml.

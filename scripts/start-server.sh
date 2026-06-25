#!/bin/sh
# Start Next.js standalone server — works in Docker (/app) and App Platform buildpack (/workspace).
set -e

export PORT="${PORT:-8080}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"

if [ -f server.js ]; then
  echo "Starting Next.js from $(pwd)/server.js"
  exec node server.js
fi

if [ -f .next/standalone/server.js ]; then
  echo "Starting Next.js from $(pwd)/.next/standalone/server.js"
  cd .next/standalone
  exec node server.js
fi

echo "ERROR: server.js not found. Expected ./server.js (Docker) or ./.next/standalone/server.js (buildpack)."
echo "cwd=$(pwd)"
ls -la .next 2>/dev/null || echo "no .next directory"
exit 1

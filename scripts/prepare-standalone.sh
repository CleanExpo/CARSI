#!/bin/sh
# Copy static assets into Next.js standalone output (required for App Platform /workspace deploys).
set -e

if [ ! -f .next/standalone/server.js ]; then
  echo "prepare-standalone: no .next/standalone/server.js — skipping."
  exit 0
fi

mkdir -p .next/standalone/.next
if [ -d .next/static ]; then
  cp -r .next/static .next/standalone/.next/static
fi
if [ -d public ]; then
  cp -r public .next/standalone/public
fi

echo "prepare-standalone: ready at .next/standalone/server.js"

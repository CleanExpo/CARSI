#!/usr/bin/env bash
# DigitalOcean / Docker production boot: migrate then serve (no deploy-time course seeding).
set -euo pipefail
bash ./scripts/do-migrate.sh
exec node server.js

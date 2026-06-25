#!/bin/sh
set -e

# Run migrations at container start (runtime), not during image build.
# DigitalOcean App Platform build networks are often blocked by DB trusted sources.
if [ -n "$DATABASE_URL" ] && [ -x ./node_modules/.bin/prisma ]; then
  ./node_modules/.bin/prisma migrate deploy
fi

exec node server.js

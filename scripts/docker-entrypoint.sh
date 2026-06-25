#!/bin/sh
set -e

# Run migrations at container start (runtime), not during image build.
# Requires the App Platform app in the database Trusted Sources (DO console).
if [ -n "$DATABASE_URL" ] && [ -x ./node_modules/.bin/prisma ]; then
  echo "Running prisma migrate deploy..."
  attempts=0
  max_attempts=5
  until ./node_modules/.bin/prisma migrate deploy; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge "$max_attempts" ]; then
      echo "ERROR: prisma migrate deploy failed after ${max_attempts} attempts."
      echo "If you see P1001, add this App Platform app to the database Trusted Sources:"
      echo "  DigitalOcean → Databases → your cluster → Settings → Trusted Sources → App Platform → carsi"
      exit 1
    fi
    echo "Migrate attempt ${attempts} failed; retrying in 5s..."
    sleep 5
  done
fi

echo "Starting Next.js server..."
exec node server.js

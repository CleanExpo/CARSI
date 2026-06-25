#!/bin/sh
set -e

normalize_do_database_url() {
  if [ -z "$DATABASE_URL" ]; then
    return
  fi
  if ! echo "$DATABASE_URL" | grep -q '\.db\.ondigitalocean\.com'; then
    return
  fi
  case "$DATABASE_URL" in
    *sslmode=*) ;;
    *\?*) DATABASE_URL="${DATABASE_URL}&sslmode=require" ;;
    *) DATABASE_URL="${DATABASE_URL}?sslmode=require" ;;
  esac
  export DATABASE_URL
  case "$DATABASE_URL" in
    *uselibpqcompat=*) ;;
    *) DATABASE_URL="${DATABASE_URL}&uselibpqcompat=true" ;;
  esac
  export DATABASE_URL
}

normalize_do_database_url

if [ "$PRISMA_MIGRATE_ON_START" = "true" ] && [ -n "$DATABASE_URL" ] && [ -x ./node_modules/.bin/prisma ]; then
  echo "PRISMA_MIGRATE_ON_START=true — running prisma migrate deploy..."
  if ! ./node_modules/.bin/prisma migrate deploy; then
    echo "WARN: prisma migrate deploy failed; starting app anyway."
  fi
else
  echo "Skipping prisma migrate on start (PRISMA_MIGRATE_ON_START is not true)."
fi

exec sh ./scripts/start-server.sh

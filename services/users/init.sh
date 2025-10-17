#!/usr/bin/env bash
set -euo pipefail

# run from project root (script location)
cd "$(dirname "$0")"

echo "Ensuring db directory exists..."
mkdir -p db

# if first arg is "dev" use test DB
if [ "${1:-}" = "dev" ]; then
  rm db/test.sqlite
  echo "Initializing test DB (dev mode)..."
  export DATABASE_URL="file:$(pwd)/db/test.sqlite"
  echo "Using DATABASE_URL=$DATABASE_URL"
else
  # default DATABASE_URL if not provided
  if [ -z "${DATABASE_URL:-}" ]; then
    export DATABASE_URL="file:$(pwd)/db/users.sqlite"
    echo "DATABASE_URL not set, using: $DATABASE_URL"
  fi
fi

echo "Running prisma generate..."
npx prisma generate

echo "Applying schema to the database (prisma db push)..."
npx prisma db push

# run test seeder when in dev mode
if [ "${1:-}" = "dev" ]; then
  if [ -f ./scripts/seedTest.ts ]; then
    echo "Running test seeder..."
    node ./scripts/seedTest.ts
  else
    echo "No scripts/seedTest.ts found - skipping seeding"
  fi
fi

echo "Done"

#!/usr/bin/env bash
set -euo pipefail

# run from project root (script location)
cd "$(dirname "$0")"

echo "Ensuring db directory exists..."
mkdir -p db

# default DATABASE_URL if not provided
if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="file:$(pwd)/db/users.sqlite"
  echo "DATABASE_URL not set, using: $DATABASE_URL"
fi

echo "Running prisma generate..."
npx prisma generate

echo "Applying schema to the database (prisma db push)..."
npx prisma db push

#!/bin/sh
# Apply migrations at start (the database isn't reachable at image build time),
# optionally seed dev data into an empty database, then run the service.
set -e
npx prisma migrate deploy
if [ "${SEED_DEV_DATA:-false}" = "true" ]; then
  node src/db/prisma/seeds/seed-if-empty.ts
fi
exec node src/server.ts

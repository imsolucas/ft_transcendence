#!/bin/sh
# Restore a backup made by backup.sh. Usage (inside the backup container):
#   /backup/restore.sh db-20261118T030000Z.dump [uploads-20261118T030000Z.tar.gz]
#
# The database is replaced atomically: the schema is dropped and the dump replayed in ONE
# transaction, so a failure leaves the current data untouched. Dropping the whole schema
# (not just the dumped objects) also removes tables added by newer migrations; the users
# service re-applies any newer migrations when it starts again.
set -eu
db="/backups/${1:?usage: restore.sh <db-dump> [uploads-archive]}"
[ -f "$db" ] || { echo "no such backup: $db"; exit 1; }
case "$db" in *.tmp) echo "refusing an unfinished backup: $db"; exit 1;; esac

export PGPASSWORD="$POSTGRES_PASSWORD"
# 1. convert the dump to SQL first: a bad, truncated or wrong file fails HERE (set -e),
#    before the database is touched
sql=$(mktemp /tmp/restore.XXXXXX)
trap 'rm -f "$sql"' EXIT
pg_restore --no-owner --no-privileges --file "$sql" "$db"
[ -s "$sql" ] || { echo "backup produced no SQL: $db"; exit 1; }
# 2. replace the schema and replay it in ONE transaction; any SQL error rolls everything back
psql -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" --quiet --single-transaction -v ON_ERROR_STOP=1 \
  -c 'DROP SCHEMA public CASCADE' -c 'CREATE SCHEMA public' -f "$sql" >/dev/null

if [ -n "${2:-}" ]; then
  up="/backups/$2"
  [ -f "$up" ] || { echo "no such uploads archive: $up"; exit 1; }
  # extract next to the old files first, then swap, so a bad archive keeps the old avatars
  tmp=$(mktemp -d /uploads/.restore.XXXXXX)
  tar -xzf "$up" -C "$tmp"
  find /uploads -mindepth 1 -maxdepth 1 ! -path "$tmp" -exec rm -rf {} +
  find "$tmp" -mindepth 1 -maxdepth 1 -exec mv {} /uploads/ \;
  rmdir "$tmp"
fi
echo "restore ok from $1${2:+ and $2}"

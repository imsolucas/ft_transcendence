#!/bin/sh
# Restore a backup made by backup.sh. Usage (inside the backup container):
#   /backup/restore.sh db-20261118T030000Z.dump [uploads-20261118T030000Z.tar.gz]
# Replaces the database contents and (optionally) the uploaded avatars.
set -eu
db="/backups/$1"
[ -f "$db" ] || { echo "no such backup: $db"; exit 1; }
PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner --single-transaction "$db"
if [ "${2:-}" != "" ]; then
  up="/backups/$2"
  [ -f "$up" ] || { echo "no such uploads archive: $up"; exit 1; }
  find /uploads -mindepth 1 -delete
  tar -xzf "$up" -C /uploads
fi
echo "restore ok from $1${2:+ and $2}"

#!/bin/sh
# One backup: a compressed pg_dump of the database and a tarball of uploaded avatars,
# written to /backups with a UTC timestamp. Old backups beyond BACKUP_KEEP_DAYS are deleted.
set -eu
stamp=$(date -u +%Y%m%dT%H%M%SZ)
out=/backups
mkdir -p "$out"

PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --format=custom --no-owner --file "$out/db-$stamp.dump"
tar -czf "$out/uploads-$stamp.tar.gz" -C /uploads .

# keep the newest backups only
find "$out" -name 'db-*.dump' -mtime "+${BACKUP_KEEP_DAYS:-7}" -delete
find "$out" -name 'uploads-*.tar.gz' -mtime "+${BACKUP_KEEP_DAYS:-7}" -delete
echo "backup ok: $out/db-$stamp.dump ($(du -h "$out/db-$stamp.dump" | cut -f1)), uploads-$stamp.tar.gz"

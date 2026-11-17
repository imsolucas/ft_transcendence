#!/bin/sh
# One backup: a compressed pg_dump of the database and a tarball of uploaded avatars,
# written to /backups with a UTC timestamp. Old backups beyond BACKUP_KEEP_DAYS are deleted.
# Files are private (0600): the dump holds password hashes, sessions and 2FA secrets.
set -eu
umask 077
stamp=$(date -u +%Y%m%dT%H%M%SZ)
out=/backups
mkdir -p "$out"

# write to *.tmp and rename on success, so a failed run never leaves a valid-looking file
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --format=custom --no-owner --file "$out/db-$stamp.dump.tmp"
mv "$out/db-$stamp.dump.tmp" "$out/db-$stamp.dump"
tar -czf "$out/uploads-$stamp.tar.gz.tmp" -C /uploads .
mv "$out/uploads-$stamp.tar.gz.tmp" "$out/uploads-$stamp.tar.gz"

# keep the newest backups only (and clean up leftovers of interrupted runs)
find "$out" -name 'db-*.dump' -mtime "+${BACKUP_KEEP_DAYS:-7}" -delete
find "$out" -name 'uploads-*.tar.gz' -mtime "+${BACKUP_KEEP_DAYS:-7}" -delete
find "$out" -name '*.tmp' -mmin +60 -delete
echo "backup ok: $out/db-$stamp.dump ($(du -h "$out/db-$stamp.dump" | cut -f1)), uploads-$stamp.tar.gz"

#!/bin/sh
# Runs backup.sh now and then every BACKUP_INTERVAL_HOURS (default 24).
set -u
while true; do
  /backup/backup.sh || echo "backup FAILED at $(date -u)"
  sleep "$(( ${BACKUP_INTERVAL_HOURS:-24} * 3600 ))"
done

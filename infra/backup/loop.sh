#!/bin/sh
# Runs backup.sh now and then every BACKUP_INTERVAL_HOURS (default 24).
set -u
while true; do
  /backup/backup.sh || echo "backup FAILED at $(date -u)"
  hours=${BACKUP_INTERVAL_HOURS:-24}
  [ "$hours" -ge 1 ] 2>/dev/null || hours=1   # never a tight loop (0, empty or not a number)
  sleep "$(( hours * 3600 ))"
done

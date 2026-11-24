#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
umask 077
mkdir -p backups
file="backups/luatvietduc-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose exec -T database pg_dump -U lvd -d luatvietduc -Fc > "$file"
test -s "$file"
printf 'Backup created: %s\n' "$file"
# Transfer encrypted copies off this VPS once the approved backup destination is connected.
# This script never deletes old backups or restores into a live database.

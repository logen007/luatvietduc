#!/usr/bin/env bash
# One-time, app-specific worker installation; no shared proxy or service changes.
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo 'Run in the privileged maintenance session'; exit 1; }
for binary in docker rclone age python3; do command -v "$binary" >/dev/null || { echo "Missing prerequisite: $binary"; exit 1; }; done
install -d -m 700 /var/lib/luatvietduc-backup /usr/local/lib/luatvietduc-backup
install -m 700 "$(dirname "$0")/runner.py" /usr/local/lib/luatvietduc-backup/runner.py
cat > /etc/systemd/system/luatvietduc-backup.service <<'UNIT'
[Unit]
Description=Luật Việt Đức private backup queue runner
After=docker.service
Requires=docker.service
[Service]
Type=oneshot
ExecStart=/usr/bin/python3 /usr/local/lib/luatvietduc-backup/runner.py
TimeoutStartSec=35min
UMask=0077
Nice=15
IOSchedulingClass=idle
CPUQuota=100%
MemoryMax=512M
PrivateTmp=true
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/luatvietduc-backup
[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/systemd/system/luatvietduc-backup.timer <<'UNIT'
[Unit]
Description=Check Luật Việt Đức backup queue each minute
[Timer]
OnBootSec=90s
OnUnitInactiveSec=60s
Persistent=true
[Install]
WantedBy=timers.target
UNIT
cat > /etc/systemd/system/luatvietduc-backup-schedule.service <<'UNIT'
[Unit]
Description=Queue Luật Việt Đức daily backup at 03:00 Vietnam time
After=docker.service
Requires=docker.service
[Service]
Type=oneshot
ExecStart=/usr/bin/python3 /usr/local/lib/luatvietduc-backup/runner.py --schedule
TimeoutStartSec=35min
UMask=0077
Nice=15
IOSchedulingClass=idle
CPUQuota=100%
MemoryMax=512M
PrivateTmp=true
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/luatvietduc-backup
UNIT
cat > /etc/systemd/system/luatvietduc-backup-schedule.timer <<'UNIT'
[Unit]
Description=Luật Việt Đức daily backup at 03:00 Asia/Ho_Chi_Minh
[Timer]
OnCalendar=*-*-* 03:00:00 Asia/Ho_Chi_Minh
AccuracySec=1s
RandomizedDelaySec=0
Persistent=false
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now luatvietduc-backup.timer luatvietduc-backup-schedule.timer

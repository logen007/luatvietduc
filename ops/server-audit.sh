#!/usr/bin/env bash
# Read-only inventory. No sudo, installs, env dumps, inspect, log reading or writes.
set -u
section() { printf '\n=== %s ===\n' "$1"; }
run() {
  if command -v "$1" >/dev/null 2>&1; then
    if command -v timeout >/dev/null 2>&1; then timeout 15s "$@" || true; else "$@" || true; fi
  else printf 'Unavailable: %s\n' "$1"; fi
}
section 'READ-ONLY: no server configuration is changed'
section 'OS / architecture / CPUs'
if [ -r /etc/os-release ]; then grep '^PRETTY_NAME=' /etc/os-release; fi
run uname -m
run nproc
section 'Uptime / RAM / filesystem'
run uptime
run free -h
run df -h / /var/lib/docker
section 'Docker version / Compose'
run docker --version
run docker compose version
section 'Running containers (no environments or logs)'
run docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
section 'Container resource usage'
run docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'
section 'Listening TCP ports only'
if command -v ss >/dev/null 2>&1; then
  ss -H -lnt 2>/dev/null | awk '{p=$4; sub(/^.*:/,"",p); print p}' | sort -nu
fi
section 'Local runtime versions'
run node --version
run npm --version
section 'End: review output before sharing; no secrets were requested'

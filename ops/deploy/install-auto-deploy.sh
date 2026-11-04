#!/usr/bin/env bash
# Prepare the isolated release service. Enabling the timer is a separate action.
set -euo pipefail
if [[ ${EUID} -ne 0 ]]; then
  echo 'Run this one-time preparation as root on the existing Luat Viet Duc VPS.' >&2
  exit 1
fi
approved=${1:-}
if [[ ! "$approved" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Usage: install-auto-deploy.sh <reviewed-full-commit-sha>' >&2
  exit 1
fi
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
repo=/opt/luatvietduc
config_dir=/etc/luatvietduc-deploy
engine_dir=/usr/local/lib/luatvietduc-deploy
state_dir=/var/lib/luatvietduc-deploy
for executable in python3 git docker systemctl; do command -v "$executable" >/dev/null; done
if [[ -e "$config_dir/config.json" ]]; then
  echo 'An installed policy already exists. Review it before changing release permissions.' >&2
  exit 1
fi
[[ $(git -C "$repo" remote get-url origin) == 'https://github.com/logen007/luatvietduc.git' ]]
git -C "$repo" fetch origin feat/platform-cms-bootstrap
[[ $(git -C "$repo" rev-parse origin/feat/platform-cms-bootstrap) == "$approved" ]]
git -C "$repo" cat-file -e "$approved^{commit}"
export LVD_APPROVED_SHA="$approved" LVD_INSTALL_REPO="$repo"
umask 077
python3 - <<'PY'
import hashlib, json, os, pathlib, re, subprocess, urllib.request

repo = pathlib.Path(os.environ['LVD_INSTALL_REPO'])
approved = os.environ['LVD_APPROVED_SHA']
conf = pathlib.Path('/etc/luatvietduc-deploy')
engine = pathlib.Path('/usr/local/lib/luatvietduc-deploy')
state = pathlib.Path('/var/lib/luatvietduc-deploy')
env_file = repo / 'ops/deploy/.env'
font = repo / 'apps/cms/public/fonts/Articulat-web.woff2'
font_hash = '534cb5a9cffa314d6a2cf3b032f4e15fe5a5f81b46f8bb0809f7789a092181e6'
assert env_file.is_file(), 'Existing production environment is required'
assert hashlib.sha256(font.read_bytes()).hexdigest() == font_hash, 'Licensed font mismatch'
image = subprocess.check_output(['docker', 'inspect', '--format', '{{.Config.Image}}', 'luatvietduc-web-1'], text=True).strip()
match = re.fullmatch(r'luatvietduc-web:([0-9a-f]{7,40})', image)
assert match, 'Current image must have an immutable commit tag'
initial_release = match.group(1)
initial_sha = subprocess.check_output(['git', '-C', str(repo), 'rev-parse', initial_release + '^{commit}'], text=True).strip()
with urllib.request.urlopen('http://127.0.0.1:3049/health/ready', timeout=10) as r:
    assert r.status == 200 and json.load(r).get('status') == 'ready', 'Existing production is not ready'

def source(path):
    return subprocess.check_output(['git', '-C', str(repo), 'show', approved + ':' + path])

source_paths = ['ops/deploy/auto-release.py', 'ops/deploy/compose.yml', 'ops/deploy/Dockerfile', '.github/workflows/platform-foundation.yml']
sources = {p: source(p) for p in source_paths}
# Freeze Compose on the server. Build contexts and migration commands are excluded.
# Names, network memberships, limits and labels preserve the existing deployment.
compose = sources['ops/deploy/compose.yml'].decode()
build_block = '    build:\n      context: ../..\n      dockerfile: ops/deploy/Dockerfile\n'
assert compose.count(build_block) == 1 and compose.count('    env_file: .env\n') == 1
compose = compose.replace(build_block, '').replace('    env_file: .env\n', '    env_file: ' + str(env_file) + '\n')
image_line = '    image: luatvietduc-web:${RELEASE:-local}\n'
assert compose.count(image_line) == 1
compose = compose.replace(image_line, image_line + '    command: [npx, next, start, --hostname, 0.0.0.0]\n')
for directory in (conf, engine, state):
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
(state / 'docker/buildx').mkdir(mode=0o700, parents=True, exist_ok=True)
(repo / 'ops/deploy/backups').mkdir(mode=0o700, parents=True, exist_ok=True)
(conf / 'compose.yml').write_text(compose)
(conf / 'Articulat-web.woff2').write_bytes(font.read_bytes())
(engine / 'auto-release.py').write_bytes(sources['ops/deploy/auto-release.py'])
(engine / 'auto-release.py').chmod(0o700)
backup = '''#!/usr/bin/env bash
set -euo pipefail
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
umask 077
directory=/opt/luatvietduc/ops/deploy/backups
mkdir -p "$directory"
file="$directory/luatvietduc-auto-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose -f /etc/luatvietduc-deploy/compose.yml --env-file /opt/luatvietduc/ops/deploy/.env exec -T database pg_dump -U lvd -d luatvietduc -Fc > "$file"
test -s "$file"
docker compose -f /etc/luatvietduc-deploy/compose.yml --env-file /opt/luatvietduc/ops/deploy/.env exec -T database pg_restore --list < "$file" > /dev/null
printf 'Backup verified: %s\\n' "$file"
'''
(conf / 'backup.sh').write_text(backup)
(conf / 'backup.sh').chmod(0o700)
config = dict(repo_url='https://github.com/logen007/luatvietduc.git', repo_full_name='logen007/luatvietduc',
    branch='feat/platform-cms-bootstrap', workflow_path='.github/workflows/platform-foundation.yml',
    state_dir=str(state), compose_file=str(conf / 'compose.yml'), env_file=str(env_file),
    backup_script=str(conf / 'backup.sh'), font_file=str(conf / 'Articulat-web.woff2'),
    font_sha256=font_hash, app_url='https://luatvietduc.com', initial_sha=initial_sha,
    initial_release=initial_release, poll_seconds=15,
    policy_hashes={p: hashlib.sha256(data).hexdigest() for p, data in sources.items()})
(conf / 'config.json').write_text(json.dumps(config, indent=2) + '\n')
subprocess.run(['docker', 'compose', '-f', str(conf / 'compose.yml'), '--env-file', str(env_file), 'config', '--quiet'], check=True)
print('Prepared fixed policy for reviewed commit ' + approved)
print('Existing application image retained: ' + image)
PY
cat > /etc/systemd/system/luatvietduc-release.service <<'UNIT'
[Unit]
Description=Deploy a verified Luat Viet Duc commit
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
User=root
WorkingDirectory=/var/lib/luatvietduc-deploy
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=HOME=/var/lib/luatvietduc-deploy
Environment=GIT_CONFIG_GLOBAL=/dev/null
Environment=GIT_CONFIG_NOSYSTEM=1
Environment=DOCKER_CONFIG=/var/lib/luatvietduc-deploy/docker
Environment=BUILDX_CONFIG=/var/lib/luatvietduc-deploy/docker/buildx
ExecStart=/usr/bin/python3 /usr/local/lib/luatvietduc-deploy/auto-release.py --once
UMask=0077
Nice=10
NoNewPrivileges=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/var/lib/luatvietduc-deploy /opt/luatvietduc/ops/deploy/backups
PrivateTmp=true
TimeoutStartSec=20min
UNIT
cat > /etc/systemd/system/luatvietduc-release.timer <<'UNIT'
[Unit]
Description=Check for verified Luat Viet Duc updates every 15 seconds

[Timer]
OnBootSec=90s
OnUnitInactiveSec=15s
AccuracySec=1s
Unit=luatvietduc-release.service

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemd-analyze verify /etc/systemd/system/luatvietduc-release.service /etc/systemd/system/luatvietduc-release.timer
printf '%s\n' 'Prepared only. The timer has NOT been enabled or started.'
printf '%s\n' 'After approval: systemctl enable --now luatvietduc-release.timer'

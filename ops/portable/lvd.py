#!/usr/bin/env python3
"""Portable, app-scoped installation. Python stdlib + Docker Compose; age for exports.

No build, proxy/DNS changes, scheduled backup changes, down migrations or pruning.
Only roots created by this tool and their randomly named Compose project are writable.
"""
import argparse
import contextlib
import fcntl
import getpass
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import secrets
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.parse
import urllib.request

HERE = Path(__file__).resolve().parent
IMAGE = re.compile(r'sha256:[0-9a-f]{64}')
COMMIT = re.compile(r'[0-9a-f]{40}')
PROJECT = re.compile(r'lvd-portable-[0-9a-f]{16}')

def require(value, message):
    if not value:
        raise RuntimeError(message)

def run(args, *, data=None, output=None, timeout=120):
    # Never relay child stderr: it can include passwords, connection strings or documents.
    result = subprocess.run(args, input=data, stdout=output or subprocess.PIPE,
                            stderr=subprocess.PIPE, timeout=timeout, check=False)
    require(result.returncode == 0, 'Command failed: ' + Path(args[0]).name)
    return result.stdout

def sha(file):
    digest = hashlib.sha256()
    with Path(file).open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()

def write_json(file, value):
    temporary = file.with_suffix('.tmp')
    with open(temporary, 'w', opener=lambda p, f: os.open(p, f, 0o600)) as target:
        json.dump(value, target)
    os.replace(temporary, file)

def release(package):
    package = package.resolve()
    value = json.loads((package / 'release.json').read_text())
    require(value.get('format') == 1 and COMMIT.fullmatch(value.get('commit', ''))
            and IMAGE.fullmatch(value.get('image', '')), 'Invalid package manifest')
    require(re.fullmatch(r'[0-9a-f]{64}', value.get('archive_sha256', '')),
            'Missing image checksum')
    require(re.fullmatch(r'\d{2}\.\d{2}\.\d{2}', value.get('version', '')),
            'Invalid release version')
    require(isinstance(value.get('migrations'), list) and value['migrations']
            and all(re.fullmatch(r'[0-9a-z_]+', m) for m in value['migrations'])
            and len(set(value['migrations'])) == len(value['migrations']), 'Invalid migrations')
    require(sha(package / 'image.tar.gz') == value['archive_sha256'], 'Image checksum mismatch')
    run(['docker', 'load', '--input', str(package / 'image.tar.gz')], timeout=600)
    info = json.loads(run(['docker', 'image', 'inspect', value['image']]))[0]
    require(info['Id'] == value['image'] and
            info['Config']['Labels']['org.opencontainers.image.revision'] == value['commit'],
            'Image revision mismatch')
    inner = json.loads(run(['docker', 'run', '--rm', '--network', 'none', value['image'],
                           'node', '-e', "process.stdout.write(require('fs').readFileSync('portable-release.json','utf8'))"]))
    require(all(inner.get(k) == value[k] for k in ('version', 'commit', 'migrations')),
            'Image catalog mismatch')
    return value

def origin(value):
    url = urllib.parse.urlsplit(value)
    require(url.scheme in ('http', 'https') and url.hostname and not url.username
            and not url.password and url.path in ('', '/') and not url.query and not url.fragment,
            'Use a website origin, for example https://example.com')
    require(not re.search(r'[\s\x00-\x1f$]', value), 'Invalid website origin')
    return value.rstrip('/')

def environment(file):
    # Our generated env is deliberately plain, never evaluated as a shell script.
    values = dict(line.split('=', 1) for line in file.read_text().splitlines() if line)
    require(re.fullmatch('[0-9a-f]{64}', values.get('PAYLOAD_SECRET', ''))
            and re.fullmatch('[0-9a-f]{64}', values.get('DB_PASSWORD', '')), 'Invalid recovery keys')
    require(set(values) == {'PAYLOAD_SECRET', 'DB_PASSWORD', 'APP_URL'}, 'Unexpected recovery environment')
    origin(values['APP_URL'])
    return values

class Site:
    def __init__(self, root):
        self.root = root.resolve()
        self.config = json.loads((self.root / 'config.json').read_text())
        require(self.config.get('format') == 1 and PROJECT.fullmatch(self.config.get('project', '')),
                'Not a portable installation')
        require(type(self.config.get('port')) is int and 1024 <= self.config['port'] <= 65535,
                'Invalid local port')
        self.values = environment(self.root / 'runtime.env')
        require((self.root / 'runtime.env').stat().st_mode & 0o077 == 0, 'runtime.env must be private (0600)')
        self.state = json.loads((self.root / 'state.json').read_text())
        require(IMAGE.fullmatch(self.state.get('image', '')), 'Missing installed image')
        require(sha(self.root / 'compose.yml') == self.config['compose_sha256'], 'Compose file changed; review before running')

    @contextlib.contextmanager
    def lock(self):
        with (self.root / 'operation.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            yield

    def compose(self, *args, image=None, data=None, output=None, timeout=120):
        env = {**os.environ, **self.values, 'LVD_IMAGE': image or self.state['image'],
               'LVD_PORT': str(self.config['port'])}
        # Fixed compose file/project; do not inherit a user's COMPOSE_FILE or project.
        env.pop('COMPOSE_FILE', None)
        result = subprocess.run(['docker', 'compose', '--project-name', self.config['project'],
                                 '--project-directory', str(self.root), '--env-file', str(self.root / 'runtime.env'),
                                 '-f', str(self.root / 'compose.yml'), *args], env=env, input=data,
                                stdout=output or subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
        require(result.returncode == 0, 'Compose failed: ' + str(args[0]))
        return result.stdout

    def tool(self, action, *, image=None, transfer=None, data=None):
        args = ['run', '--rm', '--no-deps', '-T', '-e', 'LVD_WORKERS_DISABLED=1']
        if transfer:
            args += ['--user', str(os.getuid()) + ':' + str(os.getgid()), '-v', str(transfer) + ':/transfer']
        return self.compose(*args, 'web', 'node', 'maintenance/manage.mjs', action,
                            image=image, data=data, timeout=900)

    def stop(self):
        self.compose('stop', 'web', 'indexer')

    def start(self):
        require(not (self.root / 'operation.json').exists(), 'Interrupted update; inspect operation.json before recovery')
        self.compose('up', '-d', '--wait', 'database', 'vectors', 'web', 'indexer', timeout=180)
        self.probe()

    def probe(self):
        base = 'http://127.0.0.1:' + str(self.config['port'])
        for route in ['/health/ready', '/', '/admin/login', '/live.css', '/customer-chat.css', '/fonts/Inter-latin.woff2']:
            with urllib.request.urlopen(base + route, timeout=20) as response:
                require(response.status == 200 and response.read(1), 'Application probe failed')

def create(root, metadata, url, port, recovery=None, fonts=None):
    root = root.resolve()
    require(not root.exists() or not any(root.iterdir()), 'Installation directory must be empty')
    require(1024 <= port <= 65535, 'Use a local port between 1024 and 65535')
    url = origin(url)
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    root.chmod(0o700)
    shutil.copyfile(HERE / 'compose.yml', root / 'compose.yml')
    shutil.copyfile(HERE / 'lvd.py', root / 'lvd.py')
    shutil.copyfile(HERE / 'backup-worker.py', root / 'backup-worker.py')
    runner = HERE / 'backup-runner.py'
    shutil.copyfile(runner if runner.exists() else HERE.parent / 'backup/runner.py', root / 'backup-runner.py')
    config = {'format': 1, 'project': 'lvd-portable-' + secrets.token_hex(8), 'port': port,
              'compose_sha256': sha(root / 'compose.yml')}
    write_json(root / 'config.json', config)
    write_json(root / 'state.json', metadata)
    secret = recovery['PAYLOAD_SECRET'] if recovery else secrets.token_hex(32)
    with open(root / 'runtime.env', 'x', opener=lambda p, f: os.open(p, f, 0o600)) as target:
        target.write('APP_URL=' + url + '\nDB_PASSWORD=' + secrets.token_hex(32) + '\nPAYLOAD_SECRET=' + secret + '\n')
    fontdir = root / 'fonts'
    fontdir.mkdir(mode=0o755)
    run(['docker', 'run', '--rm', '--network', 'none', '--user', str(os.getuid()) + ':' + str(os.getgid()),
         '-v', str(fontdir) + ':/transfer', metadata['image'], 'node', '-e',
         "require('fs').cpSync('/app/public/fonts','/transfer',{recursive:true})"])
    if fonts:
        for file in fonts.iterdir():
            require(file.is_file() and not file.is_symlink() and re.fullmatch(r'[A-Za-z0-9_.-]+\.(woff2|css|txt|json)', file.name), 'Invalid font file')
            shutil.copyfile(file, fontdir / file.name)
    for file in fontdir.iterdir():
        file.chmod(0o644)
    return Site(root)

def owner(site):
    if sys.stdin.isatty():
        data = {'name': input('Tên Admin: '), 'email': input('Email Admin: '), 'password': getpass.getpass('Mật khẩu (ít nhất 16 ký tự): ')}
        require(data['password'] == getpass.getpass('Nhập lại mật khẩu: '), 'Passwords differ')
        data = json.dumps(data).encode()
    else:
        data = sys.stdin.buffer.read(8193)
        require(len(data) <= 8192, 'Owner input too large')
    site.tool('owner', data=data)
    print('Đã tạo Admin.')

def update(site, metadata, migrate=False):
    require(not (site.root / 'operation.json').exists(), 'An interrupted update needs review')
    changed = metadata['migrations'] != site.state['migrations']
    require(not changed or migrate, 'Schema changed: review migrations, then use --migrate explicitly')
    if changed:
        require(metadata['migrations'][:len(site.state['migrations'])] == site.state['migrations'], 'Older/divergent schema refused')
    previous = site.state
    write_json(site.root / 'operation.json', {'previous': previous, 'target': metadata, 'schema_changed': changed})
    try:
        site.stop()
        if changed:
            site.tool('migrate', image=metadata['image'])
        site.tool('verify', image=metadata['image'])
        site.compose('up', '-d', '--wait', 'web', 'indexer', image=metadata['image'], timeout=180)
        site.probe()
        write_json(site.root / 'state.json', metadata)
        site.state = metadata
    except BaseException:
        if not changed:
            site.compose('up', '-d', '--wait', 'web', 'indexer', image=previous['image'], timeout=180)
            site.probe()
            (site.root / 'operation.json').unlink()
        # Schema is never rolled back automatically; retain journal and stop new workers.
        else:
            site.stop()
        raise
    else:
        (site.root / 'operation.json').unlink()
    print('Đã cập nhật ' + metadata['version'] + '. Dữ liệu được giữ nguyên.')

def archive_manifest(root):
    return {str(file.relative_to(root)): {'sha256': sha(file), 'bytes': file.stat().st_size}
            for file in root.rglob('*') if file.is_file() and file.relative_to(root).as_posix() != 'manifest.json'}

def extract(archive, destination):
    # No links, devices, duplicate members or arbitrary extraction paths.
    seen = set()
    with tarfile.open(archive, 'r:gz') as source:
        for member in source:
            path = PurePosixPath(member.name)
            require(not path.is_absolute() and '..' not in path.parts and member.name not in seen
                    and (member.isfile() or member.isdir()), 'Unsafe recovery archive')
            seen.add(member.name)
            target = destination.joinpath(*path.parts)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with source.extractfile(member) as src, target.open('xb') as dst:
                    shutil.copyfileobj(src, dst)
    manifest = json.loads((destination / 'manifest.json').read_text())
    require(manifest.get('format') == 1 and manifest.get('files') == archive_manifest(destination), 'Recovery checksum mismatch')
    return manifest

def backup(site, output, recipient):
    require(not output.exists(), 'Export file already exists')
    require(recipient.startswith('age1') and not re.search(r'\s', recipient), 'Use an age public recipient')
    require(not (site.root / 'operation.json').exists(), 'Update in progress')
    running = bool(site.compose('ps', '--status', 'running', '--quiet', 'web').strip())
    site.stop()
    try:
        with tempfile.TemporaryDirectory(prefix='export-', dir=site.root) as work:
            work = Path(work); data = work / 'data'; data.mkdir()
            with (data / 'database.dump').open('xb') as target:
                site.compose('exec', '-T', 'database', 'pg_dump', '-U', 'lvd', '-d', 'luatvietduc', '-Fc', output=target, timeout=600)
            site.tool('export-files', transfer=data)
            shutil.copyfile(site.root / 'runtime.env', data / 'runtime.env')
            shutil.copytree(site.root / 'fonts', data / 'fonts')
            write_json(data / 'installed.json', site.state)
            write_json(data / 'manifest.json', {'format': 1, 'files': archive_manifest(data)})
            archive = work / 'data.tar.gz'
            with tarfile.open(archive, 'w:gz') as target:
                for file in data.iterdir():
                    target.add(file, arcname=file.name)
            encrypted = work / 'data.tar.gz.age'
            run(['age', '--encrypt', '-r', recipient, '-o', str(encrypted), str(archive)], timeout=900)
            # Same-directory rename prevents a partial successful-looking export.
            temporary = output.with_suffix(output.suffix + '.partial')
            require(not temporary.exists(), 'Partial export file already exists')
            shutil.copyfile(encrypted, temporary); temporary.chmod(0o600); os.replace(temporary, output)
    finally:
        if running:
            site.start()
    print('Đã xuất bản sao mã hoá gồm database, tệp, font và khoá khôi phục.')

def restore(root, package, archive, identity, url, port):
    metadata = release(package)
    require(not root.exists() or not any(root.iterdir()), 'Restore only into a new empty installation')
    with tempfile.TemporaryDirectory(prefix='lvd-restore-') as work:
        work = Path(work); decrypted = work / 'data.tar.gz'; data = work / 'data'; data.mkdir()
        run(['age', '--decrypt', '-i', str(identity), '-o', str(decrypted), str(archive)], timeout=900)
        extract(decrypted, data)
        require(json.loads((data / 'installed.json').read_text())['image'] == metadata['image'], 'Restore the exact backed-up application package first')
        recovery = environment(data / 'runtime.env')
        site = create(root, metadata, url, port, recovery, data / 'fonts')
        with site.lock():
            site.compose('up', '-d', '--wait', 'database', timeout=180)
            with (data / 'database.dump').open('rb') as source:
                # Stream privately; do not put SQL or passwords in arguments/logs.
                env = {**os.environ, **site.values, 'LVD_IMAGE': metadata['image'], 'LVD_PORT': str(port)}
                result = subprocess.run(['docker', 'compose', '--project-name', site.config['project'],
                    '--project-directory', str(site.root), '--env-file', str(site.root / 'runtime.env'), '-f', str(site.root / 'compose.yml'),
                    'exec', '-T', 'database', 'pg_restore', '--exit-on-error', '--single-transaction', '--no-owner', '--no-acl', '-U', 'lvd', '-d', 'luatvietduc'],
                    stdin=source, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, env=env, timeout=600)
                require(result.returncode == 0, 'Database restore failed; new site remains stopped')
            site.tool('verify')
            site.tool('restore-files', transfer=data)
    print('Đã khôi phục vào bản cài riêng; web đang dừng. Dừng bản cũ rồi chạy start để chuyển sang.')

def install_timers(site):
    require(os.geteuid() == 0 and site.root.stat().st_uid == 0, 'Install timers as root for a root-owned site')
    require(re.fullmatch(r'/[A-Za-z0-9_./-]+', str(site.root)), 'Use a simple absolute installation path for systemd')
    for binary in ['age', 'rclone', 'systemctl']:
        require(shutil.which(binary), 'Missing prerequisite: ' + binary)
    name = site.config['project']
    folder = Path('/etc/systemd/system')
    worker = str(site.root / 'backup-worker.py') + ' --dir ' + str(site.root)
    for suffix, extra in [('-backup', ''), ('-backup-schedule', ' --schedule')]:
        unit = name + suffix
        (folder / (unit + '.service')).write_text('[Unit]\nDescription=Luật Việt Đức private backup\nAfter=docker.service\nRequires=docker.service\n[Service]\nType=oneshot\nExecStart=/usr/bin/python3 ' + worker + extra + '\nTimeoutStartSec=35min\nUMask=0077\nNice=15\n')
        timer = 'OnCalendar=*-*-* 03:00:00 Asia/Ho_Chi_Minh\nAccuracySec=1s\nPersistent=false' if extra else 'OnBootSec=90s\nOnUnitInactiveSec=60s\nPersistent=false'
        (folder / (unit + '.timer')).write_text('[Unit]\nDescription=Luật Việt Đức backup timer\n[Timer]\n' + timer + '\n[Install]\nWantedBy=timers.target\n')
    run(['systemctl', 'daemon-reload'])
    run(['systemctl', 'enable', '--now', name+'-backup.timer', name+'-backup-schedule.timer'])
    print('Đã bật hàng chờ sao lưu và lịch 03:00 Asia/Ho_Chi_Minh cho riêng bản cài này.')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    for name in ['install', 'restore']:
        p = commands.add_parser(name)
        p.add_argument('--dir', type=Path, required=True)
        p.add_argument('--package', type=Path, required=True)
        p.add_argument('--url', required=True)
        p.add_argument('--port', type=int, default=3051)
        if name == 'restore':
            p.add_argument('--archive', type=Path, required=True)
            p.add_argument('--identity', type=Path, required=True)
        else:
            p.add_argument('--fonts', type=Path)
    for name in ['start', 'stop', 'status', 'owner', 'update', 'backup', 'install-timers']:
        p = commands.add_parser(name)
        p.add_argument('--dir', type=Path, default=Path.cwd())
        if name == 'update':
            p.add_argument('--package', type=Path, required=True)
            p.add_argument('--migrate', action='store_true')
        if name == 'backup':
            p.add_argument('--output', type=Path, required=True)
            p.add_argument('--recipient', required=True)
    args = parser.parse_args()
    run(['docker', 'compose', 'version'])
    if args.command == 'restore':
        return restore(args.dir, args.package, args.archive, args.identity, args.url, args.port)
    if args.command == 'install':
        metadata = release(args.package)
        site = create(args.dir, metadata, args.url, args.port, fonts=args.fonts)
        with site.lock():
            site.compose('up', '-d', '--wait', 'database', timeout=180)
            site.tool('migrate')
            site.tool('verify')
            site.start()
            if sys.stdin.isatty():
                owner(site)
        print('Đã cài ' + metadata['version'] + '. Tạo Admin bằng lệnh owner nếu chưa tạo.')
        return
    site = Site(args.dir)
    with site.lock():
        if args.command == 'start': site.start()
        elif args.command == 'stop': site.stop()
        elif args.command == 'owner': owner(site)
        elif args.command == 'update': update(site, release(args.package), args.migrate)
        elif args.command == 'backup': backup(site, args.output.resolve(), args.recipient)
        elif args.command == 'install-timers': install_timers(site)
        else:
            print(json.dumps({'version': site.state['version'], 'commit': site.state['commit'], 'port': site.config['port'],
                              'update_interrupted': (site.root / 'operation.json').exists()}, ensure_ascii=False))
            print(site.compose('ps').decode())

if __name__ == '__main__':
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        print('Chưa hoàn tất: ' + (str(error) if isinstance(error, RuntimeError) else type(error).__name__), file=sys.stderr)
        sys.exit(1)

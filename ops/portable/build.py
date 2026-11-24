#!/usr/bin/env python3
"""Build an exact Git revision on a development/CI machine, never the web server."""
import argparse
import gzip
import json
from pathlib import Path
import shutil
import subprocess
import sys
from lvd import require, run, sha, write_json

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--platform', choices=['linux/amd64', 'linux/arm64'], default='linux/amd64')
    args = p.parse_args()
    root = Path(__file__).resolve().parents[2]
    commit = run(['git', '-C', str(root), 'rev-parse', 'HEAD']).decode().strip()
    require(not args.output.exists(), 'Package output already exists')
    args.output.mkdir(parents=True, mode=0o700)
    # git archive excludes local env, untracked files, licensed fonts and node_modules.
    with tempfile_context(root, commit) as archive:
        with archive.open('rb') as source:
            result = subprocess.run(['docker', 'build', '--platform', args.platform,
                '--file', 'ops/portable/Dockerfile', '--build-arg', 'LVD_COMMIT=' + commit,
                '--tag', 'lvd-portable:' + commit, '-'], stdin=source, cwd=root, check=False)
        require(result.returncode == 0, 'Portable build failed')
    info = json.loads(run(['docker', 'image', 'inspect', 'lvd-portable:' + commit]))[0]
    metadata = json.loads(run(['docker', 'run', '--rm', '--network', 'none', info['Id'], 'node', '-e',
        "process.stdout.write(require('fs').readFileSync('portable-release.json','utf8'))"]))
    require(metadata['commit'] == commit and metadata['format'] == 1, 'Built metadata mismatch')
    target = args.output / 'image.tar.gz'
    process = subprocess.Popen(['docker', 'save', info['Id']], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    with gzip.open(target, 'wb', compresslevel=3) as output:
        shutil.copyfileobj(process.stdout, output)
    require(process.wait(timeout=600) == 0, 'Image export failed')
    metadata.update(image=info['Id'], platform=args.platform, image_bytes=info['Size'], archive_sha256=sha(target))
    write_json(args.output / 'release.json', metadata)
    for name in ['lvd.py', 'compose.yml', 'README.md', 'backup-worker.py']:
        (args.output / name).write_bytes(run(['git', '-C', str(root), 'show', commit + ':ops/portable/' + name]))
    (args.output / 'backup-runner.py').write_bytes(run(['git', '-C', str(root), 'show', commit + ':ops/backup/runner.py']))
    print(json.dumps({'version': metadata['version'], 'commit': commit, 'image_bytes': info['Size'],
                      'download_bytes': target.stat().st_size, 'package': str(args.output)}, indent=2))

import contextlib
import tempfile
@contextlib.contextmanager
def tempfile_context(root, commit):
    with tempfile.TemporaryDirectory(prefix='lvd-build-') as temporary:
        archive = Path(temporary) / 'source.tar'
        with archive.open('wb') as output:
            run(['git', '-C', str(root), 'archive', commit], output=output)
        yield archive

if __name__ == '__main__':
    try: main()
    except Exception as error:
        print('Build failed: ' + (str(error) if isinstance(error, RuntimeError) else type(error).__name__), file=sys.stderr)
        sys.exit(1)

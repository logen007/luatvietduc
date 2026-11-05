#!/usr/bin/env python3
"""Exact-commit reviewed media library update. Does not change installed auto-release policy."""
import argparse, fcntl, importlib.util, json, os, pathlib

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--approved-sha', required=True)
    parser.add_argument('--manifest-sha256', required=True)
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise RuntimeError('Run from the existing privileged maintenance session')
    engine_file = '/usr/local/lib/luatvietduc-deploy/auto-release.py'
    spec = importlib.util.spec_from_file_location('installed_lvd_release', engine_file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.trusted_file(engine_file)
    module.trusted_file('/etc/luatvietduc-deploy/config.json')
    config = module.config_checked(json.loads(pathlib.Path('/etc/luatvietduc-deploy/config.json').read_text()))
    for name in ['compose_file','env_file','backup_script','font_file']:
        module.trusted_file(config[name])
    sha = args.approved_sha
    module.require(module.valid_sha(sha), 'A full reviewed commit is required')
    # File policy and media presentation only; no data fields or migration change.
    allowed = {'apps/cms/src/modules/storage/collection.ts'}
    reviewed = sorted(allowed | {'apps/cms/src/modules/admin/presentation.ts','apps/cms/src/modules/storage/MediaLibrary.tsx','apps/cms/src/modules/storage/media-view.ts','apps/cms/src/modules/integrations/storage.ts','apps/cms/scripts/test-media-library.ts','apps/cms/test/media-view.test.mjs'})
    state_dir = pathlib.Path(config['state_dir'])
    with (state_dir / 'deploy.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        engine = module.Engine(config)
        current = module.load_json(engine.state_path, {})
        module.require(module.valid_sha(current.get('current_sha')), 'Known previous release required')
        module.require(engine.head() == sha, 'Branch changed; review the new head before proceeding')
        engine.git('merge-base','--is-ancestor',current['current_sha'],sha)
        engine.policies(sha)
        paths = engine.git('diff','--name-only','--no-renames',current['current_sha'],sha).splitlines()
        protected = {p for p in paths if p.startswith('apps/cms/src/migrations/') or p in module.SCHEMA_FILES or p.endswith(('/collection.ts','/schema.ts'))}
        module.require(protected == allowed, 'Unexpected protected change')
        manifest = {p: module.digest(engine.git('show',sha + ':' + p).encode()) for p in reviewed}
        # git() strips final newline; review checksum follows this exact canonical representation.
        module.require(module.digest(json.dumps(manifest,sort_keys=True,separators=(',',':')).encode()) == args.manifest_sha256, 'Media library manifest differs from reviewed content')
        module.ci_success(sha, engine.get, require_full=True)
        engine.activate(sha,current)
        module.atomic_json(engine.retry_path,{})
        print('Activated reviewed media library release ' + sha, flush=True)
if __name__ == '__main__':
    main()

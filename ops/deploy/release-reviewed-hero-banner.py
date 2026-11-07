#!/usr/bin/env python3
"""Reviewed runtime hero banner settings migration. Does not change installed auto-release policy."""
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
    migration_path = 'apps/cms/src/migrations/20261107_180000_hero_banner.ts'
    allowed = {migration_path, 'apps/cms/src/migrations/index.ts', 'apps/cms/src/modules/settings/config.ts','apps/cms/src/payload.config.ts'}
    reviewed = sorted(allowed | {
        'apps/cms/src/modules/settings/hero-banner.ts','apps/cms/src/modules/settings/hero-media-guard.ts',
        'apps/cms/src/modules/settings/view.ts','apps/cms/src/modules/settings/public-contract.ts','apps/cms/src/modules/settings/client.ts',
        'apps/cms/src/modules/public-site/HeroVideo.tsx','apps/cms/src/modules/public-site/Home.tsx','apps/cms/src/modules/public-site/Page.tsx',
        'apps/cms/src/modules/storage/upload-limits.ts','apps/cms/src/modules/storage/media-coordinates.ts','apps/cms/src/modules/storage/MediaUploader.tsx',
        'apps/cms/scripts/test-hero-banner.ts','apps/cms/scripts/test-public-review.mjs','apps/cms/test/hero-banner.test.mjs'
    })
    class ReviewedEngine(module.Engine):
        migrated = False
        def compose(self, release, *command):
            # Parent activate() has built this exact immutable image; backups remain on the 03:00 schedule.
            if release == sha and command[:2] == ('run','--detach') and not self.migrated:
                module.require('--name' in command and module.CANDIDATE in command, 'Unexpected candidate operation')
                super().compose(sha, 'run','--rm','--no-deps','--pull','never','web','npm','run','migrate')
                self.migrated = True
                print('Reviewed compatible hero banner migration applied; starting private candidate', flush=True)
            return super().compose(release, *command)
    state_dir = pathlib.Path(config['state_dir'])
    with (state_dir / 'deploy.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        engine = ReviewedEngine(config)
        current = module.load_json(engine.state_path, {})
        module.require(module.valid_sha(current.get('current_sha')), 'Known previous release required')
        module.require(engine.head() == sha, 'Branch changed; review the new head before proceeding')
        engine.git('merge-base','--is-ancestor',current['current_sha'],sha)
        engine.policies(sha)
        paths = engine.git('diff','--name-only','--no-renames',current['current_sha'],sha).splitlines()
        protected = {p for p in paths if p.startswith('apps/cms/src/migrations/') or p in module.SCHEMA_FILES or p.endswith(('/collection.ts','/schema.ts'))}
        module.require(protected <= allowed and migration_path in protected, 'Unexpected protected change')
        manifest = {p: module.digest(engine.git('show',sha + ':' + p).encode()) for p in reviewed}
        # git() strips final newline; review checksum follows this exact canonical representation.
        module.require(module.digest(json.dumps(manifest,sort_keys=True,separators=(',',':')).encode()) == args.manifest_sha256, 'Hero banner schema/security manifest differs from reviewed content')
        module.ci_success(sha, engine.get, require_full=True)
        engine.activate(sha,current)
        module.atomic_json(engine.retry_path,{})
        print('Activated reviewed hero banner release ' + sha, flush=True)
if __name__ == '__main__':
    main()

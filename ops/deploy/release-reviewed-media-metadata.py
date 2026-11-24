#!/usr/bin/env python3
"""Reviewed original/derived media lifecycle migration. Does not change installed auto-release policy."""
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
    migration_path = 'apps/cms/src/migrations/20261105_210000_media_families.ts'
    allowed = {migration_path, 'apps/cms/src/migrations/index.ts', 'apps/cms/src/modules/storage/collection.ts', 'apps/cms/src/payload.config.ts'}
    reviewed = sorted(allowed | {'apps/cms/src/app/service/media/dates/route.ts', 'apps/cms/src/modules/storage/MediaImageEditor.tsx', 'apps/cms/scripts/test-media-image-edit.ts', 'apps/cms/src/modules/storage/metadata-guard.ts', 'apps/cms/scripts/test-media-families.ts', 'apps/cms/src/modules/storage/image-editor-model.ts', 'apps/cms/scripts/test-system.ts', 'apps/cms/src/modules/storage/MediaDetails.tsx', 'apps/cms/scripts/test-media-library.ts', 'apps/cms/src/modules/integrations/storage.ts', 'apps/cms/scripts/test-browser.mjs', 'apps/cms/src/app/service/media/image/[id]/route.ts', 'apps/cms/src/modules/storage/media-coordinates.ts', 'apps/cms/scripts/test-media-image-editor.mjs', 'apps/cms/scripts/test-media-coordinates.ts', 'apps/cms/src/modules/storage/MediaLibrary.tsx', 'apps/cms/src/modules/storage/media-enumeration.ts', 'apps/cms/package.json', 'apps/cms/src/modules/storage/image-edit.ts', 'apps/cms/src/modules/storage/MediaImageTools.tsx', 'apps/cms/src/modules/storage/inventory.ts', 'apps/cms/src/app/(payload)/admin/importMap.ts', 'apps/cms/src/modules/storage/bundled-families.json', 'apps/cms/package-lock.json', 'apps/cms/src/modules/storage/bundled.ts', 'apps/cms/scripts/backup/bridge.ts'})
    class ReviewedEngine(module.Engine):
        migrated = False
        def compose(self, release, *command):
            # Parent activate() has built this immutable image and verified a backup at this point.
            if release == sha and command[:2] == ('run','--detach') and not self.migrated:
                module.require('--name' in command and module.CANDIDATE in command, 'Unexpected candidate operation')
                super().compose(sha, 'run','--rm','--no-deps','--pull','never','web','npm','run','migrate')
                self.migrated = True
                print('Reviewed compatible media metadata migration applied; starting private candidate', flush=True)
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
        module.require(module.digest(json.dumps(manifest,sort_keys=True,separators=(',',':')).encode()) == args.manifest_sha256, 'Media metadata schema/security manifest differs from reviewed content')
        module.ci_success(sha, engine.get, require_full=True)
        engine.activate(sha,current)
        module.atomic_json(engine.retry_path,{})
        print('Activated reviewed media metadata release ' + sha, flush=True)
if __name__ == '__main__':
    main()

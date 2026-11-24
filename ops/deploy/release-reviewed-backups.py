#!/usr/bin/env python3
"""One-time additive backup migration and native admin organization. Does not change installed auto-release policy."""
import argparse, fcntl, importlib.util, json, os, pathlib

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--approved-sha', required=True)
    parser.add_argument('--migration-sha256', required=True)
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
    migration_path = 'apps/cms/src/migrations/20261104_010000_backup_admin.ts'
    allowed = {migration_path, 'apps/cms/src/migrations/index.ts', 'apps/cms/src/payload.config.ts',
               'apps/cms/src/modules/settings/config.ts', 'apps/cms/src/modules/storage/collection.ts'}
    class ReviewedEngine(module.Engine):
        migrated = False
        def compose(self, release, *command):
            # Parent activate() has built this immutable image and verified a backup at this point.
            if release == sha and command[:2] == ('run','--detach') and not self.migrated:
                module.require('--name' in command and module.CANDIDATE in command, 'Unexpected candidate operation')
                super().compose(sha, 'run','--rm','--no-deps','--pull','never','web','npm','run','migrate')
                self.migrated = True
                print('Reviewed additive migration applied; starting private candidate', flush=True)
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
        migration = engine.git('show',sha + ':' + migration_path).encode()
        # git() strips final newline; review checksum follows this exact canonical representation.
        module.require(module.digest(migration) == args.migration_sha256, 'Migration differs from reviewed content')
        module.ci_success(sha, engine.get)
        engine.activate(sha,current)
        module.atomic_json(engine.retry_path,{})
        print('Activated reviewed backup/admin release ' + sha, flush=True)
if __name__ == '__main__':
    main()

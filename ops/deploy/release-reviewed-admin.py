#!/usr/bin/env python3
"""Exact-commit reviewed admin UX update. Does not change installed auto-release policy."""
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
    # UI metadata only: no field names, types, access rules, hooks or migrations change.
    allowed = {
        'apps/cms/src/payload.config.ts',
        'apps/cms/src/modules/content/articles.ts',
        'apps/cms/src/modules/content/audit.ts',
        'apps/cms/src/modules/settings/config.ts',
        'apps/cms/src/modules/storage/collection.ts',
    }
    reviewed = sorted(allowed | {
        'apps/cms/src/app/(payload)/layout.tsx',
        'apps/cms/src/app/(payload)/admin-custom.css',
        'apps/cms/src/app/(payload)/admin-dashboard.css',
        'apps/cms/src/app/(payload)/admin/importMap.ts',
        'apps/cms/src/modules/admin/NavigationLinks.tsx',
        'apps/cms/src/modules/admin/Views.tsx',
        'apps/cms/src/modules/admin/AuditActionCell.tsx',
        'apps/cms/src/modules/admin/i18n.ts',
        'apps/cms/src/modules/admin/pages.ts',
        'apps/cms/src/modules/chat/StaffWorkspace.tsx',
        'apps/cms/src/modules/identity/UserRoleTabs.tsx',
        'apps/cms/src/modules/identity/RoleFilterLinks.tsx',
        'apps/cms/src/modules/knowledge/Panel.tsx',
        'apps/cms/src/modules/settings/AdminWelcome.tsx',
    })
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
        module.require(protected <= allowed and allowed <= protected, 'Unexpected protected change')
        manifest = {p: module.digest(engine.git('show',sha + ':' + p).encode()) for p in reviewed}
        # git() strips final newline; review checksum follows this exact canonical representation.
        module.require(module.digest(json.dumps(manifest,sort_keys=True,separators=(',',':')).encode()) == args.manifest_sha256, 'Admin presentation manifest differs from reviewed content')
        module.ci_success(sha, engine.get, require_full=True)
        engine.activate(sha,current)
        module.atomic_json(engine.retry_path,{})
        print('Activated reviewed admin presentation release ' + sha, flush=True)
if __name__ == '__main__':
    main()

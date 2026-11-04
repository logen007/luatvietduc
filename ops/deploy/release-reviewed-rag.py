#!/usr/bin/env python3
"""One-time additive RAG installation; preserve the existing engine, compose and frozen release policies."""
import argparse,fcntl,hashlib,importlib.util,json,os,pathlib,subprocess

REVIEWED=[
 'apps/cms/src/migrations/20261104_050000_semantic_knowledge.ts',
 'apps/cms/src/migrations/index.ts',
 'apps/cms/src/modules/knowledge/collection.ts',
 'apps/cms/src/modules/settings/config.ts',
 'ops/rag/compose.yml','ops/rag/worker.py','ops/rag/probe.mjs',
 'ops/rag/luatvietduc-knowledge.service','ops/rag/luatvietduc-knowledge.timer',
]
ROOT=pathlib.Path('/usr/local/lib/luatvietduc-rag')

def reviewed_digest(read):
    h=hashlib.sha256()
    for path in REVIEWED:
        content=read(path)
        h.update(path.encode()+b'\0'+hashlib.sha256(content).digest())
    return h.hexdigest()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--approved-sha',required=True);parser.add_argument('--manifest-sha256',required=True);args=parser.parse_args()
    if os.geteuid()!=0:raise RuntimeError('Existing privileged maintenance session required')
    engine_file='/usr/local/lib/luatvietduc-deploy/auto-release.py'
    spec=importlib.util.spec_from_file_location('installed_lvd_release',engine_file);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    module.trusted_file(engine_file);module.trusted_file('/etc/luatvietduc-deploy/config.json')
    config=module.config_checked(json.loads(pathlib.Path('/etc/luatvietduc-deploy/config.json').read_text()))
    for name in ['compose_file','env_file','backup_script','font_file']:module.trusted_file(config[name])
    sha=args.approved_sha;module.require(module.valid_sha(sha),'A full reviewed commit is required')
    state_dir=pathlib.Path(config['state_dir'])
    with (state_dir/'deploy.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        class ReviewedEngine(module.Engine):
            migrated=False
            def compose(self,release,*command):
                if release==sha and command[:2]==('run','--detach') and not self.migrated:
                    module.require('--name' in command and module.CANDIDATE in command,'Unexpected candidate operation')
                    # Parent activate() has built the immutable image and verified an app backup.
                    ROOT.mkdir(mode=0o755,parents=True,exist_ok=True)
                    module.require(ROOT.is_dir() and not ROOT.is_symlink(),'Unsafe installation directory')
                    for path in REVIEWED:
                        if not path.startswith('ops/rag/'):continue
                        destination=ROOT/pathlib.Path(path).name
                        module.require(not destination.is_symlink(),'Unsafe installation file')
                        if destination.exists():module.require(destination.read_bytes()==read(path),'Installed RAG file differs from reviewed revision')
                        else:destination.write_bytes(read(path));destination.chmod(0o600)
                    rendered=json.loads(self.run(['docker','compose','--file',str(ROOT/'compose.yml'),'config','--format','json'],env=self.env))
                    vector=rendered['services']['vectors']
                    module.require(set(rendered['services'])=={'vectors'} and vector['image']=='qdrant/qdrant:v1.20.0' and not vector.get('ports') and set(vector['networks'])=={'private'},'Unexpected vector exposure')
                    module.require(rendered['networks']['private']['name']=='luatvietduc_private' and rendered['networks']['private']['external'],'Unexpected network')
                    self.run(['docker','network','inspect','luatvietduc_private'],env=self.env)
                    self.run(['docker','compose','--file',str(ROOT/'compose.yml'),'pull','vectors'],env=self.env)
                    self.run(['docker','compose','--file',str(ROOT/'compose.yml'),'up','--detach','--no-build','--pull','never','vectors'],env=self.env)
                    old_web=super().compose(current['current_release'],'ps','--quiet','web')
                    probe=read('ops/rag/probe.mjs').decode()
                    self.run(['docker','exec',old_web,'node','--input-type=module','-e',probe],env=self.env)
                    super().compose(sha,'run','--rm','--no-deps','--pull','never','web','npm','run','migrate')
                    self.migrated=True
                    print('Private semantic index and reviewed additive schema installed',flush=True)
                return super().compose(release,*command)
        engine=ReviewedEngine(config)
        def read(path):return subprocess.run(['git','--git-dir',str(engine.mirror),'show',sha+':'+path],env=engine.env,capture_output=True,check=True).stdout
        current=module.load_json(engine.state_path,{})
        module.require(module.valid_sha(current.get('current_sha')),'Known previous release required')
        module.require(engine.head()==sha,'Branch changed; review the new head')
        engine.git('merge-base','--is-ancestor',current['current_sha'],sha);engine.policies(sha)
        paths=engine.git('diff','--name-only','--no-renames',current['current_sha'],sha).splitlines()
        protected={p for p in paths if p.startswith('apps/cms/src/migrations/') or p in module.SCHEMA_FILES or p.endswith(('/collection.ts','/schema.ts'))}
        module.require(protected<=set(REVIEWED) and REVIEWED[0] in protected,'Unexpected protected change')
        module.require(reviewed_digest(read)==args.manifest_sha256,'Reviewed installation content changed')
        module.ci_success(sha,engine.get)
        memory={row.split(':',1)[0]:int(row.split()[1])*1024 for row in pathlib.Path('/proc/meminfo').read_text().splitlines() if row.startswith('MemAvailable:')}
        module.require(memory.get('MemAvailable',0)>=768*1024**2,'At least 768 MiB free host memory required for bounded private index and worker')
        stat=os.statvfs(state_dir);module.require(stat.f_bavail*stat.f_frsize>=5*1024**3,'At least 5 GiB free disk required')
        module.require(not ROOT.is_symlink(),'Unsafe installation path')
        try:engine.activate(sha,current)
        except Exception:
            if (ROOT/'compose.yml').exists():engine.run(['docker','compose','--file',str(ROOT/'compose.yml'),'stop','vectors'],env=engine.env)
            raise
        # Do not start background writers until the immutable application passed public health verification.
        for name in ['luatvietduc-knowledge.service','luatvietduc-knowledge.timer']:
            path=pathlib.Path('/etc/systemd/system')/name
            module.require(not path.is_symlink(),'Unsafe unit path')
            if path.exists():module.require(path.read_bytes()==(ROOT/name).read_bytes(),'Installed unit differs from reviewed revision')
            else:path.write_bytes((ROOT/name).read_bytes());path.chmod(0o644)
        engine.run(['systemctl','daemon-reload'],env=engine.env)
        engine.run(['systemctl','enable','--now','luatvietduc-knowledge.timer'],env=engine.env)
        module.atomic_json(engine.retry_path,{})
        print('Activated semantic RAG release '+sha+'; private index jobs now process automatically',flush=True)
if __name__=='__main__':main()

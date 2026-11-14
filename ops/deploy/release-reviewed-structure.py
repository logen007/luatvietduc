#!/usr/bin/env python3
"""One reviewed additive queue + presentation upgrade, preserving backup and rollback."""
import argparse,fcntl,hashlib,importlib.util,json,os,pathlib,subprocess
POLICIES=['.github/workflows/platform-foundation.yml','ops/deploy/compose.yml','ops/deploy/auto-release.py','ops/deploy/Dockerfile','ops/deploy/release-scope.py','apps/cms/scripts/activate-presentation.mjs','apps/cms/scripts/prepare-fast-release.mjs']
PROTECTED=['apps/cms/src/payload.config.ts','apps/cms/src/migrations/index.ts','apps/cms/src/migrations/20261104_130000_answer_queue.ts']
REVIEWED=POLICIES+PROTECTED+['apps/cms/src/modules/assistant/queue.ts','apps/cms/src/modules/assistant/worker.ts','apps/cms/src/instrumentation.ts','apps/cms/src/modules/chat/service.ts','apps/cms/src/modules/assistant/reply.ts','apps/cms/src/modules/admin/presentation.ts','apps/cms/src/modules/http/request.ts','apps/cms/src/modules/http/errors.ts','apps/cms/src/modules/knowledge/http.ts','apps/cms/src/app/service/[...path]/route.ts','apps/cms/src/app/(payload)/layout.tsx','apps/cms/src/modules/shared/public-shell.mjs','apps/cms/src/modules/shared/presentation-version.mjs','apps/cms/scripts/frontend-shell.mjs','apps/cms/src/presentation/modules.json']
def load(name,path):
 spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--approved-sha',required=True);parser.add_argument('--manifest-sha256',required=True);args=parser.parse_args()
 if os.geteuid()!=0:raise RuntimeError('Existing privileged maintenance session required')
 installed=pathlib.Path('/usr/local/lib/luatvietduc-deploy/auto-release.py');old=load('installed_release',installed)
 config_path=pathlib.Path('/etc/luatvietduc-deploy/config.json');old.trusted_file(installed);old.trusted_file(config_path)
 config=old.config_checked(json.loads(config_path.read_text()));sha=args.approved_sha;old.require(old.valid_sha(sha),'Full reviewed commit required')
 for key in ['compose_file','env_file','backup_script','font_file']:old.trusted_file(config[key])
 state_dir=pathlib.Path(config['state_dir'])
 with (state_dir/'deploy.lock').open('a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
  previous=old.Engine(config);current=old.load_json(previous.state_path,{})
  old.require(old.valid_sha(current.get('current_sha')),'Known previous release required')
  old.require(previous.head()==sha,'Branch advanced; review new head')
  previous.git('merge-base','--is-ancestor',current['current_sha'],sha)
  old.require(old.digest(installed.read_bytes())==config['policy_hashes']['ops/deploy/auto-release.py'],'Installed policy drift')
  def read(path):return subprocess.check_output(['git','--git-dir',str(previous.mirror),'show',sha+':'+path],env=previous.env)
  contents={path:read(path) for path in REVIEWED}
  manifest={path:old.digest(value) for path,value in contents.items()}
  old.require(old.digest(json.dumps(manifest,sort_keys=True,separators=(',',':')).encode())==args.manifest_sha256,'Reviewed source differs')
  paths=previous.git('diff','--name-only','--no-renames',current['current_sha'],sha).splitlines()
  protected={path for path in paths if path.startswith('apps/cms/src/migrations/') or path in old.SCHEMA_FILES or path.endswith(('/collection.ts','/schema.ts'))}
  old.require(protected==set(PROTECTED),'Unexpected schema or authorization change')
  for path,digest in config['policy_hashes'].items():
   if path not in POLICIES:old.require(old.digest(read(path))==digest,'Unreviewed policy change')
  candidate=state_dir/'reviewed-structure-engine.py';candidate.write_bytes(contents['ops/deploy/auto-release.py']);candidate.chmod(0o700)
  new=load('candidate_release',candidate);new.ci_success(sha,new.fetch,require_full=True)
  backup=state_dir/('before-structure-'+sha);backup.mkdir(mode=0o700)
  for source in [installed,config_path]:
   target=backup/source.name;target.write_bytes(source.read_bytes());target.chmod(0o600)
  class ReviewedEngine(new.Engine):
   migrated=False
   def compose(self,release,*command):
    if release==sha and command[:2]==('run','--detach') and not self.migrated:
     new.require('--name' in command and new.CANDIDATE in command,'Unexpected candidate operation')
     # Parent activate has built the immutable image and backed up the old app.
     super().compose(sha,'run','--rm','--no-deps','--pull','never','--env','LVD_WORKERS_DISABLED=1','web','npm','run','migrate')
     self.migrated=True
    return super().compose(release,*command)
  engine=ReviewedEngine(config);engine.activate(sha,current)
  config['policy_hashes'].update({path:manifest[path] for path in POLICIES})
  temporary=installed.with_suffix('.next');temporary.write_bytes(contents['ops/deploy/auto-release.py']);temporary.chmod(0o700);temporary.replace(installed)
  new.atomic_json(config_path,config);new.atomic_json(engine.retry_path,{})
  # Exercise the fast path against the same reviewed content: no new commit,
  # database action or application restart is needed for this snapshot switch.
  active=new.load_json(engine.state_path,{})
  container=engine.web_container(active)
  before=engine.run(['docker','inspect','--format','{{.Id}} {{.State.StartedAt}}',container],env=engine.env)
  engine.activate_presentation(sha,active)
  after=engine.run(['docker','inspect','--format','{{.Id}} {{.State.StartedAt}}',container],env=engine.env)
  new.require(before==after,'Presentation verification restarted the application')
  print('Fast admin/public CSS snapshot verified without application restart',flush=True)
  print('Structure upgrade activated; additive queue, public health and presentation policy verified: '+sha,flush=True)
if __name__=='__main__':main()

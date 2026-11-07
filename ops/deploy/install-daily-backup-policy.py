#!/usr/bin/env python3
"""Reviewed owner request: remove release backups, schedule Drive at 03:00 Vietnam."""
import argparse,fcntl,hashlib,importlib.util,json,os,pathlib,subprocess
REVIEWED=['ops/deploy/auto-release.py','ops/deploy/test_auto_release.py','ops/backup/install.sh','ops/backup/runner.py','ops/backup/test_runner.py','apps/cms/scripts/backup/bridge.ts']
def load(name,path):
 spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--approved-sha',required=True);parser.add_argument('--manifest-sha256',required=True);args=parser.parse_args()
 if os.geteuid()!=0:raise RuntimeError('Privileged maintenance session required')
 installed=pathlib.Path('/usr/local/lib/luatvietduc-deploy/auto-release.py');old=load('previous_release',installed)
 config_path=pathlib.Path('/etc/luatvietduc-deploy/config.json');old.trusted_file(installed);old.trusted_file(config_path)
 config=old.config_checked(json.loads(config_path.read_text()));old.require(old.valid_sha(args.approved_sha),'Full reviewed commit required')
 with (pathlib.Path(config['state_dir'])/'deploy.lock').open('a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
  engine=old.Engine(config);current=old.load_json(engine.state_path,{})
  old.require(engine.head()==args.approved_sha,'Branch advanced')
  engine.git('merge-base','--is-ancestor',current['current_sha'],args.approved_sha)
  old.require(old.digest(installed.read_bytes())==config['policy_hashes']['ops/deploy/auto-release.py'],'Installed policy drift')
  contents={path:subprocess.check_output(['git','--git-dir',str(engine.mirror),'show',args.approved_sha+':'+path]) for path in REVIEWED}
  hashes={path:old.digest(data) for path,data in contents.items()}
  old.require(old.digest(json.dumps(hashes,sort_keys=True,separators=(',',':')).encode())==args.manifest_sha256,'Reviewed backup policy differs')
  # Only the owner-authorized backup call may change in the trusted engine.
  backup_call=b'            self.run(["bash", self.c["backup_script"]], env=dict(self.env, RELEASE=old))\n'
  previous=installed.read_bytes()
  old.require(previous.count(backup_call)==1 and previous.replace(backup_call,b'')==contents['ops/deploy/auto-release.py'],'Unexpected engine change')
  for path,expected in config['policy_hashes'].items():
   if path!='ops/deploy/auto-release.py':old.require(old.digest(subprocess.check_output(['git','--git-dir',str(engine.mirror),'show',args.approved_sha+':'+path]))==expected,'Unrelated policy changed: '+path)
  old.classify(engine.git('diff','--name-only','--no-renames',current['current_sha'],args.approved_sha).splitlines())
  old.ci_success(args.approved_sha,engine.get,require_full=True)
  saved=pathlib.Path(config['state_dir'])/('before-daily-backup-'+args.approved_sha);saved.mkdir(mode=0o700,exist_ok=True)
  for source in [installed,config_path]:
   target=saved/source.name
   if not target.exists():target.write_bytes(source.read_bytes());target.chmod(0o600)
  candidate=saved/'new-engine.py';candidate.write_bytes(contents['ops/deploy/auto-release.py']);candidate.chmod(0o700)
  new=load('daily_backup_release',candidate)
  # The candidate retains all existing CI/health/rollback gates and omits only
  # the per-update dump. The new application owns the scheduled queue action.
  new.Engine(config).activate(args.approved_sha,current)
  source=saved/'backup-source';source.mkdir(mode=0o700,exist_ok=True)
  for name in ['runner.py','install.sh']:
   target=source/name;target.write_bytes(contents['ops/backup/'+name]);target.chmod(0o700)
  subprocess.run(['bash',str(source/'install.sh')],check=True,capture_output=True)
  temporary=installed.with_suffix('.next');temporary.write_bytes(contents['ops/deploy/auto-release.py']);temporary.chmod(0o700);temporary.replace(installed)
  config['policy_hashes']['ops/deploy/auto-release.py']=hashes['ops/deploy/auto-release.py']
  new.atomic_json(config_path,config);new.atomic_json(engine.retry_path,{})
  print('Activated daily 03:00 Asia/Ho_Chi_Minh backups; release backups disabled: '+args.approved_sha,flush=True)
if __name__=='__main__':main()

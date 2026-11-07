#!/usr/bin/env python3
"""One reviewed bootstrap: install pinned release engine and public snapshot helper."""
import argparse,fcntl,importlib.util,json,os,pathlib,subprocess,hashlib
POLICIES=['.github/workflows/platform-foundation.yml','ops/deploy/compose.yml','ops/deploy/auto-release.py','ops/deploy/Dockerfile','ops/deploy/release-scope.py','ops/deploy/luatvietduc-release.timer','apps/cms/scripts/activate-presentation.mjs','apps/cms/scripts/prepare-fast-release.mjs','apps/cms/src/modules/shared/public-copy.mjs']
def load(name,path):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
def main():
 p=argparse.ArgumentParser();p.add_argument('--approved-sha',required=True);p.add_argument('--manifest-sha256',required=True);a=p.parse_args()
 assert os.geteuid()==0
 installed=pathlib.Path('/usr/local/lib/luatvietduc-deploy/auto-release.py');old=load('old_release',installed)
 config_path=pathlib.Path('/etc/luatvietduc-deploy/config.json');old.trusted_file(installed);old.trusted_file(config_path)
 config=old.config_checked(json.loads(config_path.read_text()));old.require(old.valid_sha(a.approved_sha),'Full reviewed commit required')
 for key in ['compose_file','env_file','backup_script','font_file']:old.trusted_file(config[key])
 state_dir=pathlib.Path(config['state_dir'])
 with (state_dir/'deploy.lock').open('a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
  e=old.Engine(config);current=old.load_json(e.state_path,{})
  old.require(e.head()==a.approved_sha,'Branch advanced')
  e.git('merge-base','--is-ancestor',current['current_sha'],a.approved_sha)
  # Existing bootstrap anchor must still match the installed engine.
  old.require(old.digest(installed.read_bytes())==config['policy_hashes']['ops/deploy/auto-release.py'],'Installed policy drift')
  contents={path:subprocess.check_output(['git','--git-dir',str(e.mirror),'show',a.approved_sha+':'+path]) for path in POLICIES}
  hashes={path:old.digest(data) for path,data in contents.items()}
  canonical=json.dumps(hashes,sort_keys=True,separators=(',',':')).encode()
  old.require(old.digest(canonical)==a.manifest_sha256,'Review manifest mismatch')
  timer=pathlib.Path('/etc/systemd/system/luatvietduc-release.timer');old.trusted_file(timer)
  timer_body=contents['ops/deploy/luatvietduc-release.timer']
  old.require(timer.read_bytes()==timer_body or old.digest(timer.read_bytes())=='35fce40f56ca261c2d5dd6dbf6d1978be944ac41dc181d3d36da334f1885e1ac','Installed polling timer drift')
  # No schema or authorization changes are part of this bootstrap.
  paths=e.git('diff','--name-only','--no-renames',current['current_sha'],a.approved_sha).splitlines();old.classify(paths)
  backup=state_dir/('before-presentation-lane-'+a.approved_sha);backup.mkdir(mode=0o700,exist_ok=True)
  for source in [installed,config_path,timer]:
   target=backup/source.name
   if not target.exists():target.write_bytes(source.read_bytes());target.chmod(0o600)
  candidate=state_dir/'reviewed-presentation-engine.py';candidate.write_bytes(contents['ops/deploy/auto-release.py']);candidate.chmod(0o700)
  new=load('new_release',candidate)
  new.ci_success(a.approved_sha,new.fetch,require_full=True)
  timer_check=state_dir/'reviewed-luatvietduc-release.timer';timer_check.write_bytes(timer_body);timer_check.chmod(0o644)
  e.run(['systemd-analyze','verify',str(timer_check)],env=e.env)
  # Keep the old installed engine/policy intact until candidate and public health pass.
  app_paths=[path for path in paths if path.startswith(('apps/cms/','assets/')) or path in {'index.html','.dockerignore','ops/deploy/Dockerfile'}]
  if current.get('backend_sha') and new.presentation_only(app_paths):
   new.Engine(config).activate_presentation(a.approved_sha,current)
  else:
   new.Engine(config).activate(a.approved_sha,current)
  config['policy_hashes'].update(hashes)
  config['poll_seconds']=5
  temporary=installed.with_suffix('.next');temporary.write_bytes(contents['ops/deploy/auto-release.py']);temporary.chmod(0o700);temporary.replace(installed)
  timer_next=timer.with_suffix('.next');timer_next.write_bytes(timer_body);timer_next.chmod(0o644);timer_next.replace(timer)
  new.atomic_json(config_path,config);new.atomic_json(e.retry_path,{})
  e.run(['systemctl','daemon-reload'],env=e.env)
  print('Presentation lane installed; application and public health verified: '+a.approved_sha,flush=True)
if __name__=='__main__':main()

#!/usr/bin/env python3
"""Reviewed cadence-only upgrade. All CI, schema, backup and rollback gates stay intact."""
import argparse,fcntl,hashlib,importlib.util,json,os,pathlib,subprocess
def main():
 p=argparse.ArgumentParser();p.add_argument('--approved-sha',required=True);a=p.parse_args()
 assert os.geteuid()==0
 engine=pathlib.Path('/usr/local/lib/luatvietduc-deploy/auto-release.py')
 spec=importlib.util.spec_from_file_location('existing_release',engine);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 config_path=pathlib.Path('/etc/luatvietduc-deploy/config.json');m.trusted_file(config_path);m.trusted_file(engine)
 config=m.config_checked(json.loads(config_path.read_text()));assert m.valid_sha(a.approved_sha)
 with (pathlib.Path(config['state_dir'])/'deploy.lock').open('a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX)
  e=m.Engine(config);assert e.head()==a.approved_sha;m.ci_success(a.approved_sha,e.get)
  old=engine.read_bytes();assert m.digest(old)==config['policy_hashes']['ops/deploy/auto-release.py']
  new=subprocess.check_output(['git','--git-dir',str(e.mirror),'show',a.approved_sha+':ops/deploy/auto-release.py'])
  expected=old.replace(b'def __init__(self, message, seconds=180):',b'def __init__(self, message, seconds=30):').replace(b'self.seconds = max(180, seconds)',b'self.seconds = max(15, seconds)').replace(b'max(180, int(data.get("poll_seconds", 180)))',b'max(15, int(data.get("poll_seconds", 15)))')
  assert new==expected and new!=old,'Unexpected engine change'
  for path,digest in config['policy_hashes'].items():
   if path!='ops/deploy/auto-release.py':assert m.digest(subprocess.check_output(['git','--git-dir',str(e.mirror),'show',a.approved_sha+':'+path]))==digest
  timer=pathlib.Path('/etc/systemd/system/luatvietduc-release.timer');m.trusted_file(timer);previous=timer.read_text()
  assert 'OnUnitInactiveSec=60s' in previous and 'AccuracySec=10s' in previous
  for path in [engine,config_path,timer]:
   backup=path.with_name(path.name+'.before-fast-poll');assert not backup.exists();backup.write_bytes(path.read_bytes());backup.chmod(0o600)
  engine.write_bytes(new);engine.chmod(0o700)
  config['poll_seconds']=15;config['policy_hashes']['ops/deploy/auto-release.py']=m.digest(new);m.atomic_json(config_path,config)
  timer.write_text(previous.replace('OnUnitInactiveSec=60s','OnUnitInactiveSec=15s').replace('AccuracySec=10s','AccuracySec=1s').replace('every minute','every 15 seconds'))
  print('Cadence upgraded: poll 15s, CI pending retry 30s; rate-limit backoff and release gates preserved.',flush=True)
 subprocess.run(['systemctl','daemon-reload'],check=True)
 subprocess.run(['systemctl','restart','luatvietduc-release.timer'],check=True)
if __name__=='__main__':main()

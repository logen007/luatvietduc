#!/usr/bin/env python3
"""Install the owner's one-current-image retention without modifying release-engine policy."""
import argparse,fcntl,hashlib,importlib.util,json,os,pathlib,subprocess
FILES=['ops/deploy/app-retention.py','ops/deploy/luatvietduc-retention.service','ops/deploy/luatvietduc-retention.timer']
UPGRADE_FROM={
 'luatvietduc-retention.service':'e079a9060818c653bbe969c2c7fbfdc074939f0ea9cad86cac7cdef8d92451ad',
 'app-retention.py':'6e82f8ef8b88ed3b69c4c442d09e45110616d1fdf6d889efcfae48cd7a5570c2',
}
def digest(read):
 h=hashlib.sha256()
 for name in FILES:h.update(name.encode()+b'\0'+hashlib.sha256(read(name)).digest())
 return h.hexdigest()
def main():
 p=argparse.ArgumentParser();p.add_argument('--approved-sha',required=True);p.add_argument('--manifest-sha256',required=True);a=p.parse_args()
 if os.geteuid()!=0:raise RuntimeError('Existing maintenance session required')
 path='/usr/local/lib/luatvietduc-deploy/auto-release.py';spec=importlib.util.spec_from_file_location('installed_release',path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 m.trusted_file(path);m.trusted_file('/etc/luatvietduc-deploy/config.json')
 c=m.config_checked(json.loads(pathlib.Path('/etc/luatvietduc-deploy/config.json').read_text()));m.require(m.valid_sha(a.approved_sha),'Reviewed full commit required')
 with (pathlib.Path(c['state_dir'])/'deploy.lock').open('a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);e=m.Engine(c);m.require(e.head()==a.approved_sha,'Branch advanced');e.policies(a.approved_sha);m.ci_success(a.approved_sha,e.get)
  def read(name):return subprocess.run(['git','--git-dir',str(e.mirror),'show',a.approved_sha+':'+name],capture_output=True,check=True,env=e.env).stdout
  m.require(digest(read)==a.manifest_sha256,'Reviewed retention files changed')
  for name in FILES:
   target=pathlib.Path('/usr/local/lib/luatvietduc-deploy' if name.endswith('.py') else '/etc/systemd/system')/pathlib.Path(name).name
   m.require(not target.is_symlink(),'Unsafe retention path')
   if target.exists():
    if target.read_bytes()!=read(name):
     m.require(hashlib.sha256(target.read_bytes()).hexdigest()==UPGRADE_FROM.get(target.name),'Existing retention file differs')
     target.write_bytes(read(name))
   else:target.write_bytes(read(name));target.chmod(0o600 if name.endswith('.py') else 0o644)
  e.run(['systemctl','daemon-reload'],env=e.env);e.run(['systemctl','enable','--now','luatvietduc-retention.timer'],env=e.env)
  print('One-current-image retention installed; release lock protects updates and temporary rollback')
if __name__=='__main__':main()

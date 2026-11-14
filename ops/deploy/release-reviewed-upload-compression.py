#!/usr/bin/env python3
"""Reviewed runtime encoder installation; retain DB, storage, workers and release engine."""
import argparse,fcntl,importlib.util,json,os,pathlib,subprocess

def main():
 p=argparse.ArgumentParser();p.add_argument('--approved-sha',required=True);p.add_argument('--dockerfile-sha256',required=True);a=p.parse_args()
 if os.geteuid()!=0:raise RuntimeError('Privileged maintenance required')
 location='/usr/local/lib/luatvietduc-deploy/auto-release.py';spec=importlib.util.spec_from_file_location('installed',location);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 config_path=pathlib.Path('/etc/luatvietduc-deploy/config.json');m.trusted_file(location);m.trusted_file(str(config_path));original=m.config_checked(json.loads(config_path.read_text()));config=json.loads(json.dumps(original))
 sha=a.approved_sha;m.require(m.valid_sha(sha),'Exact reviewed SHA required')
 class Reviewed(m.Engine):
  def compose(self,release,*command):
   result=super().compose(release,*command)
   if command[:2]==('run','--detach') and m.CANDIDATE in command:
    self.run(['docker','exec',m.CANDIDATE,'ffmpeg','-version'],env=self.env)
    self.run(['docker','exec',m.CANDIDATE,'jpegtran','-version'],env=self.env)
    self.run(['docker','exec',m.CANDIDATE,'node','--import','tsx','--input-type=module','-e',"import sharp from 'sharp';import assert from 'node:assert/strict';import {compressUpload} from './src/modules/storage/compress-upload.ts';const input=await sharp({create:{width:100,height:100,channels:3,background:'white'}}).png({compressionLevel:0}).toBuffer();const output=await compressUpload(input,'image/png');assert.ok(output.length<input.length);assert.deepEqual(await sharp(input).raw().toBuffer(),await sharp(output).raw().toBuffer());"],env=self.env)
   return result
 state_dir=pathlib.Path(config['state_dir'])
 with (state_dir/'deploy.lock').open('a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);e=Reviewed(config);current=m.load_json(e.state_path,{})
  m.require(e.head()==sha,'Branch changed');e.git('merge-base','--is-ancestor',current['current_sha'],sha)
  m.ci_success(sha,e.get,require_full=True)
  def blob(ref,path):return subprocess.run(['git','--git-dir',str(e.mirror),'show',ref+':'+path],check=True,capture_output=True,env=e.env).stdout
  old=blob(current['current_sha'],'ops/deploy/Dockerfile');new=blob(sha,'ops/deploy/Dockerfile')
  line=b'RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libjpeg-turbo-progs && rm -rf /var/lib/apt/lists/*\n'
  m.require(m.digest(old)==original['policy_hashes']['ops/deploy/Dockerfile'],'Old policy differs')
  m.require(new.count(line)==1 and new.replace(line,b'')==old and m.digest(new)==a.dockerfile_sha256,'Unexpected Dockerfile change')
  paths=e.git('diff','--name-only','--no-renames',current['current_sha'],sha).splitlines()
  protected={x for x in paths if x.startswith('apps/cms/src/migrations/') or x in m.SCHEMA_FILES or x.endswith(('/collection.ts','/schema.ts'))}
  m.require(protected=={'apps/cms/src/modules/storage/collection.ts'},'Unexpected schema change')
  config['policy_hashes']['ops/deploy/Dockerfile']=a.dockerfile_sha256
  e.policies(sha)
  m.atomic_json(config_path,config)
  try:e.activate(sha,current)
  except BaseException:m.atomic_json(config_path,original);raise
  m.atomic_json(e.retry_path,{})
  print('Activated reviewed upload compression '+sha,flush=True)
if __name__=='__main__':main()

#!/usr/bin/env python3
"""Real Docker acceptance: new DB, owner/auth, update, encrypted export and isolated restore.
All data is synthetic. Never accepts an existing installation or production project.
"""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import tempfile
import urllib.error
import urllib.request
from lvd import Site, run, require, release, sha, write_json, update

HERE = Path(__file__).resolve().parent
def port():
    with socket.socket() as server:
        server.bind(('127.0.0.1',0)); return server.getsockname()[1]

def cli(*args, data=None):
    return run(['python3',str(HERE/'lvd.py'),*map(str,args)],data=data,timeout=1200)

def api(site, route, body=None, token=None, status=200):
    headers={'content-type':'application/json','origin':site.values['APP_URL']}
    if token: headers['authorization']='JWT '+token
    request=urllib.request.Request(site.values['APP_URL']+route,headers=headers,
        data=json.dumps(body).encode() if body is not None else None)
    try: response=urllib.request.urlopen(request,timeout=30)
    except urllib.error.HTTPError as error: response=error
    with response:
        require(response.status==status,'Unexpected API status: '+route+' '+str(response.status))
        data=response.read()
        return json.loads(data) if data else None

def check_storage(site, work):
    transfer=work/'file-check';transfer.mkdir();(transfer/'mock-store').mkdir()
    shutil.copyfile(HERE/'storage-fixture.mjs',transfer/'fixture.mjs')
    # Active *synthetic* coordinates. The preload replaces every SDK send; no network request is made.
    values={'endpoint':'https://'+'0'*32+'.r2.cloudflarestorage.com','bucket':'portable-fixture','accessKeyId':'synthetic','secretAccessKey':'synthetic'}
    js="const c=require('crypto'),k=c.hkdfSync('sha256',process.env.PAYLOAD_SECRET,'lvd-integrations-v1','server-side-secrets',32),iv=c.randomBytes(12),e=c.createCipheriv('aes-256-gcm',k,iv);e.setAAD(Buffer.from('r2'));const d=Buffer.concat([e.update(process.argv[1]),e.final()]);process.stdout.write(['v1',iv.toString('base64url'),e.getAuthTag().toString('base64url'),d.toString('base64url')].join('.'))"
    encrypted=site.compose('run','--rm','--no-deps','-T','-e','LVD_WORKERS_DISABLED=1','web','node','-e',js,json.dumps(values)).decode().strip()
    query="INSERT INTO lvd_integrations(provider,encrypted_values,enabled) VALUES('r2','"+encrypted+"',true); INSERT INTO media(filename,mime_type,visibility,prefix,sizes_thumbnail_filename) VALUES('proof.png','image/png','private','portable','thumb.png') RETURNING id;"
    result=site.compose('exec','-T','database','psql','-U','lvd','-d','luatvietduc','-v','ON_ERROR_STOP=1','-At',data=query.encode()).decode()
    mediaid=next(line for line in result.splitlines() if line.isdigit())
    original='originals/'+mediaid+'/source.png'
    site.compose('exec','-T','database','psql','-U','lvd','-d','luatvietduc','-v','ON_ERROR_STOP=1',
        data=("UPDATE media SET original_file='"+json.dumps({'key':original,'mimeType':'image/png'})+"' WHERE id="+mediaid+';').encode())
    expected={'portable/proof.png':b'synthetic-original','portable/thumb.png':b'synthetic-thumbnail',original:b'synthetic-retained-source'}
    for key,body in expected.items():(transfer/'mock-store'/hashlib.sha256(key.encode()).hexdigest()).write_bytes(body)
    def tool(action):
        return site.compose('run','--rm','--no-deps','-T','--user',str(os.getuid())+':'+str(os.getgid()),
            '-e','LVD_WORKERS_DISABLED=1','-v',str(transfer)+':/transfer','web','node','--import=/transfer/fixture.mjs','maintenance/manage.mjs',action,timeout=120)
    tool('export-files')
    manifest=json.loads((transfer/'objects.json').read_text())
    require({item['key'] for item in manifest}==set(expected),'Original, derivative or retained source missing')
    for file in (transfer/'mock-store').iterdir():file.unlink()
    tool('restore-files')
    for key,body in expected.items():require((transfer/'mock-store'/hashlib.sha256(key.encode()).hexdigest()).read_bytes()==body,'Restored bytes differ')
    tool('restore-files') # idempotent: reads existing equal bytes, never overwrites them.
    first=manifest[0];existing=transfer/'mock-store'/first['file'];existing.write_bytes(b'keep existing content')
    try:tool('restore-files');raise AssertionError('Conflicting object overwritten')
    except RuntimeError:require(existing.read_bytes()==b'keep existing content','Existing object was modified')
    (transfer/'objects'/first['file']).write_bytes(b'tampered export')
    (transfer/'calls').write_text('')
    try:tool('restore-files');raise AssertionError('Tampered archive accepted')
    except RuntimeError:require(not (transfer/'calls').read_text(),'Provider called before complete checksum validation')

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--package',type=Path,required=True)
    args=parser.parse_args();metadata=release(args.package);sites=[]
    with tempfile.TemporaryDirectory(prefix='lvd-install-check-') as work:
        work=Path(work)
        try:
            first=work/'first'; localport=port();url='http://127.0.0.1:'+str(localport)
            cli('install','--dir',first,'--package',args.package,'--url',url,'--port',localport)
            site=Site(first);sites.append(site)
            password=secrets.token_hex(16);account={'email':'portable@example.invalid','name':'Synthetic owner','password':password}
            cli('owner','--dir',first,data=json.dumps(account).encode())
            token=api(site,'/api/users/login',{'email':account['email'],'password':password})['token']
            require(api(site,'/api/users/me',token=token)['user']['role']=='owner','Owner permission missing')
            api(site,'/service/admin/resources',status=403)
            article=api(site,'/api/articles',{'title':'Portable restore proof','slug':'portable-proof','body':'Synthetic private draft','jurisdiction':'VN','language':'vi'},token,201)['doc']
            # Disabled synthetic vault entry proves the original encryption key survives restore.
            encrypted=site.compose('exec','-T','web','node','-e',
                "const c=require('crypto'),k=c.hkdfSync('sha256',process.env.PAYLOAD_SECRET,'lvd-integrations-v1','server-side-secrets',32),iv=c.randomBytes(12),e=c.createCipheriv('aes-256-gcm',k,iv);e.setAAD(Buffer.from('google'));const d=Buffer.concat([e.update(JSON.stringify({clientId:'synthetic',clientSecret:'synthetic'})),e.final()]);process.stdout.write(['v1',iv.toString('base64url'),e.getAuthTag().toString('base64url'),d.toString('base64url')].join('.'))").decode()
            site.compose('exec','-T','database','psql','-U','lvd','-d','luatvietduc','-v','ON_ERROR_STOP=1',
                data=("INSERT INTO lvd_integrations(provider,encrypted_values) VALUES('google','"+encrypted+"');").encode())
            cli('update','--dir',first,'--package',args.package)
            require(api(site,'/api/articles/'+str(article['id']),token=token)['title']=='Portable restore proof','Update lost article')
            # Real failure: a different image exits immediately. No schema difference -> old image recovers.
            bad=work/'bad';bad.mkdir();badcommit='f'*40
            (bad/'Dockerfile').write_text('FROM lvd-portable:'+metadata['commit']+'\nLABEL org.opencontainers.image.revision='+badcommit+'\nCMD ["node","-e","process.exit(1)"]\n')
            run(['docker','build','-t','lvd-portable-check-failure:'+badcommit,str(bad)],timeout=120)
            badimage=json.loads(run(['docker','image','inspect','lvd-portable-check-failure:'+badcommit]))[0]['Id']
            try:
                with site.lock(): update(site,{**metadata,'image':badimage})
                raise RuntimeError('Broken image was accepted')
            except RuntimeError as error:
                require('Compose failed' in str(error),'Unexpected update failure')
            site.probe()
            require(Site(first).state['image']==metadata['image'],'Rollback did not preserve revision')
            key=work/'identity';run(['age-keygen','-o',str(key)])
            recipient=run(['age-keygen','-y',str(key)]).decode().strip();archive=work/'snapshot.age'
            cli('backup','--dir',first,'--output',archive,'--recipient',recipient)
            require(archive.read_bytes().startswith(b'age-encryption.org/'),'Export is not encrypted')
            site.probe()
            second=work/'second';otherport=port();otherurl='http://127.0.0.1:'+str(otherport)
            cli('restore','--dir',second,'--package',args.package,'--archive',archive,'--identity',key,'--url',otherurl,'--port',otherport)
            restored=Site(second);sites.append(restored)
            require(not restored.compose('ps','--status','running','--quiet','web').strip(),'Restore unexpectedly started workers')
            require(restored.values['PAYLOAD_SECRET']==site.values['PAYLOAD_SECRET'],'Vault key changed')
            # Stop original before starting recovered workers.
            cli('stop','--dir',first);cli('start','--dir',second)
            newtoken=api(restored,'/api/users/login',{'email':account['email'],'password':password})['token']
            require(api(restored,'/api/articles/'+str(article['id']),token=newtoken)['body']=='Synthetic private draft','Restore lost draft content')
            restored.tool('verify')
            bridge=json.loads(restored.compose('exec','-T','web','node','maintenance/backup-bridge.mjs',data=b'{"action":"claim"}'))
            require(bridge is None,'Disabled Drive should not claim a job')
            check_storage(site,work)
            print(json.dumps({'result':'passed','version':metadata['version'],'image_bytes':metadata['image_bytes'],
                'checks':['install','migrations','owner-login','private-access','draft-retained','update','failed-update-rollback','encrypted-export','separate-db-restore','vault-key','restored-login','worker-cutover','backup-bridge','original-and-derivative-files','missing-file-restore','idempotency','conflict-no-overwrite','tamper-before-provider']},indent=2))
        finally:
            for site in sites:
                # Exact disposable project only. No volumes or shared services removed.
                site.compose('down',timeout=90)

if __name__=='__main__': main()

#!/usr/bin/env python3
"""Narrow host worker: app-only capture, encrypted Drive upload, isolated restore drill."""
import configparser, datetime, fcntl, hashlib, json, os, pathlib, re, shutil, subprocess, tarfile, tempfile, time, uuid, threading
BASE=pathlib.Path('/var/lib/luatvietduc-backup')
PROJECT='luatvietduc'
class BackupFailure(Exception): pass

def run(args, *, data=None, timeout=120, output=None):
    p=subprocess.run(args,input=data,stdout=output or subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout,check=False)
    if p.returncode: raise BackupFailure('Command failed: '+args[0])
    return p.stdout

def container(service):
    names=run(['docker','ps','--filter','label=com.docker.compose.project='+PROJECT,'--filter','label=com.docker.compose.service='+service,'--format','{{.ID}}']).decode().split()
    if len(names)!=1: raise BackupFailure('Expected one application container')
    return names[0]

def bridge(web, action, **values):
    return json.loads(run(['docker','exec','-i','-w','/app',web,'node','--import','tsx','scripts/backup/bridge.ts'],data=json.dumps(dict(action=action,**values)).encode(),timeout=60))

def sha(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''): h.update(block)
    return h.hexdigest()

def remote_path(value):
    if not re.fullmatch(r'(daily|monthly)/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.tar\.gz\.age',value): raise BackupFailure('Invalid backup path')
    return 'drive:'+value

def retention_plan(history, new_monthly):
    # Called only after the new daily object passed download checksum verification.
    daily=[h for h in history if not h.get('daily_trashed')]
    monthly=[h for h in history if h.get('monthly_path')]
    return daily[6:], monthly if new_monthly else monthly[1:]

def rclone_config(root, config):
    v=config['drive'];p=root/'rclone.conf'
    # Values are validated by the owner-only API; quote token through JSON, never shell interpolation.
    cp=configparser.ConfigParser(interpolation=None)
    cp['drive']={'type':'drive','client_id':v['clientId'],'client_secret':v['clientSecret'],'scope':'drive.file','root_folder_id':v['folderId'],'token':json.dumps({'refresh_token':v['refreshToken'],'token_type':'Bearer','expiry':'2000-01-01T00:00:00Z'})}
    if config.get('r2'):
        r=config['r2'];cp['media']={'type':'s3','provider':'Cloudflare','access_key_id':r['accessKeyId'],'secret_access_key':r['secretAccessKey'],'endpoint':r['endpoint'],'region':'auto','acl':'private'}
    with p.open('x') as f: cp.write(f)
    p.chmod(0o600);return ['rclone','--config',str(p),'--retries','1','--low-level-retries','2','--contimeout','15s','--timeout','60s','--drive-use-trash=true']

def verify_remote(cmd,path,expected):
    p=subprocess.Popen(cmd+['cat',remote_path(path)],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
    h=hashlib.sha256();size=0
    try:
        for block in iter(lambda:p.stdout.read(1024*1024),b''):
            size+=len(block)
            if size>20*1024**3: raise BackupFailure('Archive size limit')
            h.update(block)
        if p.wait(timeout=60)!=0 or h.hexdigest()!=expected: raise BackupFailure('Drive checksum mismatch')
    finally:
        if p.poll() is None: p.kill();p.wait()

def extract_safe(archive,destination):
    total=0;count=0
    with tarfile.open(archive,'r:gz') as tar:
        for member in tar:
            name=pathlib.PurePosixPath(member.name)
            if name.is_absolute() or '..' in name.parts or member.issym() or member.islnk() or not (member.isfile() or member.isdir()): raise BackupFailure('Unsafe archive member')
            count+=1;total+=member.size
            if count>200000 or total>20*1024**3: raise BackupFailure('Extract size limit')
            target=destination.joinpath(*name.parts)
            if member.isdir(): target.mkdir(parents=True,exist_ok=True);continue
            target.parent.mkdir(parents=True,exist_ok=True)
            with tar.extractfile(member) as src,target.open('xb') as dst: shutil.copyfileobj(src,dst,1024*1024)

def capture(web,db,config,root,rc):
    bridge(web,'lock')
    try:
        inventory=bridge(web,'inventory');bundle=root/'bundle';bundle.mkdir()
        with (bundle/'database.dump').open('xb') as out: run(['docker','exec',db,'pg_dump','-U','lvd','-d','luatvietduc','-Fc'],output=out,timeout=600)
        with (bundle/'database.dump').open('rb') as source:
            p=subprocess.run(['docker','exec','-i',db,'pg_restore','--list'],stdin=source,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=120)
        if p.returncode:raise BackupFailure('Invalid database dump')
        private=json.loads(pathlib.Path('/etc/luatvietduc-deploy/config.json').read_text())
        env=pathlib.Path(private['env_file'])
        if env.stat().st_uid!=0 or env.stat().st_mode & 0o077: raise BackupFailure('Application recovery configuration permissions')
        shutil.copyfile(env,bundle/'app.env');(bundle/'app.env').chmod(0o600)
        (bundle/'media').mkdir()
        if config.get('r2'): run(rc+['copy','media:'+config['r2']['bucket'],str(bundle/'media')],timeout=900)
        elif inventory: raise BackupFailure('Media exists but R2 is unavailable')
        for item in inventory:
            parts=[str(item.get(k) or '').strip('/') for k in ['prefix','_object_key','filename']]
            key=pathlib.PurePosixPath('/'.join(x for x in parts if x))
            if key.is_absolute() or '..' in key.parts or not (bundle/'media').joinpath(*key.parts).is_file(): raise BackupFailure('Referenced media missing')
        files={str(p.relative_to(bundle)):sha(p) for p in bundle.rglob('*') if p.is_file()}
        manifest={'format':1,'application':'luatvietduc','commit':config['release']['commit'],'created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'media_count':len(inventory),'files':files}
        (bundle/'manifest.json').write_text(json.dumps(manifest))
        tarpath=root/'bundle.tar.gz'
        with tarfile.open(tarpath,'w:gz') as tar:
            for child in bundle.iterdir(): tar.add(child,arcname=child.name,recursive=True)
        encrypted=root/'bundle.tar.gz.age'
        run(['age','--encrypt','-r',config['drive']['ageRecipient'],'-o',str(encrypted),str(tarpath)],timeout=600)
        return encrypted,manifest
    finally: bridge(web,'unlock')

def restore_drill(db,config,root,rc):
    snapshot=config['snapshot']
    if not snapshot or not config.get('identity'): raise BackupFailure('Restore authorization missing')
    encrypted=root/'download.age';run(rc+['copyto',remote_path(snapshot['monthly_path'] if snapshot.get('daily_trashed') else snapshot['remote_path']),str(encrypted)],timeout=600)
    if sha(encrypted)!=snapshot['sha256']: raise BackupFailure('Downloaded backup checksum mismatch')
    key=root/'identity';key.write_text(config['identity']+'\n');key.chmod(0o600)
    archive=root/'restore.tar.gz';run(['age','--decrypt','-i',str(key),'-o',str(archive),str(encrypted)],timeout=600);key.unlink()
    extracted=root/'restore';extracted.mkdir();extract_safe(archive,extracted)
    manifest=json.loads((extracted/'manifest.json').read_text())
    if manifest.get('application')!='luatvietduc' or manifest.get('format')!=1 or manifest.get('commit')!=snapshot['commit_sha']: raise BackupFailure('Wrong application or revision')
    for name,expected in manifest['files'].items():
        path=pathlib.PurePosixPath(name)
        if path.is_absolute() or '..' in path.parts or sha(extracted.joinpath(*path.parts))!=expected: raise BackupFailure('Restore file checksum mismatch')
    # A separate no-network, no-host-volume PostgreSQL container prevents restored SQL touching the live cluster.
    name='lvd-restore-'+uuid.uuid4().hex[:16]
    image=run(['docker','inspect','--format','{{.Config.Image}}',db]).decode().strip()
    if image!='postgres:17.6-bookworm': raise BackupFailure('Review PostgreSQL restore image first')
    try:
        run(['docker','run','--detach','--pull','never','--name',name,'--label','lvd.restore=true','--network','none','--read-only','--memory','768m','--cpus','1','--pids-limit','128','--tmpfs','/var/lib/postgresql/data:rw,nosuid,size=1073741824','--tmpfs','/var/run/postgresql:rw,nosuid,size=16777216','--tmpfs','/tmp:rw,nosuid,size=16777216','-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=lvd_restore',image],timeout=30)
        ready=False
        for _ in range(30):
            try:run(['docker','exec',name,'pg_isready','-U','postgres','-d','lvd_restore'],timeout=3);ready=True;break
            except BackupFailure:time.sleep(1)
        if not ready:raise BackupFailure('Restore PostgreSQL not ready')
        with (extracted/'database.dump').open('rb') as source:
            p=subprocess.run(['docker','exec','-i',name,'pg_restore','--exit-on-error','--no-owner','--no-acl','-U','postgres','-d','lvd_restore'],stdin=source,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=600)
        if p.returncode:raise BackupFailure('Isolated database restore failed')
        run(['docker','exec',name,'psql','-U','postgres','-d','lvd_restore','-v','ON_ERROR_STOP=1','-Atc','SELECT count(*) FROM users; SELECT count(*) FROM lvd_conversations; SELECT count(*) FROM knowledge;'],timeout=30)
    finally:
        labels=run(['docker','inspect','--format','{{index .Config.Labels "lvd.restore"}}',name]).decode().strip()
        if labels=='true':run(['docker','rm','--force',name],timeout=30)
    return snapshot['id']

def once():
    os.umask(0o077);BASE.mkdir(mode=0o700,parents=True,exist_ok=True)
    with (BASE/'runner.lock').open('a') as lock:
        try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:return
        web=container('web');config=bridge(web,'claim')
        if not config:return
        stop=threading.Event()
        def heartbeat():
            while not stop.wait(30):
                try:bridge(container('web'),'pulse')
                except Exception:pass
        monitor=threading.Thread(target=heartbeat,daemon=True);monitor.start()
        job=config['job'];result={'id':job['id'],'ok':False,'message':'Sao lưu chưa đạt; không có thay đổi vào dữ liệu đang chạy.'}
        try:
            db=container('database')
            with tempfile.TemporaryDirectory(prefix='job-',dir=BASE) as tmp:
                root=pathlib.Path(tmp);rc=rclone_config(root,config)
                if job['kind']=='restore-test':
                    result.update(ok=True,tested=restore_drill(db,config,root,rc),message='Khôi phục thử đạt trong PostgreSQL riêng, không kết nối mạng. Dữ liệu đang chạy không thay đổi.')
                else:
                    encrypted,manifest=capture(web,db,config,root,rc);checksum=sha(encrypted);path='daily/'+job['id']+'.tar.gz.age'
                    run(rc+['copyto',str(encrypted),remote_path(path)],timeout=600);verify_remote(rc,path,checksum)
                    monthly=None;now=datetime.datetime.now(datetime.timezone.utc)
                    result.update(ok=True,snapshot={'path':path,'monthly':None,'sha256':checksum,'bytes':encrypted.stat().st_size,'commit':manifest['commit'],'media':bool(config.get('r2'))},message='Bản hằng ngày đã được xác minh. Bản tháng hoặc dọn bản cũ chưa hoàn tất; các bản cũ được giữ lại.')
                    if not any(h.get('monthly_path') and str(h['created_at'])[:7]==now.strftime('%Y-%m') for h in config['history']):
                        monthly='monthly/'+job['id']+'.tar.gz.age';run(rc+['copyto',str(encrypted),remote_path(monthly)],timeout=600);verify_remote(rc,monthly,checksum)
                    result.update(ok=True,snapshot={'path':path,'monthly':monthly,'sha256':checksum,'bytes':encrypted.stat().st_size,'commit':manifest['commit'],'media':bool(config.get('r2'))},message='Đã mã hóa, gửi lên Drive và đối chiếu SHA-256 của bản tải xuống.')
                    daily_trashed=[];monthly_trashed=[]
                    result.update(dailyTrashed=daily_trashed,monthlyTrashed=monthly_trashed,message='Bản sao mới đã được xác minh. Chưa dọn hết bản cũ; sẽ thử lại trong lượt sao lưu sau.')
                    old_daily,old_monthly=retention_plan(config['history'],monthly)
                    for old in old_daily:
                        run(rc+['deletefile',remote_path(old['remote_path'])],timeout=120);daily_trashed.append(old['id'])
                    for old in old_monthly:
                        run(rc+['deletefile',remote_path(old['monthly_path'])],timeout=120);monthly_trashed.append(old['id'])
                    result.update(ok=True,snapshot={'path':path,'monthly':monthly,'sha256':checksum,'bytes':encrypted.stat().st_size,'commit':manifest['commit'],'media':bool(config.get('r2'))},dailyTrashed=daily_trashed,monthlyTrashed=monthly_trashed,message='Đã mã hóa, gửi lên Drive và đối chiếu SHA-256 của bản tải xuống.')
        except Exception:
            # Never write provider exceptions, tokens, archive content, or private restore identities to logs.
            pass
        finally:
            stop.set();monitor.join(timeout=65)
            bridge(container('web'),'finish',**result)
if __name__=='__main__':once()

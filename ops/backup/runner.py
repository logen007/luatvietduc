#!/usr/bin/env python3
"""Narrow host worker: app-only capture, encrypted Drive upload, isolated restore drill."""
import configparser, datetime, fcntl, hashlib, json, os, pathlib, re, shutil, subprocess, tarfile, tempfile, time, uuid, threading, sys
from contextlib import contextmanager
import urllib.error, urllib.parse, urllib.request
BASE=pathlib.Path('/var/lib/luatvietduc-backup')
PROJECT='luatvietduc'
REASONS={
    'oauth-grant':'Google đã từ chối quyền đăng nhập đã lưu',
    'oauth-client':'cấu hình ứng dụng Google chưa hợp lệ',
    'oauth-token':'công cụ chưa có mã truy cập Google hợp lệ',
    'api-disabled':'Drive API chưa được bật cho ứng dụng Google',
    'permission':'tài khoản hoặc khóa chưa có đủ quyền truy cập',
    'storage-quota':'Drive đã hết dung lượng lưu trữ',
    'rate-limit':'Google đang giới hạn số lượt yêu cầu',
    'not-found':'không tìm thấy tệp hoặc thư mục đích',
    'read-only':'hệ thống tệp chỉ cho phép đọc',
    'config-write':'không ghi được cấu hình hoặc bộ nhớ đệm công cụ',
    'unsupported-option':'phiên bản công cụ chưa hỗ trợ tùy chọn được dùng',
    'config-section':'thiếu mục kết nối trong cấu hình công cụ',
    'authentication':'công cụ chưa lấy được quyền truy cập hợp lệ',
    'local-file':'không tìm thấy tệp cục bộ cần gửi',
    'http-request':'dịch vụ từ chối nội dung yêu cầu',
    'http-forbidden':'dịch vụ từ chối quyền thực hiện yêu cầu',
    'http-server':'dịch vụ đích đang gặp lỗi',
    'timeout':'quá thời gian chờ',
}
class BackupFailure(Exception):
    def __init__(self,message,reason='unknown',exit_code=None,http_status=None):
        self.reason=reason if reason in REASONS else 'unknown'
        self.exit_code=exit_code if type(exit_code) is int and -128<=exit_code<=255 else None
        self.http_status=http_status if type(http_status) is int and (http_status in [400,401,403,404,429] or 500<=http_status<=599) else None
        super().__init__(message)

def diagnostic_text(stderr):
    return (stderr[-65536:].decode('utf-8',errors='replace') if isinstance(stderr,bytes) else str(stderr or '')[-65536:]).lower()

def command_http_status(stderr):
    text=diagnostic_text(stderr)
    codes=re.findall(r'(?:\bhttp(?:/\d(?:\.\d)?)?\s*(?:status(?:\s*code)?\s*)?[:=]?\s*|\bstatus\s*(?:code)?\s*[:=]?\s*|\b(?:googleapi:\s*)?error\s+|"code"\s*:\s*)(400|401|403|404|429|5\d\d)\b|\b(400|401|403|404|429|5\d\d)\s+(?:bad request|unauthorized|forbidden|not found|too many requests|internal server error|bad gateway|service unavailable|gateway timeout)\b',text)
    return int(next(filter(None,codes[-1]))) if codes else None

def command_failure_reason(stderr):
    # Classify only fixed signatures. Never retain or return provider text,
    # tokens, URLs, account names, paths or command arguments.
    text=diagnostic_text(stderr)
    signatures=[
        ('unsupported-option',r'\b(?:unknown (?:flag|option|command)|flag provided but not defined|unrecognized (?:option|argument))\b'),
        ('config-section',r'\b(?:didn.t find section in config file|couldn.t find section in config file|config section (?:not found|missing)|no section:)'),
        ('oauth-grant',r'\binvalid_grant\b'),
        ('oauth-client',r'\b(?:invalid_client|unauthorized_client)\b'),
        ('oauth-token',r'\b(?:empty token found|empty access token|access token is empty|missing access_token|no access token|token expired and refresh token is not set|token expired and there.s no refresh token)\b'),
        ('api-disabled',r'\b(?:accessnotconfigured|service_disabled|servicedisabled)\b'),
        ('storage-quota',r'\bstoragequotaexceeded\b'),
        ('rate-limit',r'\b(?:userratelimitexceeded|ratelimitexceeded|ratelimit|dailylimitexceeded)\b'),
        ('authentication',r'\b(?:couldn.t (?:fetch|refresh) token|cannot (?:fetch|refresh) token|failed to (?:fetch|refresh|get) token|oauth2|invalid_token|authentication failed|failed to authenticate|invalidcredentials|autherror)\b'),
        ('local-file',r'\b(?:no such file or directory|file does not exist|source file (?:doesn.t exist|not found))\b'),
        ('not-found',r'\b(?:notfound|directory not found|file not found|couldn.t find root directory|invalidparent)\b'),
        ('read-only',r'\b(?:read-only file system|erofs)\b'),
        ('config-write',r'\b(?:failed to (?:save (?:new )?token|create (?:cache|config) directory)|error creating cache directory)\b|\b(?:config|cache)\b[^\n]{0,160}\bpermission denied\b'),
        ('permission',r'\b(?:insufficientpermissions|insufficientfilepermissions|insufficient_scope|insufficient authentication scopes|accessdenied|permissiondenied|permission denied)\b'),
    ]
    reason=next((reason for reason,pattern in signatures if re.search(pattern,text)),None)
    status=command_http_status(stderr)
    return reason or {400:'http-request',401:'authentication',403:'http-forbidden',404:'not-found',429:'rate-limit'}.get(status,'http-server' if status and status>=500 else 'unknown')
STAGES={
    'worker':'chuẩn bị tác vụ','application':'tìm ứng dụng','claim':'nhận tác vụ',
    'database':'tìm cơ sở dữ liệu','workspace':'thư mục làm việc riêng','configuration':'cấu hình công cụ sao lưu','drive-token':'lấy quyền truy cập Drive',
    'media-lock':'khóa ghi tệp','inventory':'đọc danh sách tệp','database-dump':'xuất cơ sở dữ liệu',
    'database-check':'kiểm tra bản xuất','recovery-config':'đọc cấu hình khôi phục',
    'media-copy':'sao chép tệp R2','media-check':'đối chiếu tệp','archive':'đóng gói và lập danh sách kiểm tra',
    'encryption':'mã hóa bản sao','media-unlock':'mở khóa ghi tệp','checksum':'tính mã kiểm tra',
    'daily-upload':'gửi bản hằng ngày lên Drive','daily-check':'xác minh bản hằng ngày trên Drive',
    'monthly':'tạo và xác minh bản tháng','retention':'dọn bản cũ','restore-test':'khôi phục thử riêng',
}
class BackupStageFailure(BackupFailure):
    def __init__(self,code,reason='unknown',exit_code=None,http_status=None):
        self.code=code if code in STAGES else 'worker'
        super().__init__('Backup stage failed: '+self.code,reason,exit_code,http_status)

@contextmanager
def stage(code):
    try:yield
    except BackupStageFailure:raise
    except Exception as error:
        if isinstance(error,BackupFailure):raise BackupStageFailure(code,error.reason,error.exit_code,error.http_status) from None
        raise BackupStageFailure(code) from None

def failure_message(message,error):
    code=error.code if isinstance(error,BackupStageFailure) else 'worker'
    reason=REASONS.get(error.reason) if isinstance(error,BackupFailure) else None
    metadata=(' Mã thoát: '+str(error.exit_code)+'.' if isinstance(error,BackupFailure) and error.exit_code is not None else '')+(' Mã HTTP: '+str(error.http_status)+'.' if isinstance(error,BackupFailure) and error.http_status is not None else '')
    return message+' Bước chưa hoàn tất: '+STAGES.get(code,STAGES['worker'])+'.'+(' Nguyên nhân: '+reason+'.' if reason else '')+metadata

def run(args, *, data=None, timeout=120, output=None):
    rclone=pathlib.Path(args[0]).name=='rclone'
    try:p=subprocess.run(args,input=data,stdout=output or subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout,check=False)
    except subprocess.TimeoutExpired as error:
        reason=command_failure_reason(error.stderr) if rclone else 'unknown'
        raise BackupFailure('Command timed out',reason if reason!='unknown' else 'timeout',http_status=command_http_status(error.stderr) if rclone else None) from None
    if p.returncode: raise BackupFailure('Command failed',command_failure_reason(p.stderr) if rclone else 'unknown',p.returncode,command_http_status(p.stderr) if rclone else None)
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

def clean_private_work(root):
    # Caller holds the process-wide worker lock. Remaining job directories are from a crash.
    for entry in root.iterdir():
        if re.fullmatch(r'job-[a-zA-Z0-9_-]+',entry.name) and not entry.is_symlink() and entry.is_dir() and entry.stat().st_uid==os.geteuid():
            shutil.rmtree(entry)

class NoTokenRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):return None

def fresh_drive_token(values):
    request=urllib.request.Request('https://oauth2.googleapis.com/token',method='POST',
        data=urllib.parse.urlencode({'grant_type':'refresh_token','client_id':values['clientId'],'client_secret':values['clientSecret'],'refresh_token':values['refreshToken']}).encode(),
        headers={'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'})
    try:
        with urllib.request.build_opener(NoTokenRedirect()).open(request,timeout=15) as response:
            if response.status!=200:raise BackupFailure('Drive token request failed','authentication',http_status=response.status)
            body=response.read(65537)
    except BackupFailure:raise
    except urllib.error.HTTPError as error:
        reason='authentication'
        try:
            body=error.read(65537)
            if len(body)<=65536:reason=command_failure_reason(body)
        except Exception:pass
        finally:error.close()
        raise BackupFailure('Drive token request failed',reason if reason!='unknown' else 'authentication',http_status=error.code) from None
    except (TimeoutError,urllib.error.URLError) as error:
        timed_out=isinstance(error,TimeoutError) or isinstance(getattr(error,'reason',None),TimeoutError)
        raise BackupFailure('Drive token request failed','timeout' if timed_out else 'authentication') from None
    except Exception:raise BackupFailure('Drive token request failed','authentication') from None
    try:
        if len(body)>65536:raise ValueError()
        result=json.loads(body)
        token=result.get('access_token');expires=result.get('expires_in')
        if not isinstance(token,str) or not re.fullmatch(r'[\x21-\x7e]{1,8192}',token) or type(expires) is not int or not 60<=expires<=86400 or result.get('token_type','Bearer').lower()!='bearer':raise ValueError()
        expiry=datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(seconds=expires)
        return {'access_token':token,'refresh_token':values['refreshToken'],'token_type':'Bearer','expiry':expiry.isoformat().replace('+00:00','Z')}
    except Exception:raise BackupFailure('Drive token response invalid','oauth-token') from None

def rclone_config(root, config):
    v=config['drive'];p=root/'rclone.conf'
    # rclone's native token reader requires an access token; refresh-only JSON
    # falls through its legacy parser and loses snake_case refresh_token.
    with stage('drive-token'):token=fresh_drive_token(v)
    # Values are validated by the owner-only API; quote token through JSON, never shell interpolation.
    cp=configparser.ConfigParser(interpolation=None)
    cp['drive']={'type':'drive','client_id':v['clientId'],'client_secret':v['clientSecret'],'scope':'drive.file','root_folder_id':v['folderId'],'token':json.dumps(token)}
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

def recovery_environment():
    private=json.loads(pathlib.Path('/etc/luatvietduc-deploy/config.json').read_text())
    return pathlib.Path(private['env_file'])

def capture(web,db,config,root,rc):
    with stage('media-lock'):bridge(web,'lock')
    try:
        with stage('inventory'):
            inventory=bridge(web,'inventory');bundle=root/'bundle';bundle.mkdir()
        with stage('database-dump'):
            with (bundle/'database.dump').open('xb') as out: run(['docker','exec',db,'pg_dump','-U','lvd','-d','luatvietduc','-Fc'],output=out,timeout=600)
        with stage('database-check'):
            with (bundle/'database.dump').open('rb') as source:
                p=subprocess.run(['docker','exec','-i',db,'pg_restore','--list'],stdin=source,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=120)
            if p.returncode:raise BackupFailure('Invalid database dump')
        with stage('recovery-config'):
            env=recovery_environment()
            if env.stat().st_uid!=0 or env.stat().st_mode & 0o077: raise BackupFailure('Application recovery configuration permissions')
            shutil.copyfile(env,bundle/'app.env');(bundle/'app.env').chmod(0o600)
        with stage('media-copy'):
            (bundle/'media').mkdir()
            if config.get('r2'): run(rc+['copy','media:'+config['r2']['bucket'],str(bundle/'media')],timeout=900)
            elif inventory: raise BackupFailure('Media exists but R2 is unavailable')
        with stage('media-check'):
            for item in inventory:
                parts=[str(item.get(k) or '').strip('/') for k in ['prefix','_object_key','filename']]
                key=pathlib.PurePosixPath('/'.join(x for x in parts if x))
                if key.is_absolute() or '..' in key.parts or not (bundle/'media').joinpath(*key.parts).is_file(): raise BackupFailure('Referenced media missing')
        with stage('archive'):
            files={str(p.relative_to(bundle)):sha(p) for p in bundle.rglob('*') if p.is_file()}
            manifest={'format':1,'application':'luatvietduc','commit':config['release']['commit'],'created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'media_count':len(inventory),'files':files}
            (bundle/'manifest.json').write_text(json.dumps(manifest))
            tarpath=root/'bundle.tar.gz'
            with tarfile.open(tarpath,'w:gz') as tar:
                for child in bundle.iterdir(): tar.add(child,arcname=child.name,recursive=True)
        with stage('encryption'):
            encrypted=root/'bundle.tar.gz.age'
            run(['age','--encrypt','-r',config['drive']['ageRecipient'],'-o',str(encrypted),str(tarpath)],timeout=600)
        return encrypted,manifest
    finally:
        with stage('media-unlock'):bridge(web,'unlock')

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

def schedule():
    if os.geteuid()!=0:raise BackupFailure('Privileged app worker required')
    # Enqueue before the runner lock: if a manual job is already running, the
    # minute queue worker picks this scheduled job up after it finishes.
    with stage('application'):web=container('web')
    with stage('claim'):return bridge(web,'schedule')

def once():
    if os.geteuid()!=0:raise BackupFailure('Privileged app worker required')
    os.umask(0o077);BASE.mkdir(mode=0o700,parents=True,exist_ok=True)
    with (BASE/'runner.lock').open('a') as lock:
        try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:return
        clean_private_work(BASE)
        with stage('application'):web=container('web')
        with stage('claim'):config=bridge(web,'claim')
        if not config:return
        stop=threading.Event()
        def heartbeat():
            while not stop.wait(30):
                try:bridge(container('web'),'pulse')
                except Exception:pass
        monitor=threading.Thread(target=heartbeat,daemon=True);monitor.start()
        job=config['job'];result={'id':job['id'],'ok':False,'message':'Sao lưu chưa đạt; không có thay đổi vào dữ liệu đang chạy.'}
        try:
            with stage('database'):db=container('database')
            with stage('workspace'),tempfile.TemporaryDirectory(prefix='job-',dir=BASE) as tmp:
                root=pathlib.Path(tmp)
                with stage('configuration'):rc=rclone_config(root,config)
                if job['kind']=='restore-test':
                    with stage('restore-test'):result.update(ok=True,tested=restore_drill(db,config,root,rc),message='Khôi phục thử đạt trong PostgreSQL riêng, không kết nối mạng. Dữ liệu đang chạy không thay đổi.')
                else:
                    encrypted,manifest=capture(web,db,config,root,rc)
                    with stage('checksum'):checksum=sha(encrypted);path='daily/'+job['id']+'.tar.gz.age'
                    with stage('daily-upload'):run(rc+['copyto',str(encrypted),remote_path(path)],timeout=600)
                    with stage('daily-check'):verify_remote(rc,path,checksum)
                    monthly=None;now=datetime.datetime.now(datetime.timezone.utc)
                    result.update(ok=True,snapshot={'path':path,'monthly':None,'sha256':checksum,'bytes':encrypted.stat().st_size,'commit':manifest['commit'],'media':bool(config.get('r2'))},message='Bản hằng ngày đã được xác minh. Bản tháng hoặc dọn bản cũ chưa hoàn tất; các bản cũ được giữ lại.')
                    with stage('monthly'):
                        if not any(h.get('monthly_path') and str(h['created_at'])[:7]==now.strftime('%Y-%m') for h in config['history']):
                            monthly='monthly/'+job['id']+'.tar.gz.age';run(rc+['copyto',str(encrypted),remote_path(monthly)],timeout=600);verify_remote(rc,monthly,checksum)
                    result.update(ok=True,snapshot={'path':path,'monthly':monthly,'sha256':checksum,'bytes':encrypted.stat().st_size,'commit':manifest['commit'],'media':bool(config.get('r2'))},message='Đã mã hóa, gửi lên Drive và đối chiếu SHA-256 của bản tải xuống.')
                    daily_trashed=[];monthly_trashed=[]
                    result.update(dailyTrashed=daily_trashed,monthlyTrashed=monthly_trashed,message='Bản sao mới đã được xác minh. Chưa dọn hết bản cũ; sẽ thử lại trong lượt sao lưu sau.')
                    with stage('retention'):
                        old_daily,old_monthly=retention_plan(config['history'],monthly)
                        for old in old_daily:
                            run(rc+['deletefile',remote_path(old['remote_path'])],timeout=120);daily_trashed.append(old['id'])
                        for old in old_monthly:
                            run(rc+['deletefile',remote_path(old['monthly_path'])],timeout=120);monthly_trashed.append(old['id'])
                    result.update(ok=True,snapshot={'path':path,'monthly':monthly,'sha256':checksum,'bytes':encrypted.stat().st_size,'commit':manifest['commit'],'media':bool(config.get('r2'))},dailyTrashed=daily_trashed,monthlyTrashed=monthly_trashed,message='Đã mã hóa, gửi lên Drive và đối chiếu SHA-256 của bản tải xuống.')
        except Exception as error:
            # Never write provider exceptions, tokens, archive content, or private restore identities to logs.
            result['message']=failure_message(result['message'],error)
        finally:
            stop.set();monitor.join(timeout=65)
            bridge(container('web'),'finish',**result)
if __name__=='__main__':
    try:
        if sys.argv[1:]==['--schedule']:schedule()
        elif sys.argv[1:]:raise BackupFailure('Unsupported worker argument')
        once()
    except Exception as error:raise SystemExit(failure_message('Chưa khởi động được tác vụ sao lưu.',error)) from None

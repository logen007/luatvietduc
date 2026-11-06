"""Synthetic local archive fixtures only; no Docker, Drive, keys, or live data."""
import importlib.util, io, pathlib, tarfile, tempfile, unittest
from unittest.mock import patch,MagicMock
spec=importlib.util.spec_from_file_location('backup_runner',pathlib.Path(__file__).with_name('runner.py'))
runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)
class BackupBoundaryTests(unittest.TestCase):
    def archive(self,root,members):
        archive=root/'test.tar.gz'
        with tarfile.open(archive,'w:gz') as tar:
            for name,kind in members:
                member=tarfile.TarInfo(name)
                if kind=='file':member.size=4;tar.addfile(member,io.BytesIO(b'test'))
                else:member.type=kind;member.linkname='/tmp/escape';tar.addfile(member)
        return archive
    def test_normal_archive_restores_inside_private_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=pathlib.Path(tmp);dest=root/'out';dest.mkdir()
            runner.extract_safe(self.archive(root,[('media/example.txt','file')]),dest)
            self.assertEqual((dest/'media/example.txt').read_bytes(),b'test')
    def test_traversal_absolute_links_and_devices_cannot_escape_restore_directory(self):
        for name,kind in [('../escape','file'),('/tmp/escape','file'),('link',tarfile.SYMTYPE),('hardlink',tarfile.LNKTYPE),('device',tarfile.CHRTYPE)]:
            with self.subTest(name=name,kind=kind),tempfile.TemporaryDirectory() as tmp:
                root=pathlib.Path(tmp);dest=root/'out';dest.mkdir()
                with self.assertRaises(runner.BackupFailure):runner.extract_safe(self.archive(root,[(name,kind)]),dest)
                self.assertFalse((root/'escape').exists())
    def test_archive_cannot_overwrite_an_existing_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=pathlib.Path(tmp);dest=root/'out';dest.mkdir();(dest/'keep').write_text('original')
            with self.assertRaises(FileExistsError):runner.extract_safe(self.archive(root,[('keep','file')]),dest)
            self.assertEqual((dest/'keep').read_text(),'original')
    def test_remote_path_cannot_target_another_folder_or_remote(self):
        identifier='12345678-abcd-4567-89ab-123456789abc'
        self.assertEqual(runner.remote_path('daily/'+identifier+'.tar.gz.age'),'drive:daily/'+identifier+'.tar.gz.age')
        for path in ['drive:other','daily/../file','other/'+identifier+'.tar.gz.age','daily/'+'-'*36+'.tar.gz.age']:
            with self.assertRaises(runner.BackupFailure):runner.remote_path(path)
    def test_retention_preserves_seven_daily_and_monthly_independently(self):
        history=[{'id':str(i),'monthly_path':'monthly/file' if i in [2,7] else None,'daily_trashed':i==7} for i in range(10)]
        daily,monthly=runner.retention_plan(history,False)
        self.assertEqual([h['id'] for h in daily],['6','8','9'])
        self.assertEqual([h['id'] for h in monthly],['7'])
        self.assertEqual([h['id'] for h in runner.retention_plan(history,True)[1]],['2','7'])
    def test_crash_cleanup_removes_only_private_job_directories(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=pathlib.Path(tmp);base=root/'worker';base.mkdir();outside=root/'outside';outside.mkdir();(outside/'keep').write_text('keep')
            stale=base/'job-stale';stale.mkdir();(stale/'private-key-fixture').write_text('synthetic')
            (base/'job-link').symlink_to(outside,target_is_directory=True)
            (base/'runner.lock').write_text('');(base/'other').mkdir()
            runner.clean_private_work(base)
            self.assertFalse(stale.exists());self.assertTrue((outside/'keep').exists());self.assertTrue((base/'job-link').is_symlink());self.assertTrue((base/'runner.lock').exists());self.assertTrue((base/'other').is_dir())

    def test_stage_reports_only_the_fixed_label_and_keeps_the_inner_failure(self):
        private='synthetic-refresh-token private-key provider-error /private/archive'
        for error in [RuntimeError(private),runner.subprocess.TimeoutExpired(['tool',private],3,stderr=private.encode())]:
            with self.subTest(error=type(error).__name__):
                try:
                    with runner.stage('workspace'):
                        with runner.stage('media-copy'):raise error
                except runner.BackupStageFailure as failure:
                    self.assertEqual(failure.code,'media-copy')
                    self.assertTrue(failure.__suppress_context__)
                    message=runner.failure_message('Sao lưu chưa đạt.',failure)
                    self.assertIn('sao chép tệp R2',message)
                    for value in private.split():self.assertNotIn(value,message)
                else:self.fail('The failed stage must be reported')
        self.assertNotIn(private,runner.failure_message('Sao lưu chưa đạt.',RuntimeError(private)))
        self.assertEqual(runner.BackupStageFailure(private).code,'worker')

    def test_capture_releases_the_media_lease_without_losing_the_failed_stage(self):
        actions=[]
        def bridge(_web,action):
            actions.append(action)
            return [] if action=='inventory' else True
        with tempfile.TemporaryDirectory() as tmp,patch.object(runner,'bridge',side_effect=bridge),patch.object(runner,'run',side_effect=RuntimeError('synthetic-private-command-output')):
            with self.assertRaises(runner.BackupStageFailure) as failed:
                runner.capture('synthetic-web','synthetic-db',{},pathlib.Path(tmp),[])
        self.assertEqual(failed.exception.code,'database-dump')
        self.assertEqual(actions,['lock','inventory','unlock'])

    def test_rclone_known_failures_report_only_an_allowlisted_reason(self):
        private='synthetic-refresh-token@example.invalid /private/config-secret'
        fixtures=[
            ('oauth-grant','oauth2: cannot fetch token: {"error":"invalid_grant"}'),
            ('oauth-client','{"error":"invalid_client"}'),
            ('oauth-token','empty token found - please reconnect'),
            ('oauth-token',"token expired and there's no refresh token - manually refresh with rclone config reconnect"),
            ('api-disabled','googleapi: Error 403: accessNotConfigured'),
            ('permission','googleapi: Error 403: insufficientPermissions'),
            ('permission','googleapi: Error 403: insufficientFilePermissions'),
            ('storage-quota','googleapi: Error 403: storageQuotaExceeded'),
            ('rate-limit','googleapi: Error 403: userRateLimitExceeded'),
            ('not-found','googleapi: Error 404: notFound'),
            ('read-only','Failed to save new token: read-only file system'),
            ('config-write','Failed to create cache directory: permission denied'),
            ('unsupported-option','Fatal error: unknown flag: --synthetic-option'),
            ('unsupported-option','flag provided but not defined: synthetic-option'),
            ('config-section',"didn't find section in config file"),
            ('config-section',"couldn't find section in config file"),
            ('authentication',"couldn't fetch token: unexpected authentication response"),
            ('authentication','oauth2: invalid credentials'),
            ('local-file','Failed to copy: open synthetic-file: no such file or directory'),
            ('permission','open synthetic-file: permission denied'),
        ]
        for reason,diagnostic in fixtures:
            with self.subTest(reason=reason,diagnostic=diagnostic):
                process=runner.subprocess.CompletedProcess(['rclone'],1,stdout=private.encode(),stderr=(diagnostic+' '+private).encode())
                with patch.object(runner.subprocess,'run',return_value=process):
                    with self.assertRaises(runner.BackupStageFailure) as failed:
                        with runner.stage('daily-upload'):runner.run(['rclone','--config',private])
                error=failed.exception;self.assertEqual(error.reason,reason)
                message=runner.failure_message('Sao lưu chưa đạt.',error)
                self.assertIn(runner.STAGES['daily-upload'],message);self.assertIn(runner.REASONS[reason],message)
                self.assertNotIn(private,message);self.assertNotIn(private,str(error));self.assertFalse(hasattr(error,'stderr'))

    def test_unknown_provider_text_or_unrelated_commands_stay_generic(self):
        private='synthetic-secret-unrecognized-error'
        for executable,stderr in [('rclone',private),('docker','invalid_grant '+private)]:
            process=runner.subprocess.CompletedProcess([executable],1,stderr=stderr.encode())
            with patch.object(runner.subprocess,'run',return_value=process):
                with self.assertRaises(runner.BackupStageFailure) as failed:
                    with runner.stage('daily-upload'):runner.run([executable])
            self.assertEqual(failed.exception.reason,'unknown')
            message=runner.failure_message('Sao lưu chưa đạt.',failed.exception)
            self.assertNotIn('Nguyên nhân:',message);self.assertNotIn(private,message)
        self.assertEqual(runner.BackupFailure('Failed',private).reason,'unknown')

    def test_timeout_keeps_a_known_rclone_reason_or_uses_a_safe_timeout_label(self):
        for stderr,reason in [(b'invalid_grant synthetic-secret','oauth-grant'),(b'synthetic-secret','timeout')]:
            with patch.object(runner.subprocess,'run',side_effect=runner.subprocess.TimeoutExpired(['rclone','synthetic-secret'],3,stderr=stderr)):
                with self.assertRaises(runner.BackupStageFailure) as failed:
                    with runner.stage('daily-upload'):runner.run(['rclone'])
            self.assertEqual(failed.exception.reason,reason)
            self.assertNotIn('synthetic-secret',runner.failure_message('Sao lưu chưa đạt.',failed.exception))

    def test_reason_classification_is_bounded_to_the_tail_and_ignores_invalid_utf8(self):
        self.assertEqual(runner.command_failure_reason(b'invalid_grant'+b'x'*65536),'unknown')
        self.assertEqual(runner.command_failure_reason(b'x'*65536+b'\xff storageQuotaExceeded'),'storage-quota')

    def test_http_status_and_exit_code_survive_nested_stages_without_provider_details(self):
        private='synthetic-private-provider-message@example.invalid'
        for status,reason in [(400,'http-request'),(401,'authentication'),(403,'http-forbidden'),(404,'not-found'),(429,'rate-limit'),(500,'http-server'),(502,'http-server'),(503,'http-server'),(504,'http-server'),(599,'http-server')]:
            for diagnostic in [f'HTTP/2 {status}',f'googleapi: Error {status}: {private}',f'{{"error":{{"code":{status}}}}}']:
                with self.subTest(status=status,diagnostic=diagnostic):
                    process=runner.subprocess.CompletedProcess(['rclone'],3,stderr=diagnostic.encode())
                    with patch.object(runner.subprocess,'run',return_value=process):
                        with self.assertRaises(runner.BackupStageFailure) as failed:
                            with runner.stage('workspace'):
                                with runner.stage('daily-upload'):runner.run(['/usr/bin/rclone','--config',private])
                    error=failed.exception
                    self.assertEqual((error.code,error.reason,error.http_status,error.exit_code),('daily-upload',reason,status,3))
                    message=runner.failure_message('Sao lưu chưa đạt.',error)
                    self.assertIn('Mã HTTP: '+str(status),message);self.assertIn('Mã thoát: 3',message);self.assertNotIn(private,message)

    def test_diagnostic_metadata_accepts_only_bounded_numeric_values(self):
        for status in [None,True,'403',200,402,499,600,9999,'synthetic-secret']:
            error=runner.BackupFailure('Failed',http_status=status)
            self.assertIsNone(error.http_status);self.assertNotIn('Mã HTTP:',runner.failure_message('Failed.',error))
        for code in [True,'1',-129,256,'synthetic-secret']:
            self.assertIsNone(runner.BackupFailure('Failed',exit_code=code).exit_code)
        for diagnostic in ['private-id=403','HTTP 40300','status 200','Error 600']:
            self.assertIsNone(runner.command_http_status(diagnostic))
        self.assertEqual(runner.command_http_status('HTTP 401 followed by HTTP 503'),503)

    def token_response(self,body,status=200):
        response=MagicMock();response.__enter__.return_value=response
        response.status=status;response.read.return_value=body
        return response

    def test_rclone_config_uses_fresh_native_oauth_fields_and_preserves_the_refresh_token(self):
        values={'clientId':'synthetic-client','clientSecret':'synthetic-client-secret','refreshToken':'synthetic-original-refresh','folderId':'synthetic-folder'}
        response=self.token_response(runner.json.dumps({'access_token':'synthetic-fresh-access','refresh_token':'must-not-replace-original','expires_in':3600,'token_type':'Bearer'}).encode())
        opener=MagicMock();opener.open.return_value=response
        before=runner.datetime.datetime.now(runner.datetime.timezone.utc)
        with tempfile.TemporaryDirectory() as tmp,patch.object(runner.urllib.request,'build_opener',return_value=opener) as build:
            root=pathlib.Path(tmp);command=runner.rclone_config(root,{'drive':values})
            config=runner.configparser.ConfigParser(interpolation=None);config.read(root/'rclone.conf')
            token=runner.json.loads(config['drive']['token'])
            self.assertEqual(token['access_token'],'synthetic-fresh-access');self.assertEqual(token['refresh_token'],values['refreshToken']);self.assertEqual(token['token_type'],'Bearer')
            expiry=runner.datetime.datetime.fromisoformat(token['expiry'].replace('Z','+00:00'))
            self.assertGreaterEqual(expiry,before+runner.datetime.timedelta(seconds=3600));self.assertLessEqual(expiry,runner.datetime.datetime.now(runner.datetime.timezone.utc)+runner.datetime.timedelta(seconds=3600))
            self.assertEqual((root/'rclone.conf').stat().st_mode&0o777,0o600);self.assertEqual(command[:2],['rclone','--config'])
        request=opener.open.call_args.args[0]
        self.assertEqual(request.full_url,'https://oauth2.googleapis.com/token');self.assertEqual(request.get_method(),'POST');self.assertEqual(opener.open.call_args.kwargs,{'timeout':15})
        self.assertEqual(runner.urllib.parse.parse_qs(request.data.decode()),{'grant_type':['refresh_token'],'client_id':[values['clientId']],'client_secret':[values['clientSecret']],'refresh_token':[values['refreshToken']]})
        self.assertIsInstance(build.call_args.args[0],runner.NoTokenRedirect);response.read.assert_called_once_with(65537)
        self.assertIsNone(runner.NoTokenRedirect().redirect_request(request,None,302,'redirect',{},'https://attacker.invalid'))

    def test_invalid_or_oversized_oauth_responses_never_create_a_config_or_expose_data(self):
        private='synthetic-secret-response';values={'clientId':'synthetic','clientSecret':private,'refreshToken':private,'folderId':'synthetic'}
        base={'access_token':'synthetic-access','expires_in':3600}
        bodies=[b'not-json',b'x'*65537,b'[]',b'{}']+[runner.json.dumps({**base,**invalid}).encode() for invalid in [{'access_token':''},{'access_token':'bad token'},{'access_token':'bad\0token'},{'access_token':'x'*8193},{'expires_in':59},{'expires_in':86401},{'expires_in':True},{'expires_in':'3600'},{'token_type':'Basic'}]]
        for body in bodies:
            with self.subTest(size=len(body)),tempfile.TemporaryDirectory() as tmp:
                opener=MagicMock();opener.open.return_value=self.token_response(body)
                with patch.object(runner.urllib.request,'build_opener',return_value=opener):
                    with self.assertRaises(runner.BackupStageFailure) as failed:runner.rclone_config(pathlib.Path(tmp),{'drive':values})
                self.assertEqual((failed.exception.code,failed.exception.reason),('drive-token','oauth-token'));self.assertFalse((pathlib.Path(tmp)/'rclone.conf').exists())
                self.assertNotIn(private,runner.failure_message('Failed.',failed.exception))

    def test_oauth_http_redirect_timeout_and_network_errors_are_safe_and_not_retried(self):
        private='synthetic-private-provider-detail';values={'clientId':'synthetic','clientSecret':private,'refreshToken':private}
        failures=[
            (runner.urllib.error.HTTPError('https://oauth2.googleapis.com/token',400,private,{},io.BytesIO(('invalid_grant '+private).encode())),'oauth-grant',400),
            (runner.urllib.error.HTTPError('https://oauth2.googleapis.com/token',302,private,{'Location':'https://attacker.invalid'},io.BytesIO(private.encode())),'authentication',None),
            (TimeoutError(private),'timeout',None),
            (runner.urllib.error.URLError(TimeoutError(private)),'timeout',None),
            (runner.urllib.error.URLError(private),'authentication',None),
        ]
        for failure,reason,status in failures:
            with self.subTest(failure=type(failure).__name__):
                opener=MagicMock();opener.open.side_effect=failure
                with patch.object(runner.urllib.request,'build_opener',return_value=opener):
                    with self.assertRaises(runner.BackupFailure) as failed:runner.fresh_drive_token(values)
                self.assertEqual((failed.exception.reason,failed.exception.http_status),(reason,status));opener.open.assert_called_once()
                self.assertNotIn(private,str(failed.exception));self.assertNotIn(private,runner.failure_message('Failed.',failed.exception))

    def job_result(self,fail_at):
        identifier='12345678-abcd-4567-89ab-123456789abc';finished=[]
        config={'job':{'id':identifier,'kind':'backup'},'history':[],'r2':None}
        private='synthetic-secret-from-provider'
        def bridge(_web,action,**values):
            if action=='claim':return config
            if action=='finish':finished.append(values);return True
            self.fail('Unexpected real bridge action '+action)
        def container(service):
            if fail_at=='database' and service=='database':raise RuntimeError(private)
            return 'synthetic-'+service
        def configuration(_root,_config):
            if fail_at=='configuration':raise RuntimeError(private)
            return ['synthetic-rclone']
        def capture(_web,_db,_config,root,_rc):
            path=root/'synthetic.age';path.write_bytes(b'encrypted synthetic fixture')
            return path,{'commit':'synthetic-commit'}
        def command(args,**_kwargs):
            if fail_at=='daily-upload' or fail_at=='monthly' and any('drive:monthly/' in item for item in args):
                raise runner.subprocess.TimeoutExpired(['synthetic-rclone',private],3,stderr=private.encode())
            return b''
        def verify(_rc,path,_checksum):
            if fail_at=='daily-check':raise RuntimeError(private)
        with tempfile.TemporaryDirectory() as tmp,patch.object(runner,'BASE',pathlib.Path(tmp)),patch.object(runner.os,'geteuid',return_value=0),patch.object(runner.os,'umask'),patch.object(runner.threading,'Thread',return_value=MagicMock()),patch.object(runner,'container',side_effect=container),patch.object(runner,'bridge',side_effect=bridge),patch.object(runner,'rclone_config',side_effect=configuration),patch.object(runner,'capture',side_effect=capture),patch.object(runner,'run',side_effect=command),patch.object(runner,'verify_remote',side_effect=verify):
            runner.once()
        self.assertEqual(len(finished),1,'A claimed job must always receive its finish receipt')
        self.assertNotIn(private,str(finished))
        return finished[0]

    def test_claimed_job_setup_failures_finish_with_a_safe_stage(self):
        for code in ['database','configuration']:
            with self.subTest(code=code):
                result=self.job_result(code)
                self.assertFalse(result['ok']);self.assertNotIn('snapshot',result)
                self.assertIn(runner.STAGES[code],result['message'])

    def test_daily_upload_or_verification_failure_cannot_claim_a_snapshot(self):
        for code in ['daily-upload','daily-check']:
            with self.subTest(code=code):
                result=self.job_result(code)
                self.assertFalse(result['ok']);self.assertNotIn('snapshot',result)
                self.assertIn(runner.STAGES[code],result['message'])

    def test_monthly_failure_keeps_the_already_verified_daily_snapshot(self):
        result=self.job_result('monthly')
        self.assertTrue(result['ok']);self.assertTrue(result['snapshot']['path'].startswith('daily/'))
        self.assertIsNone(result['snapshot']['monthly']);self.assertIn(runner.STAGES['monthly'],result['message'])
if __name__=='__main__':unittest.main()

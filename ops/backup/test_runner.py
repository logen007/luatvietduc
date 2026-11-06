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

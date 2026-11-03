"""Synthetic local archive fixtures only; no Docker, Drive, keys, or live data."""
import importlib.util, io, pathlib, tarfile, tempfile, unittest
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
if __name__=='__main__':unittest.main()

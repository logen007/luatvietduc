import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch
import lvd

class PortableTests(unittest.TestCase):
    def test_origin_rejects_credentials_and_env_injection(self):
        self.assertEqual(lvd.origin('https://example.com/'), 'https://example.com')
        for value in ['https://user:pass@example.com', 'https://example.com/path', 'https://example.com\nKEY=value', 'https://example.com/$SECRET']:
            with self.assertRaises(RuntimeError): lvd.origin(value)

    def test_environment_keeps_key_but_never_executes_shell(self):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / 'env'
            file.write_text('PAYLOAD_SECRET=' + 'a'*64 + '\nDB_PASSWORD=' + 'b'*64 + '\nAPP_URL=https://example.com\n')
            self.assertEqual(lvd.environment(file)['PAYLOAD_SECRET'], 'a'*64)
            file.write_text(file.read_text() + 'NODE_OPTIONS=--import=evil\n')
            with self.assertRaises(RuntimeError): lvd.environment(file)

    def test_restore_refuses_existing_installation(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); (root / 'keep').write_text('existing')
            with self.assertRaisesRegex(RuntimeError, 'empty'):
                lvd.create(root, {}, 'https://example.com', 3051)
            self.assertEqual((root / 'keep').read_text(), 'existing')

    def test_live_production_project_is_never_adopted(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); (root / 'config.json').write_text(json.dumps({'format':1,'project':'luatvietduc'}))
            with self.assertRaisesRegex(RuntimeError, 'Not a portable'):
                lvd.Site(root)

    def test_archive_rejects_links_traversal_and_duplicates(self):
        for name, kind, twice in [('../outside', tarfile.REGTYPE, False), ('/outside', tarfile.REGTYPE, False),
                                  ('link', tarfile.SYMTYPE, False), ('same', tarfile.REGTYPE, True)]:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as folder:
                root = Path(folder); archive = root / 'data.tar.gz'; dest = root / 'dest'; dest.mkdir()
                with tarfile.open(archive, 'w:gz') as output:
                    member = tarfile.TarInfo(name); member.type = kind; member.size = 1 if kind == tarfile.REGTYPE else 0
                    output.addfile(member, io.BytesIO(b'x') if member.size else None)
                    if twice: output.addfile(member, io.BytesIO(b'x'))
                with self.assertRaises(RuntimeError): lvd.extract(archive, dest)
                self.assertFalse((root / 'outside').exists())

    def test_archive_checks_content_and_unlisted_files(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); src = root / 'src'; src.mkdir(); (src / 'database.dump').write_bytes(b'synthetic dump')
            lvd.write_json(src / 'manifest.json', {'format':1,'files':lvd.archive_manifest(src)})
            def pack():
                archive = root / 'data.tar.gz'
                with tarfile.open(archive, 'w:gz') as output:
                    for file in src.iterdir(): output.add(file, arcname=file.name)
                return archive
            target = root / 'valid'; target.mkdir(); lvd.extract(pack(), target)
            (src / 'unlisted').write_text('unexpected')
            target = root / 'invalid'; target.mkdir()
            with self.assertRaisesRegex(RuntimeError, 'checksum'): lvd.extract(pack(), target)

    def test_schema_change_requires_explicit_review_and_no_downgrade(self):
        site = FakeSite()
        try:
            with self.assertRaisesRegex(RuntimeError, 'Schema changed'):
                lvd.update(site, {**site.state,'migrations':['a','b']})
            self.assertEqual(site.calls, [])
            with self.assertRaisesRegex(RuntimeError, 'Older/divergent'):
                lvd.update(site, {**site.state,'migrations':['other']}, True)
        finally: site.close()

    def test_failed_application_rolls_back_without_database_commands(self):
        site = FakeSite()
        try:
            with self.assertRaisesRegex(RuntimeError, 'unhealthy'):
                lvd.update(site, {**site.state,'image':'sha256:'+'b'*64})
            self.assertEqual(site.running_image, site.state['image'])
            self.assertFalse((site.root / 'operation.json').exists())
            self.assertNotIn('migrate', site.calls)
            self.assertEqual(json.loads((site.root/'state.json').read_text()), site.state)
        finally: site.close()

    def test_schema_failure_stops_workers_and_retains_recovery_journal(self):
        site = FakeSite()
        try:
            with self.assertRaisesRegex(RuntimeError, 'unhealthy'):
                lvd.update(site, {**site.state,'image':'sha256:'+'b'*64,'migrations':['a','b']}, True)
            self.assertTrue((site.root / 'operation.json').exists())
            self.assertFalse(site.running_image)
            self.assertIn('migrate', site.calls)
        finally: site.close()

    def test_failed_export_restarts_only_if_previously_running(self):
        for active in [False, True]:
            site = FakeSite(); site.active = active
            site.tool = lambda *a, **k: (_ for _ in ()).throw(RuntimeError('storage unavailable'))
            try:
                with self.assertRaises(RuntimeError): lvd.backup(site, site.root/'export.age', 'age1synthetic')
                self.assertEqual('start' in site.calls, active)
                self.assertFalse((site.root/'export.age').exists())
                self.assertFalse(any(site.root.glob('export-*')))
            finally: site.close()

class FakeSite:
    def __init__(self):
        self.temp = tempfile.TemporaryDirectory(); self.root = Path(self.temp.name)
        self.state = {'image':'sha256:'+'a'*64,'migrations':['a'],'version':'01.00.00'}
        lvd.write_json(self.root/'state.json', self.state)
        self.calls=[]; self.running_image=self.state['image']; self.active=True
    def close(self): self.temp.cleanup()
    def stop(self): self.calls.append('stop'); self.running_image=None
    def start(self): self.calls.append('start')
    def tool(self, action, **kwargs): self.calls.append(action)
    def compose(self, *args, image=None, **kwargs):
        self.calls.append(args)
        if args[0]=='up': self.running_image=image
        if args[0]=='ps': return b'web' if self.active else b''
        return b''
    def probe(self):
        if self.running_image != self.state['image']: raise RuntimeError('unhealthy')

if __name__ == '__main__': unittest.main()

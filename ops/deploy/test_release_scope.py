"""Fast CI scope follows live ancestry; failures and code changes keep full CI."""
import importlib.util,io,json,os,runpy,subprocess,tarfile,tempfile,unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT=Path(__file__).with_name('release-scope.py')
BASE='a'*40
class Scope(unittest.TestCase):
    def scope(self, paths, *, event='push', base=BASE, offline=False, ancestor=True):
        with tempfile.TemporaryDirectory() as directory:
            output=Path(directory)/'output'
            def ancestry(*args,**kwargs):
                if not ancestor:raise subprocess.CalledProcessError(1,args[0])
            with patch.dict(os.environ,{'EVENT_NAME':event,'GITHUB_OUTPUT':str(output)}), \
                 patch('urllib.request.urlopen',side_effect=OSError('offline') if offline else None,return_value=io.BytesIO(json.dumps({'commit':base}).encode())), \
                 patch('subprocess.run',side_effect=ancestry) as git, \
                 patch('subprocess.check_output',return_value='\n'.join(paths)):
                runpy.run_path(str(SCRIPT),run_name='__main__')
                value=output.read_text().strip()
                if event!='push':git.assert_not_called()
                return value
    def test_css_only_can_use_existing_fast_gate(self):
        self.assertEqual(self.scope(['apps/cms/src/presentation/live-css/07-assistant-chat.css','apps/cms/public/customer-chat.css','apps/cms/src/modules/shared/site-version.json']),'fast=true')
    def test_code_schema_and_policy_never_skip_application_checks(self):
        for path in ['apps/cms/src/modules/chat/ui/Composer.tsx','apps/cms/src/migrations/example.ts','.github/workflows/platform-foundation.yml','ops/deploy/auto-release.py']:
            with self.subTest(path=path):self.assertEqual(self.scope(['apps/cms/public/customer-chat.css',path]),'fast=false')
    def test_unpublished_code_cannot_hide_behind_a_later_css_push(self):
        self.assertEqual(self.scope(['apps/cms/src/modules/public-site/Home.tsx','apps/cms/public/customer-chat.css']),'fast=false')
    def test_missing_invalid_or_unrelated_live_revision_runs_full_checks(self):
        for options in [{'offline':True},{'base':'main'},{'ancestor':False}]:
            with self.subTest(options=options):self.assertEqual(self.scope(['apps/cms/public/customer-chat.css'],**options),'fast=false')
    def test_pull_requests_keep_full_validation(self):
        self.assertEqual(self.scope(['apps/cms/public/customer-chat.css'],event='pull_request'),'fast=false')
    def test_archived_fast_inputs_assemble_without_the_application_tree(self):
        spec=importlib.util.spec_from_file_location('fast_release',SCRIPT.with_name('auto-release.py'))
        release=importlib.util.module_from_spec(spec);spec.loader.exec_module(release)
        repo=SCRIPT.resolve().parents[2]
        with tempfile.TemporaryDirectory() as directory:
            archive=Path(directory)/'source.tar'
            subprocess.run(['git','archive','--format=tar','--output='+str(archive),'HEAD',*release.FAST_INPUTS],cwd=repo,check=True,capture_output=True)
            with tarfile.open(archive) as source:
                for member in source.getmembers():
                    self.assertFalse(Path(member.name).is_absolute())
                    self.assertNotIn('..',Path(member.name).parts)
                    self.assertTrue(member.isfile() or member.isdir())
                source.extractall(directory)
            result=subprocess.run(['node',str(Path(directory)/'apps/cms/scripts/prepare-fast-release.mjs')],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            for name in release.FAST_PUBLIC:
                if name!='release.json':self.assertTrue((Path(directory)/'apps/cms/public'/name).is_file(),name)
    def test_empty_change_is_not_a_fast_release(self):
        self.assertEqual(self.scope([]),'fast=false')
if __name__=='__main__':unittest.main()

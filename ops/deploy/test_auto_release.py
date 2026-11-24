"""Focused release safety tests: no Docker daemon, network or live database."""
import hashlib
import importlib.util
import json
import io
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import Mock, patch

SPEC = importlib.util.spec_from_file_location("auto_release", Path(__file__).with_name("auto-release.py"))
release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release)
OLD, NEW = "a" * 40, "b" * 40


def configuration(directory):
    return dict(repo_url=f"https://github.com/{release.REPO}.git", repo_full_name=release.REPO,
                branch=release.BRANCH, workflow_path=release.WORKFLOW, state_dir=str(directory),
                compose_file=str(directory / "compose.yml"), env_file=str(directory / "env"),
                backup_script=str(directory / "backup.sh"), font_file=str(directory / "font.woff2"),
                font_sha256=release.digest(b"licensed-font"), app_url="https://luatvietduc.com",
                initial_sha=OLD, initial_release=OLD[:7], poll_seconds=180,
                policy_hashes={p: "c" * 64 for p in [release.WORKFLOW, "ops/deploy/compose.yml", "ops/deploy/auto-release.py", "ops/deploy/Dockerfile"]})


def workflow(**changes):
    result = dict(id=12, run_number=7, run_attempt=1, repository={"full_name": release.REPO},
                  head_repository={"full_name": release.REPO}, head_sha=NEW, head_branch=release.BRANCH,
                  event="push", path=release.WORKFLOW, status="completed", conclusion="success")
    result.update(changes)
    return result


class Gates(unittest.TestCase):
    def test_short_wait_is_only_for_presentation_ci(self):
        for presentation,seconds in [(True,5),(False,30)]:
            with self.subTest(presentation=presentation),self.assertRaises(release.APIBackoff) as caught:
                release.ci_success(NEW,Mock(return_value=b'{"workflow_runs":[]}'),presentation=presentation)
            self.assertEqual(caught.exception.seconds,seconds)
        self.assertEqual(release.APIBackoff('rate limited',180).seconds,180)
        config=configuration(Path('/isolated'));config['poll_seconds']=1
        self.assertEqual(release.config_checked(config)['poll_seconds'],5)

    def test_polling_timer_and_bootstrap_agree(self):
        root=Path(__file__).parent
        timer=(root/'luatvietduc-release.timer').read_text()
        bootstrap=(root/'install-auto-deploy.sh').read_text()
        self.assertIn('OnUnitInactiveSec=5s',timer)
        self.assertIn(timer,bootstrap)
        self.assertIn('poll_seconds=5',bootstrap)

    def test_ci_exact_identity(self):
        for field, value in [("head_sha", OLD), ("head_branch", "main"), ("event", "pull_request"),
                             ("path", "other.yml"), ("repository", {"full_name": "other/repo"}),
                             ("head_repository", {"full_name": "fork/repo"})]:
            with self.subTest(field=field):
                get = Mock(return_value=json.dumps({"workflow_runs": [workflow(**{field: value})]}).encode())
                with self.assertRaises(release.APIBackoff):
                    release.ci_success(NEW, get)
                self.assertEqual(get.call_count, 1)

    def test_latest_attempt_not_old_success(self):
        for changes, exception in [({"run_attempt": 2, "status": "in_progress"}, release.APIBackoff),
                                   ({"run_attempt": 2, "conclusion": "failure"}, release.ReleaseError),
                                   ({"head_sha": OLD}, release.ReleaseError)]:
            get = Mock(side_effect=[json.dumps({"workflow_runs": [workflow()]}).encode(), json.dumps(workflow(**changes)).encode()])
            with self.subTest(changes=changes), self.assertRaises(exception):
                release.ci_success(NEW, get)

    def test_ci_success_and_malformed_fail_closed(self):
        get = Mock(side_effect=[json.dumps({"workflow_runs": [workflow()]}), json.dumps(workflow(run_attempt=3))])
        self.assertEqual(release.ci_success(NEW, get), (12, 3))
        with self.assertRaises(ValueError):
            release.ci_success(NEW, Mock(return_value=b"not json"))

    def test_tag_and_config_identity(self):
        for value in ["main", "../x", "a;docker", "a" * 41, ""]:
            self.assertFalse(release.valid_tag(value))
        self.assertTrue(release.valid_tag("529be65"))
        self.assertTrue(release.valid_sha(NEW))
        config = configuration(Path("/isolated"))
        config["branch"] = "main"
        with self.assertRaises(release.ReleaseError):
            release.config_checked(config)

    def test_path_classification(self):
        self.assertFalse(release.classify(["docs/README.md", "apps/cms/scripts/test-db.ts", "apps/cms/test/access.test.mjs"]))
        for path in ["assets/photo.webp", "index.html", "apps/cms/public/live.css", "ops/deploy/Dockerfile", ".dockerignore"]:
            self.assertTrue(release.classify([path]))
        for path in ["apps/cms/src/migrations/index.ts", "apps/cms/src/migrations/deleted.ts", "apps/cms/src/payload.config.ts", "apps/cms/src/modules/new/collection.ts"]:
            with self.subTest(path=path), self.assertRaises(release.ReleaseError):
                release.classify([path])

    def test_revision_matches_frontend_algorithm(self):
        engine = release.Engine(configuration(Path("/isolated")))
        fixtures = {name: (name + "\nVIỆT ĐỨC\n").encode() for name in release.REVISION_FILES}
        expected = hashlib.sha256(b"".join(name.encode() + fixtures[name] for name in release.REVISION_FILES)).hexdigest()[:12]
        with patch.object(release.subprocess, "run", side_effect=[subprocess.CompletedProcess([], 0, fixtures[name]) for name in release.REVISION_FILES]):
            self.assertEqual(engine.revision(NEW), expected)

    def test_probe_accepts_legacy_and_per_file_revisions_but_rejects_stale_assets(self):
        origin = 'http://isolated'
        assets = {name: (name + '\nVIỆT ĐỨC\n').encode() * 20 for name in ['editorial-ui.js', 'editorial-ui.css']}
        fingerprints = {name: release.digest(name.encode() + body)[:12] for name, body in assets.items()}
        for mode in ['legacy', 'per-file', 'wrong-query', 'wrong-content', 'wrong-commit', 'not-ready']:
            with self.subTest(mode=mode):
                engine = release.Engine(configuration(Path('/isolated')))
                engine.revision = Mock(side_effect=lambda sha, files: fingerprints[files[0]])
                urls = {name: '/' + name + '?v=' + ('123456789abc' if mode == 'legacy' else '000000000000' if mode == 'wrong-query' else fingerprints[name]) for name in assets}
                responses = {
                    origin + '/health/ready': json.dumps({'status': 'waiting' if mode == 'not-ready' else 'ready'}).encode(),
                    origin + '/release.json': json.dumps({'commit': OLD if mode == 'wrong-commit' else NEW}).encode(),
                    origin + '/': ''.join('<script src="' + url + '"></script>' for url in urls.values()).encode(),
                    origin + '/fonts/Articulat-web.woff2': b'licensed-font',
                    origin + '/tai-khoan': b'account', origin + '/tro-chuyen': b'chat',
                    **{origin + urls[name]: body + (b'stale' if mode == 'wrong-content' else b'') for name, body in assets.items()},
                }
                engine.get = Mock(side_effect=lambda url: responses[url])
                engine.pause = Mock()
                with patch.object(release.time, 'monotonic', side_effect=[0, 0, 121]):
                    if mode in ['legacy', 'per-file']:
                        engine.probe(origin, NEW, '123456789abc')
                        engine.get.assert_any_call(origin + '/tro-chuyen')
                    else:
                        with self.assertRaises(release.ReleaseError):
                            engine.probe(origin, NEW, '123456789abc')



    def test_presentation_scope_rejects_backend_schema_policy_and_mixed_edits(self):
        allowed=['apps/cms/src/presentation/live-css/01-footer.css','apps/cms/public/live.css','apps/cms/src/modules/shared/site-version.json']
        self.assertTrue(release.presentation_only(allowed))
        self.assertTrue(release.presentation_only(['apps/cms/public/content/home.json','apps/cms/public/media/benefits/specialist.webp']))
        self.assertFalse(release.presentation_only(['apps/cms/public/content/unknown.json']))
        for path in ['apps/cms/src/modules/chat/reply.ts','apps/cms/src/payload.config.ts','ops/deploy/auto-release.py','.github/workflows/platform-foundation.yml','apps/cms/public/new-script.js','apps/cms/scripts/prepare-fast-release.mjs']:
            self.assertFalse(release.presentation_only(allowed+[path]))
        self.assertFalse(release.presentation_only(['docs/README.md']))
        self.assertTrue(release.presentation_only(['apps/cms/src/app/(payload)/admin-custom.css','apps/cms/public/admin-theme.css']))
        self.assertFalse(release.presentation_only(['apps/cms/src/modules/admin/presentation.ts']))
        self.assertFalse(release.presentation_only(['apps/cms/src/app/(payload)/layout.tsx']))

    def test_presentation_requires_current_attempt_and_both_short_jobs(self):
        success=[{'name':n,'status':'completed','conclusion':'success'} for n in ['presentation-checks','deploy-tool-checks']]
        for jobs,exception in [(success,None),(success[:1],release.APIBackoff),([dict(success[0],conclusion='failure'),success[1]],release.ReleaseError)]:
            get=Mock(side_effect=[json.dumps({'workflow_runs':[workflow()]}),json.dumps(workflow(status='in_progress',run_attempt=2)),json.dumps({'jobs':jobs})])
            if exception:
                with self.assertRaises(exception):release.ci_success(NEW,get,presentation=True)
            else:
                self.assertEqual(release.ci_success(NEW,get,presentation=True),(12,2))
                self.assertIn('/attempts/2/jobs',get.call_args.args[0])

    def test_full_release_rejects_skipped_backend_checks(self):
        for conclusion in ['skipped','failure',None]:
            get=Mock(side_effect=[json.dumps({'workflow_runs':[workflow()]}),json.dumps(workflow()),json.dumps({'jobs':[{'name':'cms-checks','conclusion':conclusion}]})])
            with self.assertRaises(release.ReleaseError):release.ci_success(NEW,get,require_full=True)


class Deployment(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.config = configuration(self.directory)
        Path(self.config["font_file"]).write_bytes(b"licensed-font")
        self.events = []
        self.engine = release.Engine(self.config, command=self.command, get=Mock(return_value=b'{"status":"ready"}'), pause=Mock())
        self.engine.inspect_web = Mock(side_effect=lambda tag: "old-image" if tag == OLD[:7] else "new-image")
        self.engine.cleanup_candidate = Mock()
        self.engine.probe = Mock()
        self.engine.head = Mock(return_value=NEW)
        self.engine.revision = Mock(return_value="123456789abc")
        self.engine.policies = Mock()
        self.engine.git = Mock(side_effect=self.git)
        self.engine.compose = Mock(side_effect=self.compose)
        self.current = dict(current_sha=OLD, current_release=OLD[:7])
        self.ci = patch.object(release, "ci_success", return_value=(12, 1))
        self.ci.start()
        self.addCleanup(self.ci.stop)

    def command(self, args, **kwargs):
        self.events.append(args)
        if args[:2] == ["docker", "build"]:
            marker = Path(args[-1]) / "apps/cms/public/release.json"
            self.assertEqual(json.loads(marker.read_text())["commit"], NEW)
        return ""

    def git(self, *args):
        if args[0] == "archive":
            output = next(arg.split("=", 1)[1] for arg in args if arg.startswith("--output="))
            with tarfile.open(output, "w") as archive:
                data=b'{"version":"01.15.00"}'
                member=tarfile.TarInfo('apps/cms/src/modules/shared/site-version.json');member.size=len(data)
                archive.addfile(member,io.BytesIO(data))
        return "apps/cms/public/editorial-ui.css" if args[0] == "diff" else ""

    def compose(self, tag, *args):
        self.events.append(["compose", tag, *args])
        if args[0] == "config":
            return json.dumps({"services": {"web": {"command": release.NEXT_START, "image": release.IMAGE + tag}}})
        return ""

    def test_success_state_after_candidate_and_public_health(self):
        self.engine.activate(NEW, self.current)
        state = json.loads(self.engine.state_path.read_text())
        self.assertEqual(state["current_sha"], NEW)
        self.assertEqual(state["previous_sha"], OLD)
        self.assertEqual(self.engine.probe.call_count, 3)
        candidate = next(event for event in self.events if event[:3] == ["compose", NEW, "run"])
        self.assertIn("traefik.enable=false", candidate)
        self.assertIn("127.0.0.1:3050:3000", candidate)
        self.assertEqual(candidate[-len(release.NEXT_START):], release.NEXT_START)
        self.assertFalse(any(event[0] == "bash" for event in self.events), "Releases never start a backup; the daily timer owns backups")

    def test_candidate_failure_does_not_activate(self):
        self.engine.probe.side_effect = release.ReleaseError("candidate failed")
        with self.assertRaises(release.ReleaseError):
            self.engine.activate(NEW, self.current)
        self.assertFalse(any(event[0] == "compose" and "up" in event for event in self.events))
        self.assertFalse(self.engine.state_path.exists())
        self.assertEqual(self.engine.cleanup_candidate.call_count, 2)

    def test_public_failure_rolls_back_only_web_without_advancing_state(self):
        def probe(origin, *args, **kwargs):
            if origin == self.config["app_url"] and args[0] == NEW:
                raise release.ReleaseError("wrong public commit")
        self.engine.probe.side_effect = probe
        with self.assertRaises(release.ReleaseError):
            self.engine.activate(NEW, self.current)
        up = [event for event in self.events if event[0] == "compose" and "up" in event]
        self.assertEqual([event[1] for event in up], [NEW, OLD[:7]])
        for event in up:
            self.assertIn("--no-deps", event)
            self.assertEqual(event[-1], "web")
        self.assertFalse(self.engine.state_path.exists())
        self.assertEqual(self.engine.probe.call_args.kwargs, {"full": False, "require_commit": False})

    def test_release_does_not_invoke_backup_script(self):
        def command(args, **kwargs):
            if args[0] == "bash":
                raise release.ReleaseError("A deployment must not request a backup")
            return self.command(args, **kwargs)
        self.engine.run = command
        self.engine.activate(NEW, self.current)
        self.assertTrue(any(event[0] == "compose" and "up" in event for event in self.events))

    def test_divergent_branch_advance_prevents_activation(self):
        self.engine.head.return_value = "d" * 40
        original=self.engine.git.side_effect
        def git(*args):
            if args[:2]==('merge-base','--is-ancestor'):raise release.ReleaseError('diverged')
            return original(*args)
        self.engine.git.side_effect=git
        with self.assertRaises(release.ReleaseError):
            self.engine.activate(NEW, self.current)
        self.assertFalse(any(event[0] == "compose" and "up" in event for event in self.events))

    def test_descendant_push_does_not_discard_verified_build(self):
        self.engine.head.return_value='d'*40
        self.engine.activate(NEW,self.current)
        self.engine.git.assert_any_call('merge-base','--is-ancestor',NEW,'d'*40)
        self.assertEqual(json.loads(self.engine.state_path.read_text())['current_sha'],NEW)

    def test_pending_backoff_and_quarantine_are_separate_from_success_state(self):
        self.engine.ready_ancestor=Mock(return_value=None)
        release.ci_success.side_effect = release.APIBackoff("pending", 1)
        before = release.time.time()
        self.assertEqual(self.engine.once(), "pending")
        retry = json.loads(self.engine.retry_path.read_text())
        self.assertGreaterEqual(retry["next_poll"], before + 180)
        self.assertFalse(self.engine.state_path.exists())
        self.engine.retry_path.unlink()
        release.ci_success.side_effect = release.ReleaseError("failed CI")
        with self.assertRaises(release.ReleaseError):
            self.engine.once()
        self.assertEqual(json.loads(self.engine.retry_path.read_text())["failed_sha"], NEW)
        with self.assertRaisesRegex(release.ReleaseError, "quarantined"):
            self.engine.once()

    def test_check_has_no_activation_or_state_write(self):
        self.assertIn("approved candidate", self.engine.once(check=True))
        self.assertFalse(self.engine.state_path.exists())
        self.assertFalse(self.engine.retry_path.exists())
        self.assertEqual(self.events, [])

    def test_first_bootstrap_promotes_docs_only_but_later_skips(self):
        self.engine.git.side_effect = lambda *args: "docs/change.md" if args[0] == "diff" else ""
        self.engine.activate = Mock()
        self.engine.once()
        self.engine.activate.assert_called_once()
        release.atomic_json(self.engine.state_path, self.current)
        self.engine.activate.reset_mock()
        self.assertEqual(self.engine.once(), "no application changes")
        self.engine.activate.assert_not_called()



class Queue(unittest.TestCase):
    def test_only_successful_same_branch_descendant_with_exact_checks_is_selected(self):
        with tempfile.TemporaryDirectory() as directory:
            e=release.Engine(configuration(Path(directory)));candidate='c'*40;head='d'*40
            e.git=Mock(return_value='apps/cms/public/content/home.json');e.policies=Mock()
            good=workflow(head_sha=candidate)
            bad=workflow(head_sha='e'*40,run_number=8,conclusion='failure')
            e.get=Mock(return_value=json.dumps({'workflow_runs':[bad,good]}))
            with patch.object(release,'ci_success',return_value=(12,1)) as check:
                self.assertEqual(e.ready_ancestor(head,{'current_sha':OLD,'backend_sha':OLD}),(candidate,True))
                check.assert_called_once_with(candidate,e.get,require_full=False,presentation=True)
            e.git.assert_any_call('merge-base','--is-ancestor',OLD,candidate)
            e.git.assert_any_call('merge-base','--is-ancestor',candidate,head)
            release.atomic_json(e.retry_path,{'failed_sha':candidate})
            with patch.object(release,'ci_success') as check:
                self.assertIsNone(e.ready_ancestor(head,{'current_sha':OLD,'backend_sha':OLD}));check.assert_not_called()

    def test_unrelated_or_policy_drifted_or_schema_candidates_are_not_promoted(self):
        for reason in ['diverged','policy','schema','pending']:
            with self.subTest(reason=reason),tempfile.TemporaryDirectory() as directory:
                e=release.Engine(configuration(Path(directory)));candidate='c'*40
                e.get=Mock(return_value=json.dumps({'workflow_runs':[workflow(head_sha=candidate)]}))
                e.git=Mock(return_value='apps/cms/src/migrations/new.ts' if reason=='schema' else 'apps/cms/public/content/home.json');e.policies=Mock()
                if reason=='diverged':e.git.side_effect=release.ReleaseError('diverged')
                if reason=='policy':e.policies.side_effect=release.ReleaseError('policy')
                with patch.object(release,'ci_success',side_effect=release.APIBackoff('pending') if reason=='pending' else None):
                    self.assertIsNone(e.ready_ancestor('d'*40,{'current_sha':OLD,'backend_sha':OLD}))


class Presentation(unittest.TestCase):
    def test_no_build_or_restart_and_failed_public_probe_rolls_back(self):
        for fail in [False,True]:
            with self.subTest(fail=fail),tempfile.TemporaryDirectory() as directory:
                root=Path(directory);e=release.Engine(configuration(root));events=[]
                e.web_container=Mock(return_value='web');e.head=Mock(return_value=NEW);e.revision=Mock(return_value='123456789abc')
                e.install_presentation=Mock(return_value='base')
                e.git=Mock(side_effect=lambda *args:tarfile.open(next(a.split('=',1)[1] for a in args if a.startswith('--output=')),'w').close())
                def command(args,**kwargs):
                    events.append(args)
                    if args[:2]==['docker','run']:
                        stage=Path(args[args.index('--volume')+1].split(':')[0]);public=stage/'apps/cms/public';public.mkdir(parents=True)
                        shared=stage/'apps/cms/src/modules/shared';shared.mkdir(parents=True);(shared/'site-version.json').write_text('{"version":"01.15.01"}')
                        for name in release.FAST_SOURCE_PUBLIC+['frontend.html']:
                            (public/name).parent.mkdir(parents=True,exist_ok=True)
                            (public/name).write_text('updated')
                    return ''
                e.run=command;e.probe=Mock(side_effect=[None,release.ReleaseError('bad public probe'),None] if fail else None)
                current={'current_sha':OLD,'current_release':OLD,'backend_sha':OLD,'revision':'old'}
                release.atomic_json(e.state_path,current)
                with patch.object(release,'ci_success',return_value=(1,1)):
                    if fail:
                        with self.assertRaises(release.ReleaseError):e.activate_presentation(NEW,current)
                    else:e.activate_presentation(NEW,current)
                self.assertFalse(any(args[:2]==['docker','build'] or 'compose' in args for args in events))
                self.assertEqual(json.loads(e.state_path.read_text())['current_sha'],OLD if fail else NEW)
                self.assertEqual(any('rollback' in args for args in events),fail)

if __name__ == "__main__":
    unittest.main()

"""Focused release safety tests: no Docker daemon, network or live database."""
import hashlib
import importlib.util
import json
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
            with tarfile.open(output, "w"):
                pass
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
        backup = next(i for i, event in enumerate(self.events) if event[0] == "bash")
        self.assertLess(backup, self.events.index(candidate))

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

    def test_backup_failure_prevents_candidate(self):
        def command(args, **kwargs):
            if args[0] == "bash":
                raise release.ReleaseError("backup failed")
            return self.command(args, **kwargs)
        self.engine.run = command
        with self.assertRaises(release.ReleaseError):
            self.engine.activate(NEW, self.current)
        self.assertFalse(any(event[0] == "compose" and "run" in event for event in self.events))

    def test_branch_advance_prevents_activation(self):
        self.engine.head.return_value = "d" * 40
        with self.assertRaises(release.ReleaseError):
            self.engine.activate(NEW, self.current)
        self.assertFalse(any(event[0] == "compose" and "up" in event for event in self.events))

    def test_pending_backoff_and_quarantine_are_separate_from_success_state(self):
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


if __name__ == "__main__":
    unittest.main()

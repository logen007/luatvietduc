#!/usr/bin/env python3
"""Pull one CI-approved application revision. Installed config/compose remain authoritative."""
import argparse
import contextlib
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import tarfile
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

REPO = "logen007/luatvietduc"
BRANCH = "feat/platform-cms-bootstrap"
WORKFLOW = ".github/workflows/platform-foundation.yml"
IMAGE = "luatvietduc-web:"
CANDIDATE = "lvd-auto-check"
NEXT_START = ["npx", "next", "start", "--hostname", "0.0.0.0"]
REVISION_FILES = ["design-system.css", "live.css", "editorial-ui.css", "live-bridge.js", "editorial-ui.js", "legal-runtime.js"]
SCHEMA_FILES = {"apps/cms/src/payload.config.ts", "apps/cms/src/modules/identity/users.ts", "apps/cms/src/modules/content/articles.ts", "apps/cms/src/modules/content/audit.ts", "apps/cms/src/modules/settings/config.ts"}


class ReleaseError(Exception):
    pass


class APIBackoff(ReleaseError):
    def __init__(self, message, seconds=180):
        super().__init__(message)
        self.seconds = max(180, seconds)


def require(condition, message):
    if not condition:
        raise ReleaseError(message)


def valid_sha(value):
    return isinstance(value, str) and re.fullmatch(r"[0-9a-f]{40}", value) is not None


def valid_tag(value):
    return isinstance(value, str) and re.fullmatch(r"[0-9a-f]{7,40}", value) is not None


def digest(data):
    return hashlib.sha256(data).hexdigest()


def config_checked(data):
    require(data.get("repo_full_name") == REPO and data.get("repo_url") == f"https://github.com/{REPO}.git", "Unapproved repository")
    require(data.get("branch") == BRANCH and data.get("workflow_path") == WORKFLOW, "Unapproved branch/workflow")
    require(data.get("app_url") == "https://luatvietduc.com", "Unapproved public origin")
    require(valid_sha(data.get("initial_sha")) and valid_tag(data.get("initial_release")), "Invalid initial revision/tag")
    require(re.fullmatch(r"[0-9a-f]{64}", data.get("font_sha256", "")), "Missing font checksum")
    for key in ["state_dir", "compose_file", "env_file", "backup_script", "font_file"]:
        require(Path(data.get(key, "")).is_absolute(), f"{key} must be absolute")
    policies = data.get("policy_hashes", {})
    require(all(p in policies for p in [WORKFLOW, "ops/deploy/compose.yml", "ops/deploy/auto-release.py", "ops/deploy/Dockerfile"]), "Approved policy hashes required")
    for path, value in policies.items():
        require(not Path(path).is_absolute() and ".." not in Path(path).parts and re.fullmatch(r"[0-9a-f]{64}", value), "Invalid policy hash")
    data["poll_seconds"] = max(180, int(data.get("poll_seconds", 180)))
    return data


def classify(paths):
    if any(p.startswith("apps/cms/src/migrations/") or p in SCHEMA_FILES or p.endswith(("/collection.ts", "/schema.ts")) for p in paths):
        raise ReleaseError("Schema/migration change requires manual release")
    def runtime(path):
        if path.endswith(".md") or path.startswith(("apps/cms/test/", "apps/cms/tests/")) or re.search(r"(?:^|/)(?:test[^/]*\.[cm]?[jt]s|[^/]+\.test\.[cm]?[jt]s)$", path):
            return False
        return path in {"index.html", ".dockerignore", "ops/deploy/Dockerfile"} or path.startswith(("assets/", "apps/cms/"))
    return any(runtime(p) for p in paths)


def run(args, env=None):
    result = subprocess.run(args, env=env, capture_output=True, text=True, timeout=1800)
    require(result.returncode == 0, f"{args[0]} command failed (exit {result.returncode})")
    return result.stdout.strip()


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "luatvietduc-release/1", "Accept": "application/vnd.github+json", "Cache-Control": "no-cache"})
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            body = response.read(8 * 1024 * 1024 + 1)
            require(len(body) <= 8 * 1024 * 1024, "HTTP response too large")
            return body
    except urllib.error.HTTPError as error:
        if error.code in (403, 429):
            delay = max(int(error.headers.get("Retry-After", "180")) if error.headers.get("Retry-After", "180").isdigit() else 180,
                        int(error.headers.get("X-RateLimit-Reset", "0")) - int(time.time()))
            raise APIBackoff(f"GitHub API rate/access response {error.code}", delay) from error
        raise ReleaseError(f"HTTP response {error.code}") from error


def ci_identity(item, sha):
    return (item.get("repository", {}).get("full_name") == REPO and item.get("head_repository", {}).get("full_name") == REPO
            and item.get("head_sha") == sha and item.get("head_branch") == BRANCH and item.get("event") == "push" and item.get("path") == WORKFLOW)


def ci_success(sha, get=fetch):
    base = f"https://api.github.com/repos/{REPO}/actions"
    query = urllib.parse.urlencode({"branch": BRANCH, "event": "push", "head_sha": sha, "per_page": 100})
    listing = json.loads(get(f"{base}/workflows/platform-foundation.yml/runs?{query}"))
    runs = [item for item in listing.get("workflow_runs", []) if ci_identity(item, sha)]
    if not runs:
        raise APIBackoff("Exact push workflow run not available")
    selected = max(runs, key=lambda item: (int(item["run_number"]), int(item["id"])))
    latest = json.loads(get(f"{base}/runs/{int(selected['id'])}"))
    require(ci_identity(latest, sha) and latest.get("id") == selected["id"], "CI run identity mismatch")
    require(int(latest.get("run_attempt", 0)) >= int(selected.get("run_attempt", 1)), "CI attempt moved backwards")
    if latest.get("status") != "completed":
        raise APIBackoff("Latest CI attempt is pending")
    require(latest.get("conclusion") == "success", "Latest CI attempt did not succeed")
    return latest["id"], latest["run_attempt"]


def load_json(path, default=None):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text())
    except (ValueError, OSError) as error:
        raise ReleaseError(f"Cannot read {path.name}") from error


def atomic_json(path, data):
    temporary = path.with_suffix(".tmp")
    with temporary.open("w") as output:
        json.dump(data, output, indent=2)
        output.write("\n")
        output.flush()
        os.fsync(output.fileno())
    temporary.chmod(0o600)
    temporary.replace(path)


def trusted_file(path):
    path = Path(path)
    require(path.is_file() and not path.is_symlink(), f"Missing trusted file: {path}")
    status = path.stat()
    require(status.st_uid == 0 and not status.st_mode & 0o022, f"Unsafe ownership/permissions: {path}")


class Engine:
    def __init__(self, config, command=run, get=fetch, pause=time.sleep):
        self.c, self.run, self.get, self.pause = config, command, get, pause
        self.state_dir = Path(config["state_dir"])
        self.mirror = self.state_dir / "repository.git"
        self.env = dict(os.environ)
        self.env.update({"GIT_TERMINAL_PROMPT": "0", "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null"})
        self.state_path, self.retry_path = self.state_dir / "state.json", self.state_dir / "retry.json"

    def git(self, *args):
        return self.run(["git", "--git-dir", str(self.mirror), *args], env=self.env)

    def head(self):
        if not self.mirror.exists():
            self.run(["git", "clone", "--mirror", self.c["repo_url"], str(self.mirror)], env=self.env)
        require(self.git("remote", "get-url", "origin") == self.c["repo_url"], "Mirror origin changed")
        self.git("fetch", "--prune", "origin", f"+refs/heads/{BRANCH}:refs/heads/{BRANCH}")
        sha = self.git("rev-parse", f"refs/heads/{BRANCH}^{{commit}}")
        require(valid_sha(sha), "Invalid fetched revision")
        return sha

    def compose(self, release, *args):
        require(valid_tag(release), "Invalid release tag")
        env = dict(self.env, RELEASE=release)
        return self.run(["docker", "compose", "--project-name", "luatvietduc", "--env-file", self.c["env_file"], "--file", self.c["compose_file"], *args], env=env)

    def revision(self, sha):
        result = hashlib.sha256()
        for name in REVISION_FILES:
            # git output is UTF-8 source. Preserve trailing newlines for the revision hash.
            content = subprocess.run(["git", "--git-dir", str(self.mirror), "show", f"{sha}:apps/cms/public/{name}"], env=self.env, capture_output=True, check=True).stdout
            result.update(name.encode())
            result.update(content)
        return result.hexdigest()[:12]

    def policies(self, sha):
        for path, expected in self.c["policy_hashes"].items():
            actual = subprocess.run(["git", "--git-dir", str(self.mirror), "show", f"{sha}:{path}"], env=self.env, capture_output=True, check=True).stdout
            require(digest(actual) == expected, f"Policy changed; refresh bootstrap approval: {path}")

    def inspect_web(self, release):
        container = self.compose(release, "ps", "--quiet", "web")
        require(bool(container) and "\n" not in container, "Expected exactly one web container")
        info = json.loads(self.run(["docker", "inspect", container], env=self.env))[0]
        require(info["Config"]["Image"] == IMAGE + release, "Running web differs from last successful release")
        return info["Image"]

    def cleanup_candidate(self):
        # Listing first avoids treating a nonexistent container as a deployment failure.
        found = self.run(["docker", "ps", "--all", "--quiet", "--filter", f"name=^/{CANDIDATE}$"], env=self.env)
        if found:
            info = json.loads(self.run(["docker", "inspect", CANDIDATE], env=self.env))[0]
            require(info["Config"].get("Labels", {}).get("lvd.auto-release") == "true", "Candidate name belongs to another container")
            self.run(["docker", "rm", "--force", CANDIDATE], env=self.env)

    def probe(self, origin, sha, revision, full=True, require_commit=True):
        deadline, last = time.monotonic() + 120, None
        while time.monotonic() < deadline:
            try:
                require(json.loads(self.get(origin + "/health/ready"))["status"] == "ready", "Application not ready")
                if require_commit:
                    require(json.loads(self.get(origin + "/release.json"))["commit"] == sha, "Wrong served commit")
                if full:
                    home = self.get(origin + "/").decode()
                    for asset in ["editorial-ui.js", "editorial-ui.css"]:
                        match = re.search(r'[\"\'](/' + re.escape(asset) + r'\?v=([a-f0-9]{12}))[\"\']', home)
                        require(match is not None and match[2] == revision, "Wrong frontend revision")
                        require(len(self.get(origin + match[1])) > 100, "Missing frontend asset")
                    require(digest(self.get(origin + "/fonts/Articulat-web.woff2")) == self.c["font_sha256"], "Wrong licensed font")
                    self.get(origin + "/tai-khoan")
                    self.get(origin + "/tro-chuyen")
                return
            except Exception as error:
                last = error
                self.pause(3)
        raise ReleaseError(f"Health verification failed at {origin}: {last}")

    def activate(self, sha, current):
        old, old_sha = current["current_release"], current["current_sha"]
        old_image = self.inspect_web(old)
        rendered = json.loads(self.compose(sha, "config", "--format", "json"))
        require(rendered["services"]["web"].get("command") == NEXT_START, "Installed compose must disable migration startup")
        require(rendered["services"]["web"]["image"] == IMAGE + sha, "Installed compose image mismatch")
        require(digest(Path(self.c["font_file"]).read_bytes()) == self.c["font_sha256"], "Licensed font checksum mismatch")
        activated = False
        try:
            self.cleanup_candidate()
            with tempfile.TemporaryDirectory(prefix="build-", dir=self.state_dir) as directory:
                staging = Path(directory)
                archive = staging / "source.tar"
                self.git("archive", "--format=tar", "--output=" + str(archive), sha)
                with tarfile.open(archive) as source:
                    for member in source.getmembers():
                        require(not Path(member.name).is_absolute() and ".." not in Path(member.name).parts and (member.isfile() or member.isdir()), "Unsafe archive member")
                    source.extractall(staging)
                archive.unlink()
                public = staging / "apps/cms/public"
                (public / "fonts").mkdir(parents=True, exist_ok=True)
                shutil.copyfile(self.c["font_file"], public / "fonts/Articulat-web.woff2")
                (public / "release.json").write_text(json.dumps({"commit": sha, "built_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}))
                self.run(["docker", "build", "--file", str(staging / "ops/deploy/Dockerfile"), "--tag", IMAGE + sha, str(staging)], env=self.env)
            self.run(["bash", self.c["backup_script"]], env=dict(self.env, RELEASE=old))
            self.compose(sha, "run", "--detach", "--no-deps", "--pull", "never", "--label", "traefik.enable=false", "--label", "lvd.auto-release=true", "--name", CANDIDATE, "--publish", "127.0.0.1:3050:3000", "web", *NEXT_START)
            revision = self.revision(sha)
            self.probe("http://127.0.0.1:3050", sha, revision)
            require(self.head() == sha, "Branch advanced during candidate verification")
            ci_success(sha, self.get)
            activated = True  # Even a partially failed compose up must restore the previous web.
            self.compose(sha, "up", "--detach", "--no-deps", "--no-build", "--pull", "never", "web")
            self.inspect_web(sha)
            self.probe("http://127.0.0.1:3049", sha, revision)
            self.probe(self.c["app_url"], sha, revision)
            next_state = {"current_sha": sha, "current_release": sha, "previous_sha": old_sha, "previous_release": old, "revision": revision}
        except Exception:
            if activated:
                self.compose(old, "up", "--detach", "--no-deps", "--no-build", "--pull", "never", "web")
                require(self.inspect_web(old) == old_image, "Rollback image changed")
                # Initial manually deployed releases predate release.json.
                for origin in ["http://127.0.0.1:3049", self.c["app_url"]]:
                    self.probe(origin, old_sha, "", full=False, require_commit="revision" in current)
            raise
        finally:
            self.cleanup_candidate()
        atomic_json(self.state_path, next_state)

    def once(self, check=False):
        bootstrap = not self.state_path.exists()
        current = load_json(self.state_path, {"current_sha": self.c["initial_sha"], "current_release": self.c["initial_release"]})
        require(valid_sha(current.get("current_sha")) and valid_tag(current.get("current_release")), "Invalid release state")
        retry = load_json(self.retry_path, {})
        fingerprint = digest(json.dumps(self.c, sort_keys=True).encode())
        if retry.get("config") == fingerprint and time.time() < retry.get("next_poll", 0):
            return "pending/backoff"
        sha = self.head()
        if sha == current["current_sha"]:
            return "unchanged"
        if retry.get("config") == fingerprint and retry.get("failed_sha") == sha:
            raise ReleaseError("This SHA is quarantined; push a fix or refresh bootstrap approval")
        try:
            self.git("merge-base", "--is-ancestor", current["current_sha"], sha)
            self.policies(sha)
            paths = self.git("diff", "--name-only", "--no-renames", current["current_sha"], sha).splitlines()
            if not classify(paths) and not bootstrap:
                return "no application changes"
            ci_success(sha, self.get)
            if check:
                return f"approved candidate {sha}; no Docker/state changes performed"
            self.activate(sha, current)
            atomic_json(self.retry_path, {})
            return f"activated {sha}"
        except APIBackoff as error:
            if not check:
                atomic_json(self.retry_path, {"config": fingerprint, "next_poll": time.time() + max(self.c["poll_seconds"], error.seconds)})
            return str(error)
        except Exception:
            if not check:
                atomic_json(self.retry_path, {"config": fingerprint, "failed_sha": sha})
            raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default="/etc/luatvietduc-deploy/config.json")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--once", action="store_true")
    args = parser.parse_args()
    try:
        trusted_file(args.config)
        config = config_checked(json.loads(Path(args.config).read_text()))
        for key in ["compose_file", "env_file", "backup_script", "font_file"]:
            trusted_file(config[key])
        state = Path(config["state_dir"])
        require(state.is_dir() and state.stat().st_uid == 0 and not state.stat().st_mode & 0o077, "State directory must be root-owned mode0700")
        with (state / "deploy.lock").open("a") as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                print("Another release check is running")
                return 0
            def terminate(_signum, _frame):
                raise ReleaseError("Termination requested")
            signal.signal(signal.SIGTERM, terminate)
            print(Engine(config).once(check=args.check))
        return 0
    except Exception as error:
        print(f"Release stopped: {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

# Verified automatic releases

Operational status: enabled with the owner's explicit approval on2026-11-03. The first automatic release78f8035 succeeded at18:09:33 Vietnam time, and the next timer run completed with no changes. Check the public `/release.json` for the currently deployed commit; later documentation-only commits do not replace the running image.

This is a pull-based release service for the existing isolated Luật Việt Đức application. GitHub receives no VPS credentials. The VPS checks the public repository each minute and deploys only a successful push run for the exact commit, branch and approved workflow. GitHub API polling backs off while CI is pending. CI errors, rate limits or unknown state leave the running application alone.

The production branch remains `feat/platform-cms-bootstrap`. Nothing is merged into `main`. The server-owned engine, Compose file, Dockerfile and CI policy are frozen during the one-time installation; pushing a changed deployment policy does not silently replace them. Routine changes to public UI or application code can use the automatic path. Schema and migration changes require a separate reviewed release because the automatic service never runs migrations.

## One-time preparation

After the new deployment code has been reviewed and its CI has passed, use the existing authorized VPS session once. Fetch the branch and verify the full commit SHA. Execute that exact commit's installer:

```bash
cd /opt/luatvietduc
git fetch origin feat/platform-cms-bootstrap
approved=<reviewed-40-character-commit-sha>
git show "$approved:ops/deploy/install-auto-deploy.sh" > /tmp/lvd-install-reviewed.sh
bash /tmp/lvd-install-reviewed.sh "$approved"
```

The installer preserves the current production image. It creates a root-owned fixed policy under `/etc/luatvietduc-deploy`, copies the licensed font from its existing server location, installs the release engine, validates Compose and prepares a **disabled** systemd timer. It does not add SSH keys, ports, GitHub tokens or users. It does not expose the database or change Traefik.

Review without activating a release:

```bash
python3 /usr/local/lib/luatvietduc-deploy/auto-release.py --check
```

Enabling a persistent repository-to-production release permission requires the owner's explicit confirmation at that point. Once confirmed:

```bash
systemctl enable --now luatvietduc-release.timer
systemctl start luatvietduc-release.service
journalctl -u luatvietduc-release.service -n 100 --no-pager
```

## Routine edits

Edit on the existing branch, run the checks appropriate to the change and push. The existing foundation/CMS workflow now covers all container build inputs plus the deployment tooling. The VPS pins a full commit SHA, verifies the exact successful push run, builds an immutable image and inserts the server's separately licensed font. It creates and validates a database dump, checks a private candidate with migrations disabled and promotes only the web container. It checks both loopback readiness and the public release identity. If promotion fails, it restores the previous image and checks readiness again. A failed commit is held for investigation rather than repeatedly deployed.

The public `/release.json` contains only the deployed commit and build time, so the release can be verified through HTTPS without opening Termius. Production logs and backups remain private. Backups are still on the same VPS; this change does not claim off-VPS recovery.

## Operations

```bash
# Inspect the current state and last outcome.
systemctl status luatvietduc-release.timer --no-pager
journalctl -u luatvietduc-release.service -n 100 --no-pager
cat /var/lib/luatvietduc-deploy/state.json

# Stop future automatic updates; keep the current website running.
systemctl disable --now luatvietduc-release.timer
```

Stopping the timer does not interrupt an in-progress promotion. Let the service finish its checks or rollback before maintenance. The service has its own lock and a deployment timeout. Never use `docker compose down`, database down migrations, `--remove-orphans` or Docker pruning in this release flow. The shared proxy, n8n and other applications are outside its scope.

For a schema change or a change to the approved workflow/Compose/engine policy, disable the timer and review a separate release and policy update. Retain the existing configuration and state for rollback. This service intentionally cannot update its own installed policy from a repository push.

## Presentation lane (01.15)

The same `publish.sh` detects changes automatically. Allowlisted public CSS/JS,
existing social icon assets and site version take the presentation lane. They use
short CI syntax/bundle/deployment jobs without waiting for unrelated full checks, then switch a complete public snapshot
inside the current app container. No Docker build, database migration, application
restart or manual VPS access is needed for these later updates. React components,
admin bundled CSS, navigation config and any mixed backend changes use full CI and
an application build. Unknown/new paths fail closed to the full lane.

Full CI can continue in the background; the server selects the fast path only after checking every changed path against its own allowlist. CI does not query the live site to decide scope.

Both lanes pin the repository, branch, workflow and policy hashes; validate the
exact commit and successful push run; share the deployment lock; probe localhost
and public HTTPS; retain the old snapshot during the switch and restore it on
failure. Full builds additionally require the `cms-checks` job to have succeeded.
The installed full release image remains the backend anchor; `/release.json` and
state record the current presentation commit separately. Files are hard linked
before replacing only the allowlisted paths, avoiding duplicate media storage.
Only the current successful UI package is retained after validation. A later full
release can restore that package if it needs to roll back to the previous image.

`install-presentation-lane.py` is a one-time reviewed bootstrap, validated against
an exact SHA and policy manifest. The previous engine/config are saved privately
for recovery. No new HTTP deployment endpoint, CI credential, schedule or external
service is introduced.

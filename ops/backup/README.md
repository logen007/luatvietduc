# Luật Việt Đức — private Drive recovery copies

This is a separate, app-only worker. It does not change the existing automatic release policy, shared proxy, n8n, or other applications. A prepared UI is not proof of a successful backup: report the runner heartbeat, a completed verified snapshot, and an isolated restore result separately.

## Owner setup

- Native administration: `/admin/settings/backups`; owner role only.
- Google Cloud: enable Drive API, create a separate Web OAuth client with redirect `https://luatvietduc.com/service/backups/google/callback`. Set OAuth audience to Production before granting Drive access. Testing refresh tokens expire after seven days for Drive scopes; see [Google OAuth documentation](https://developers.google.com/identity/protocols/oauth2).
- Generate an age identity **outside the VPS** using the official [age tool](https://github.com/FiloSottile/age). Keep the private identity offline. Put only the `age1…` public recipient in admin. Losing the identity makes the backup unreadable.
- Save the client and public recipient, then connect the selected Google account. OAuth requests only `drive.file`, creates a private app folder, and stores the refresh token in the existing encrypted vault. It does not request access to all existing Drive documents.
- Refresh the page, check the connection, then enable. Saving changed connection settings removes the old app-side token and requires reconnecting. Disconnecting within Google revokes the provider-side authorization.
- Automatic schedule: 03:00 every day in Asia/Ho_Chi_Minh, seven verified daily copies plus one independent monthly copy. Cleanup uses Google Drive Trash. A manual job is available in admin. The daily schedule is independent of the minute queue worker. Deployments and queue polling never enqueue an automatic backup. Missed calendar events do not run at a different time after boot.

## One-time host installation

1. Apply `20261104_010000_backup_admin` through the reviewed release helper, after existing release backup validation and successful CI. Never run down migrations on live data.
2. Install `rclone` and `age` from the OS's official package repositories if missing; retain the existing Docker/Python installation.
3. Inspect the exact reviewed revision of `runner.py` and `install.sh`, verify file checksums, then execute `bash ops/backup/install.sh` from that revision in the existing privileged maintenance session.
4. The worker is installed under `/usr/local/lib/luatvietduc-backup`, uses root-private temporary data under `/var/lib/luatvietduc-backup`, and checks the queue each minute through its own systemd timer.
5. Before Drive authorization the worker only refreshes its heartbeat. Do not claim offsite protection until a completed snapshot and restore drill are observed.

## Capture and trial restore

Capture holds an app media-write lease, waits for active media transactions, dumps the application database, copies the app environment and private R2 bucket when configured, and checks referenced media. A manifest records revision and file checksums. The archive is encrypted locally to the owner's public age recipient, then uploaded and downloaded as a stream for SHA-256 verification. A verified daily copy remains recorded if monthly upload or retention cleanup fails. Old copies are only trashed after a new daily copy passes verification.

For a trial restore the owner selects a recorded snapshot and submits the age identity for **that job only**. It is encrypted with job-specific authenticated data, removed from the queued record when claimed, never written to logs, and deleted from private temporary storage when the job ends. Interrupted jobs expire; the owner submits a new request.

The worker verifies download checksum, decrypts, refuses traversal/absolute paths/links/devices/overwrites, and verifies every manifest file. It restores SQL into a disposable PostgreSQL container with no network, ports or host-mounted data. It never executes restored SQL in the live cluster. Media and environment are verified but not activated. Replacing live data still requires an explicit maintenance action, a successful trial, and a fresh current-state backup; this UI intentionally provides no live overwrite action.

The database includes user accounts and private conversations, so all copies stay encrypted and access stays owner-only. The backup contains the app recovery environment including the encryption secret needed to read the vault after recovery. Private temporary job directories are removed normally and cleaned after a crashed worker restarts under its exclusive lock; cleanup never follows symlinks. Never add keys, temporary bundles, or production metadata to Git.

## Validation and limits

Synthetic archive tests run through the existing CMS test step, and CI database tests cover the one-active-job constraint, vault redaction, authorization invalidation and media write guard. The unchanged pipeline also migrates a new isolated CI database and builds the app. Real Drive, age decryption, R2 transfer and PostgreSQL restore must still be confirmed in a real authorized end-to-end drill.

App publishing during a running backup may interrupt a CLI bridge process; failed jobs expire and the three-minute renewable media lease releases after a worker crash. Whole-host disk loss recovery requires the external age identity and a separately accessible encrypted backup. Docker access makes the host worker privileged, so it accepts no arbitrary commands, paths, remote names or restore destinations from HTTP callers.

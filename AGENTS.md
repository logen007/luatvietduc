# Luật Việt Đức — development rules

## Preserve the current website
- The root `index.html`, `assets/` and existing workflows are the legacy public prototype.
- User authorized a full Papermark-inspired UI redesign on 2026-11-03. Preserve the original prototype sources as reference; apply the new shell, theme and page presentation in apps/cms while keeping content, routes and behavior intact.
- Work on a feature branch. Never push directly to `main`, merge, change DNS, restart shared services or modify production data without explicit approval.
- Owner confirmed domain ownership and Cloudflare routing, authorized direct deployment, and the isolated application was verified serving HTTPS on `luatvietduc.com` on 2026-11-03. Changes to unrelated services still require explicit authorization.

## Product decisions
- No n8n and no Chatwoot. Build the chat product and operator inbox in our codebase.
- Redesign the approved chat UI under the current user instruction while preserving its behavior. Social accounts belong to Luật Việt Đức, not Bizlawyer. Empty social settings render nothing.
- Target architecture: Next.js + TypeScript + Payload CMS + PostgreSQL/pgvector; custom realtime and worker processes. Verify and lock mutually supported package versions before scaffolding the application.
- Treat 303 Vietnamese topic titles as topic-only, not approved legal answers. Never fabricate legal approval, sources, staff availability or message delivery.

## Data and security
- Secrets, VPS identifiers, SSH keys and customer conversations never belong in this public repository.
- Public knowledge and private conversations are separate. Do not send private records to model providers or search indexes by default.
- Authorization is enforced server-side for every HTTP endpoint, socket event, upload and CMS Local API call. Domain helpers do not replace authentication or database authorization.
- Read/write transitions must use database transactions and optimistic concurrency checks. Human handoff invalidates any in-flight AI generation.
- Do not use AI self-reported confidence as the only handoff criterion.
- Production database ports stay private. Never use `docker system prune`, `down -v`, blanket upgrades or a new proxy on existing ports without a reviewed plan.

## Delivery
- Owner fast-edit workflow (2026-11-03): for routine UI/copy changes, locate the responsible module, make the focused edit, stage only intended files, assemble tracked bundles and push once. User checks the interface.
- Do not run local tests/build/preview, open a browser, take screenshots, poll CI/release status, wait for deployment, or request approval for routine authorized edits. Existing GitHub checks and server-owned backup/validation/rollback continue automatically. Do not use Termius/VPS interaction for routine releases.
- Finish after a successful push with one short Vietnamese status: changes sent, automatic update pending. Never call a pushed change live without observing deployment. Report an observed push failure directly.
- Batch related edits into one release. Reuse the module map in apps/cms/src/presentation/README.md; avoid re-researching the project or reference sites for small requested edits. Keep security/data/schema work on its existing reviewed path.
- Do not use Higgsfield; owner explicitly prohibited it on 2026-11-03.
- Small changes, repeatable tests, documented migrations and separate staging/prod secrets.
- Do not claim a test/deployment was performed unless its result was observed.
- Before release, test access isolation, retries/idempotency, reconnects, AI handoff races, knowledge withdrawal and backup restore.

- Footer release version lives in apps/cms/src/modules/shared/site-version.json, exactly xx.xx.xx. Publish through ops/deploy/publish.sh: default patch for small fixes, second argument minor for feature groups or major for a major redesign/platform change. The script bumps and stages the version automatically; do not manually double-bump. Documentation-only commits do not need a version bump.

- Owner requests pre-created social icon slots in the footer even before accounts exist. Unconfigured slots are non-clickable; configured HTTPS links come from existing SiteSettings.socialLinks. Do not fabricate social URLs.

- Runtime connections (01.02.00, deployed 8070aff): owner manages Google/Gemini/R2/Resend at /quan-tri via encrypted SQL vault. Do not put credentials in settings globals or public responses. New configuration is inactive until tested and explicitly enabled. Preserve installed auto-release policy; reviewed migration release is complete, routine code updates remain automatic.

- Owner storage policy (2026-11-04): after a successful deployment keep only the currently running Luật Việt Đức application image. Preserve the previous image temporarily while an update is in progress so the existing automatic rollback still works. Cleanup must take the same deployment lock, verify served commit, preserve every container-referenced image, and target only this app's images/recognizable build cache. Data backup retention remains separate (7 daily + 1 long-term); never use global Docker prune or remove volumes.

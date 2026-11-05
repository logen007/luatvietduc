# Luật Việt Đức — development rules

## Preserve the current website
- The root `index.html`, `assets/` and existing workflows are the legacy public prototype.
- User authorized a full Papermark-inspired UI redesign on 2026-11-03. Preserve the original prototype sources as reference; apply the new shell, theme and page presentation in apps/cms while keeping content, routes and behavior intact.
- Work on a feature branch. Never push directly to `main`, merge, change DNS, restart shared services or modify production data without explicit approval.
- Owner confirmed domain ownership and Cloudflare routing, authorized direct deployment, and the isolated application was verified serving HTTPS on `luatvietduc.com` on 2026-11-03. Changes to unrelated services still require explicit authorization.

## Product decisions
- Owner inbox boundary (2026-11-05): the specialist inbox composer is for customer replies and attachments only; no reply/note tabs. Historical internal notes remain private. Shared reply templates are managed by admin in Cài đặt → Câu trả lời nhanh. Never add knowledge authoring/import controls or automatically turn conversation content into AI knowledge. AI content/rules are authored in Kiến thức AI or opted-in Bài viết. Reply snippets only insert text into the composer.
- Owner UI copy standard (2026-11-05): navigation and actions use one concise label. When the label explains the action, omit its subtitle. Do not repeat the brand, add a back-to-website link beneath the shared header, or add introductory/helper sentences by default. Explanations must help a non-obvious decision, error recovery or configuration. The account page keeps action titles only and uses “Đăng xuất”. Apply this standard to Vietnamese and German copy before publishing.
- No n8n and no Chatwoot. Build the chat product and operator inbox in our codebase.
- Redesign the approved chat UI under the current user instruction while preserving its behavior. Social accounts belong to Luật Việt Đức, not Bizlawyer. Empty social settings render nothing.
- Target architecture: Next.js + TypeScript + Payload CMS + PostgreSQL/pgvector; custom realtime and worker processes. Verify and lock mutually supported package versions before scaffolding the application.
- Treat 303 Vietnamese topic titles as topic-only, not approved legal answers. Never fabricate legal approval, sources, staff availability or message delivery.

## Data and security
- Account foundation (2026-11-05): reuse identity/app-sessions.ts, session-cookies.ts, logout.ts, user-security.ts and permissions.ts. Native CMS and public account lifecycle must share revocation rules; never put password/reset/logout security only in a frontend route. Keep Payload responsible for hashes, JWT/session validity, verification and collection ACL. Test native and public entry points, revocation rollback and logout failures before changing these boundaries.
- Secrets, VPS identifiers, SSH keys and customer conversations never belong in this public repository.
- Public knowledge and private conversations are separate. Do not send private records to model providers or search indexes by default.
- Authorization is enforced server-side for every HTTP endpoint, socket event, upload and CMS Local API call. Domain helpers do not replace authentication or database authorization.
- Read/write transitions must use database transactions and optimistic concurrency checks. Human handoff invalidates any in-flight AI generation.
- Do not use AI self-reported confidence as the only handoff criterion.
- Production database ports stay private. Never use `docker system prune`, `down -v`, blanket upgrades or a new proxy on existing ports without a reviewed plan.

## Delivery
- Parallel review when requested: assign separate owners for public UI, admin/media and chat. Let them work simultaneously in their modules; reserve shared identity/integration files and the test database for one owner. Peer-review before one integrated release; no independent agent pushes.
- Owner correction (2026-11-05): a specific small fix takes priority over an ongoing broad review. Freeze its scope, edit only the responsible component, publish it independently, and stop. Do not bundle unrelated chat, admin or architecture work into it.
- For a routine small fix, do not add testing infrastructure, refactor adjacent code, research alternative designs or create new release tooling. Use the existing source map and delivery path. Aim to edit and submit within about one minute; this is not a guarantee that an application build or GitHub queue finishes in one minute.
- Choose the existing presentation lane for changes that CSS/assets can correctly express. React/TypeScript behavior still uses the application lane. Never reclassify code to bypass required checks. If a release fails, diagnose its exact failing step and verify the complete affected interaction before another push; do not publish successive guessed fixes.
- Keep one small request to one patch/version/push. If push fails after the commit succeeds, retry only the push, not publish.sh. Resume broad review only after the requested correction has been sent; put its independent fixes in a later release.
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

- Runtime connections (01.02.00, deployed 8070aff): owner manages Google/Gemini/R2/Resend at /admin/settings/connections via encrypted SQL vault. Do not put credentials in settings globals or public responses. New configuration is inactive until tested and explicitly enabled. Preserve installed auto-release policy; reviewed migration release is complete, routine code updates remain automatic.

- Owner storage policy (2026-11-04): after a successful deployment keep only the currently running Luật Việt Đức application image. Preserve the previous image temporarily while an update is in progress so the existing automatic rollback still works. Cleanup must take the same deployment lock, verify served commit, preserve every container-referenced image, and target only this app's images/recognizable build cache. Data backup retention remains separate (7 daily + 1 long-term); never use global Docker prune or remove volumes.

## Current ownership map
- Read docs/07-current-structure.md before cross-module work. Public identity/navigation/copyright use modules/shared/public-shell.mjs in both renderers; preserve that contract.
- Admin text belongs in modules/admin/presentation.ts, i18n.ts and pages.ts. Keep field storage, hooks and access in feature modules. CSS-only admin edits use the same reviewed public snapshot lane; do not bundle them back into the application.
- Edit CSS source from presentation/modules.json. Customer chat, specialist inbox and admin styles are separate public bundles; do not put them back in common live.css.
- Message persistence and answer job creation share one transaction. Preserve job leases, idempotency and latest-question/human-handoff checks; do not move provider work back into the customer's send request.

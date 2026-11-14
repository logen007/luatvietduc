# Modules and fast editing

The public UI keeps the existing React/Next.js/Payload foundation. Separate content and presentation from executable application behavior; never ship replacement React code or permissions through a public JSON file.

## Edit map

| Area | Editable module | Delivery |
| --- | --- | --- |
| Shared public labels and standard chat handoff/register/optional-phone copy | `apps/cms/public/content/common.json` | Public snapshot |
| Homepage hero, service tabs and benefits | `apps/cms/public/content/home.json` | Public snapshot |
| Library controls and labels | `apps/cms/public/content/library.json` | Public snapshot |
| News controls and labels | `apps/cms/public/content/news.json` | Public snapshot |
| Public account labels | `apps/cms/public/content/account.json` | Public snapshot |
| About, help and policy UI labels | `apps/cms/public/content/information.json` | Public snapshot |
| Contact UI labels | `apps/cms/public/content/contact.json` | Public snapshot |
| Three homepage benefit photos | Existing files under `apps/cms/public/media/benefits/` | Public snapshot |
| Public header, hero, cards, footer and responsive CSS | Small sources under `apps/cms/src/presentation/editorial-ui-css/` | Public snapshot |
| Shared public shell CSS | `apps/cms/src/presentation/live-css/00`–`05`, `09` | Public snapshot |
| Customer chat presentation | `apps/cms/src/presentation/live-css/06-chat.css`, `07-assistant-chat.css` | Public snapshot |
| Specialist inbox presentation | `apps/cms/src/presentation/live-css/08-specialist-inbox.css` | Public snapshot |
| Admin presentation | Existing admin CSS sources in `presentation/modules.json` | Public snapshot |
| Articles, categories, tags, private AI knowledge, rules and settings | Existing `/admin` modules and database | Save immediately; no code build |
| Chat transport and persistence | `modules/chat/`, shared API clients | Application build |
| Answer intake, retrieval and evidence | `modules/assistant/` | Application build |
| Account sessions, login, roles, profile | `modules/identity/`, `access/` | Application build |
| Upload, resize, compression, storage lifecycle | `modules/media/`, storage integration | Application build |
| Email, AI, Drive connections | `modules/integrations/`, backup worker | Application build |
| Database schema and deployment policy | Existing migration/reviewed install route | Reviewed release |

## Bilingual copy contract

Each content module is `{ "version": 1, "text": { "stable source key": { "vi": "...", "de": "..." } } }`.

Keep the source key unchanged; edit only `vi` and `de`. Both languages may intentionally be an empty string. Values are rendered as plain React text. They do not accept HTML, scripts, permissions, credentials, links or legal knowledge. Reuse the existing copy standard: concise labels without redundant introductions. CMS articles and legal knowledge remain authoritative in the database.

The server reads the current atomic snapshot before the first render and passes the same catalog to hydration. There is no post-load DOM text replacement or extra client fetch. A failed/invalid module falls back to the bundled copy; release validation rejects malformed catalogs before activation. Open tabs keep their current content until a navigation/refresh reads a new layout; no forced reload discards an in-progress chat or draft.

## Queue and deployment contract

Owner-approved change on 2026-11-08: browser UI simulations are explicit audits, not an automatic `npm run build` postbuild gate. `npm run test:browser` remains available against the isolated localhost `lvd_test` database; the optional CI helper can provision/reuse Chrome when explicitly invoked with `CI=true node scripts/check-browser-ci.mjs`. The required foundation workflow still runs type checks, unit/domain tests, migrations, database/system authorization tests and the real Next build. The release engine's signed policy, exact-commit checks, candidate health checks and rollback are unchanged. This removes browser audit time and presentation assertion failures from routine activation; it does not remove compilation or the separate production image build.

Lightweight scope/presentation/deployment checks run independently of an existing application build. Only the heavy CMS job uses a non-cancelling queue; its pending slot coalesces intermediate builds. The live revision request identifies itself consistently so Cloudflare does not unnecessarily send a CSS-only edit to full CI. The release engine can promote the latest successful ancestor while a newer head remains pending, but rechecks the exact commit, repository, branch, ancestry, policy hashes and required jobs. A divergent/force-pushed candidate, quarantined revision, schema change or failed check remains blocked.

A completed immutable build is not discarded merely because a descendant was pushed. Both full and snapshot releases retain the deployment lock, candidate/public probes and rollback. Full builds still validate all changed runtime code. Do not classify React/TypeScript, authentication or database changes as presentation.

Publish through `ops/deploy/publish.sh` once. Copy/CSS/the three supported photo paths then use the short snapshot path without rebuilding or restarting the app. New routes, components and interactions still require a build. The 03:00 Vietnam backup schedule remains separate.

## Reusable compiler cache

The application image uses one BuildKit cache mount (`luatvietduc-next-v1`) for `.next/cache`. Source changes still run the real Next build; they reuse compiler work instead of losing it with the old source layer. `trim-build-cache.mjs` caps that cache at 768 MiB and 50,000 entries at build boundaries, clearing only compiler-cache children and never following symlinks. A cold or cleared cache still produces a complete build. GitHub applies the same budget before/after its build.

App retention keeps one running image as before. Its project-scoped layer cleanup excludes compiler cache mounts; this cache is bounded by its own build step. No runtime upload, database, backup or other application's cache enters this budget.

Full CI and production still build separately. Moving prebuilt CI artifacts into production would need a separate verified artifact/compatibility design; this change does not claim to remove that second build. Record real timings rather than promising instant activation.

### Measured delivery probes

On 2026-11-07, separate unchanged-UI probes covered bilingual copy, CSS tokens and a photo with an ignored RIFF chunk (decoded pixels verified identical; chunk removed after the probe). Before shorter polling: copy activation was confirmed 48.7 seconds after push start, CSS appeared publicly in 37.4 seconds, and the photo release metadata appeared in 51.2 seconds. The original unversioned CDN photo URL still returned older bytes, which prompted the content-version fix below. These are observed end-to-end samples, not guarantees. The app backend stayed at the same commit for all three. The subsequent policy reduces idle/presentation retry intervals from 15 to 5 seconds; measure follow-up pushes after installation before claiming an improvement.

The first copy-only follow-up after five-second polling appeared publicly in 34.2 seconds (01.38.06). Runner startup and verification time still vary.

### Photo freshness

Homepage benefit photo URLs use the SHA-256 of each photo (12 hexadecimal characters), calculated from one resolved public snapshot during server rendering. The same URLs hydrate on the client. Replacing a supported photo changes only that photo URL, avoiding stale CDN/browser responses without clearing the cache for unchanged photos. Photo-only updates continue through the snapshot lane after this application support is installed. No post-load DOM rewrite or blanket cache invalidation is required.

After installation, the combined CSS/photo probe (01.38.09) appeared publicly in 29.5 seconds with the backend still at 01.38.08. Fetching all three rendered photo URLs verified that each response SHA-256 matched its URL; only the modified photo URL changed. The temporary nonvisual test chunk is removed in the following cleanup release.

A local isolated benchmark also completed 50 snapshot switches and rejected 10 incomplete packages without changing the active pointer. Median switch plus checks: 12.19 ms, p95: 13.64 ms; these local filesystem timings exclude GitHub, network and production health checks and are not deployment latency claims.

## Runtime homepage banner

Admin → Cài đặt → Website & giao diện → Banner trang chủ owns `heroVideo`, optional `heroMobileVideo` and `heroPoster`. Use public MP4/WebM from the existing media library/R2 (up to 50 MiB); other uploads retain 10 MiB. With no selected main video, the bundled v10 stays visible. With a main video but no mobile override, mobile uses the main video. Clearing a selection restores that fallback.

`settings/hero-banner.ts` projects only public, correctly typed media and versions URLs by the media revision. `public-site/HeroVideo.tsx` renders the same server-selected poster on first paint, lazily starts the selected source, respects reduced motion/save-data and swaps sources on viewport changes. Settings use the existing no-store endpoint, refresh on homepage entry and window focus, and retain the last good value if a request fails. An already open background tab receives the saved selection when revisited; no application build, repository push, deployment backup or process restart is involved. Selecting a private file or wrong media type is rejected server-side. The owner-only settings ACL stays in force.

The initial additive migration requires the reviewed exact-commit helper `release-reviewed-hero-banner.py`; it leaves older application rollback compatible. Subsequent media/configuration edits use the native CMS save path.


### Public snapshot reads — 2026-11-08

`readPublicCopy` reuses one validated immutable plain-object catalog while its
resolved snapshot path and file metadata match. Failed/missing catalogs do not
reuse stale text. `homeBenefitPhotos` similarly reuses image hashes until file
metadata or snapshot changes; unchanged bytes retain the same URL. These caches
contain only packaged public UI content, never CMS articles, credentials or chat.
Catalog/photo replacements still use the existing snapshot lane without a build.
The 01.39.19 full CI sample took 182 seconds overall, including a 35-second build;
see the performance/SEO audit for the exact run and limits of that measurement.

### Independent presentation URLs — 2026-11-08

Native public/admin renderers call `getPresentationVersion(publicDirectory,
[asset])` for each known CSS/JS resource. Editorial CSS and JS carry separate
revisions; homepage chat intent preloads use the customer-chat CSS revision.
The default multi-bundle digest remains compatible with the legacy renderer.
Each scope follows local edits and atomic snapshots, fails on missing files,
and retains no previous-root cache. Unchanged bytes retain the same URL across
releases, so unrelated admin edits no longer invalidate public presentation
resources. The four-hour production asset cache policy is unchanged.

This support change uses the full build lane once; supported future CSS/copy
updates still use snapshots. It does not bypass required runtime checks or
promise an instant full-code deployment. Evidence is in
`verification/2026-11-08-asset-cache.md`.

### Public view code boundaries — 2026-11-08

`public-site/views.tsx` holds client-side dynamic boundaries around the existing
Home, Library, News, Information and Contact exports. `Page.tsx` retains server
route/data selection; views retain SSR and share the existing shell. Edit each
feature in its original file. Do not add an `ssr: false` option or move CMS/API
reads into the wrapper. This reduces unrelated client code on public routes;
it does not turn runtime source edits into a snapshot-only release. The explicit
SEO audit also checks content with JavaScript disabled. Measurements and limits:
`verification/2026-11-08-route-code.md`.

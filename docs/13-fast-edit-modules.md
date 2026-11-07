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

Lightweight scope/presentation/deployment checks run independently of an existing application build. Only the heavy CMS job uses a non-cancelling queue; its pending slot coalesces intermediate builds. The live revision request identifies itself consistently so Cloudflare does not unnecessarily send a CSS-only edit to full CI. The release engine can promote the latest successful ancestor while a newer head remains pending, but rechecks the exact commit, repository, branch, ancestry, policy hashes and required jobs. A divergent/force-pushed candidate, quarantined revision, schema change or failed check remains blocked.

A completed immutable build is not discarded merely because a descendant was pushed. Both full and snapshot releases retain the deployment lock, candidate/public probes and rollback. Full builds still validate all changed runtime code. Do not classify React/TypeScript, authentication or database changes as presentation.

Publish through `ops/deploy/publish.sh` once. Copy/CSS/the three supported photo paths then use the short snapshot path without rebuilding or restarting the app. New routes, components and interactions still require a build. The 03:00 Vietnam backup schedule remains separate.

## Reusable compiler cache

The application image uses one BuildKit cache mount (`luatvietduc-next-v1`) for `.next/cache`. Source changes still run the real Next build; they reuse compiler work instead of losing it with the old source layer. `trim-build-cache.mjs` caps that cache at 768 MiB and 50,000 entries at build boundaries, clearing only compiler-cache children and never following symlinks. A cold or cleared cache still produces a complete build. GitHub applies the same budget before/after its build.

App retention keeps one running image as before. Its project-scoped layer cleanup excludes compiler cache mounts; this cache is bounded by its own build step. No runtime upload, database, backup or other application's cache enters this budget.

Full CI and production still build separately. Moving prebuilt CI artifacts into production would need a separate verified artifact/compatibility design; this change does not claim to remove that second build. Record real timings rather than promising instant activation.

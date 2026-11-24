# Independent presentation asset versions — 2026-11-08

## Finding and change

Production 01.39.20 served public presentation files with a four-hour browser
cache, but their URLs shared one digest of nine bundles. Changing inbox styles
therefore changed the public CSS URLs too, although their bytes were unchanged.

The public and Payload layouts now fingerprint each referenced asset separately.
Editorial CSS and JavaScript also have separate revisions. The homepage's chat
CSS intent preload uses exactly the same fingerprint as `/hoi-dap`.

`getPresentationVersion` keeps the original ordered default digest for legacy
consumers. Scoped calls accept only known presentation paths. Metadata changes,
missing files and atomic snapshot changes invalidate the appropriate entry; the
cache retains at most 32 selections for one resolved snapshot. Unchanged bytes
keep their URLs after a snapshot switch. No HTML, account, conversation, CMS
content, authorization decision or secret enters this cache.

The five unchanged public assets (font CSS, design-system CSS, live CSS,
editorial CSS and editorial JavaScript) total 143,118 raw bytes, 29,248 gzip
bytes. Independent versioning avoids invalidating these resources for an
unrelated inbox edit. This is a resource-size comparison, not a measured LCP
improvement or a guarantee about transfer size on every browser.

## Verification

- TypeScript and a production Next build passed.
- 590 unit/domain checks passed, including scoped invalidation, unchanged asset
  reuse, snapshot switches, missing files and rejection of unknown paths.
- An isolated PostgreSQL test database and Chrome exercised 72 page cases at
  390px and 1280px, covering public pages, account flows and admin destinations.
  No JavaScript error or horizontal overflow was found by these checks.
- A fresh browser loaded the homepage, focused its question field and navigated
  to news: zero repeat requests for the shared font/design/live/editorial CSS.
  The chat CSS preload URL matched the stylesheet loaded by `/hoi-dap`.
- Native AVIF selection and WebP fallback each used one image request. Article
  and private knowledge editors both saved and reloaded correctly.
- The existing SEO suite passed 12 real route types, real second-page metadata,
  canonical aliases, JSON-LD, bilingual content, robots directives, draft
  exclusion and immediate withdrawal. No public-indexing access was added.

Logs: `/private/tmp/lvd-scoped-assets-unit.log`,
`/private/tmp/lvd-scoped-assets-types.log`,
`/private/tmp/lvd-assets-final-build.log`,
`/private/tmp/lvd-scoped-assets-audit.log` (local, temporary evidence).

## Delivery and limits

This runtime change requires one application build. Later supported copy/CSS
snapshot updates retain their existing short delivery lane, while unchanged
assets keep their browser URLs. No deployment gate, backup schedule, cache TTL,
session behavior or rollback policy changed. The audit is explicitly invoked;
it is not added to routine builds or deployment activation.

Browser results use localhost synthetic fixtures, not production user metrics.
The earlier 109-URL live crawl is recorded in
`2026-11-08-performance-seo-aio.md`; this batch preserves that SEO/AIO behavior.
There is no claim of improved search ranking, AI citations or post-release
production timing before deployment is observed.

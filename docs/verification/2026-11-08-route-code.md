# Route-specific client code — 2026-11-08

## Finding

The public route renderer imported all client views directly. The built client
reference manifest assigned Home, Contact, Information, Library and News to the
same chunk set. Fresh Chrome visits confirmed that news and library downloaded
the contact form implementation as well as homepage interactions.

`public-site/views.tsx` now supplies lazy client boundaries for these existing
views. `Page.tsx` still owns route selection and server-side data reads. Each
view retains server rendering; no client-only option, placeholder page, extra
API, session cache or new authorization path is introduced. The existing shared
shell, animations, navigation, copy and component implementations are reused.

This boundary is in a client module because the installed Next 16.4.5 guide
explicitly says that dynamically importing a client component directly from a
server component does not currently provide automatic code splitting.

## Measured JavaScript

Fresh isolated Chrome contexts, 390×844, same built application and synthetic
fixtures. Capture includes requests through load plus 350ms, including normal
prefetch. Values are sums of requested JavaScript files read from the build,
not total page weight or production compressed network transfer.

| Route | Before, raw bytes | After, raw bytes | Saved | Gzip estimate saved |
| --- | ---: | ---: | ---: | ---: |
| `/` | 639,345 | 623,302 | 16,043 | 4,249 |
| `/tin-tuc` | 581,989 | 557,464 | 24,525 | 7,453 |
| `/phap-luat/viet-nam` | 581,989 | 558,117 | 23,872 | 7,278 |
| `/gioi-thieu` | 639,345 | 612,176 | 27,169 | 8,331 |
| `/lien-he` | 581,989 | 554,412 | 27,577 | 8,650 |
| `/quyen-rieng-tu` | 581,989 | 554,820 | 27,169 | 8,331 |
| `/tro-giup` | 639,345 | 612,176 | 27,169 | 8,331 |
| `/hoi-dap` | 639,345 | 607,397 | 31,948 | 10,532 |

Afterward, the homepage interaction implementation is requested on Home only;
the contact form implementation is requested on Contact only. The shared scroll
reveal selector mentions service class names on other pages; a class-name match
alone is not proof that the implementation was loaded. The follow-up probe
checks the actual tab-panel implementation instead.

The admin baseline is effectively unchanged: 2,221,502 → 2,221,619 raw bytes
(117 bytes of build/runtime mapping overhead). This batch makes no claim of an
admin bundle reduction. More route chunks can mean one additional small request;
the comparison measures their combined bytes rather than request count alone.

## SEO and AI-search readability

The public SEO script now also opens its 12 route types with JavaScript disabled
and requires visible server-rendered H1, matching canonical and valid JSON-LD.
Normal-browser checks retain pagination titles, translated article alternates,
private/search noindex, indexing switch, draft exclusion and immediate withdrawal.

A fresh production sitemap crawl found 109 public URLs: all HTTP 200, with
title, description, one H1, canonical and parseable JSON-LD, with no noindex URL
in the sitemap. Median response-header time was 199ms in that sample, not a
before/after performance comparison. Browser rendering is checked separately;
the HTML crawl is not used to assert absence of client-injected markup.

Google's current [AI features guidance](https://developers.google.com/search/docs/appearance/ai-features)
requires the same sound indexability and useful content foundations as Search;
this batch preserves readable server HTML rather than generating AI-only pages.
No claim of indexing, search rank or AI citations is made. No Search Console
submission or customer/legal-content change was performed.

## Verification and delivery

- TypeScript, 590 unit/domain checks and production build passed.
- The expanded 12-route SEO test passed with and without JavaScript.
- Explicit mobile/desktop browser audit covers 72 page cases, shared-resource
  reuse, chat preload matching, native AVIF/WebP selection and save/reload of
  article/private knowledge editors.
- A sequential interaction test passed: News → Home → About → Contact, homepage
  tabs, VI/DE switching, scroll reveals for below-viewport cards, navigation from
  a footer link returning to the target heading, and a mocked contact 503 retry
  followed by success. Retry retained both the draft and idempotency key; success
  reset the form. No real email/provider request was sent and no browser error
  occurred. Cards already inside the viewport deliberately remain visible
  without a pending reveal marker.
- The browser audit remains explicitly invoked, outside routine build activation.
- This code change needs one full application build. Subsequent supported CSS,
  copy, photo and admin video changes retain their existing fast paths. Route
  separation does not bypass compilation, health checks or rollback and does not
  promise instant deployment.

Temporary local evidence: `/private/tmp/lvd-route-code-before.json`,
`/private/tmp/lvd-route-code-after.json`,
`/private/tmp/lvd-route-split-{types,build,unit,audit}.log`, and
`/private/tmp/lvd-route-split-crawl.jsonl`,
`/private/tmp/lvd-route-code-interactions.log`.

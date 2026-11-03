# Presentation system — November 2026

The owner authorizes a full public and application redesign that closely follows Papermark's measured typography, neutral colors, spacing and component hierarchy. Luật Việt Đức retains its own identity, existing photos, illustrations, legal content and partner data. Public presentation copy is revised in Vietnamese and German to describe the features that are actually available.

## Reference and font assets

The research inventoried 2,738 sitemap URLs and inspected the source of 37 representative pages across 16 template families, with browser checks of representative pages. This is a sampled design study, not a claim that every indexed page was visually inspected. The final correction uses the served [homepage](https://www.papermark.com/), [font CSS](https://www.papermark.com/_next/static/css/9bc31d1a4c88a0ce.css), [shared CSS](https://www.papermark.com/_next/static/css/0f56b6bc52522163.css) and [footer runtime](https://www.papermark.com/_next/static/chunks/7980-134510665050aeae.js) observed on 3 November 2026.

The owner confirmed an Articulat Web license. The licensed binary is installed privately as `apps/cms/public/fonts/Articulat-web.woff2`, declared as normal weight 500 and used for display headings. `apps/cms/.gitignore` excludes `public/fonts/Articulat*.woff2`; the owner's licensed font is not distributed in the repository. A fresh checkout or deployment must receive that asset through the private release process before building. Retain the owner's license record separately and follow the [vendor's licensing terms](https://connary.com/licensing/).

Body, navigation and interface text use self-hosted Inter. `public/fonts/inter.css` preserves the reference's exact normal-style, variable weight 100–900 declarations and Unicode ranges, with the generated family name renamed to `Inter`. Its seven unchanged WOFF2 subsets are `Inter-cyrillic-ext.woff2`, `Inter-cyrillic.woff2`, `Inter-greek-ext.woff2`, `Inter-greek.woff2`, `Inter-vietnamese.woff2`, `Inter-latin-ext.woff2` and `Inter-latin.woff2`. `OFL.txt` contains the SIL Open Font License; `sources.json` records upstream URLs, hashes, sizes and verification. Vietnamese tone letters and German umlauts/Eszett were checked. The earlier `Inter-variable.woff2` remains as a legacy asset and is not the active face. Preload Articulat, Latin and Vietnamese subsets; do not add the legacy all-Unicode face back into the cascade.

## Measured visual system

| Element | Source value and implementation rule |
| --- | --- |
| Hero title | Articulat 500, `clamp(48px, 6.4vw, 92px)`, line-height 1.05, tracking −0.02em, maximum 14ch; 92px at a 1440px viewport and 48px on narrow mobile. Do not shrink it to the earlier 37–40px mobile treatment. |
| Hero description | Inter 400, 17px/1.55, maximum 38ch, white at 88% opacity. |
| General headings and text | Articulat 500 for display headings; Inter 400 at 16px/1.5 for body text. Source heading tracking is −0.01em, with line-height 1.05 for h1 and 1.15 for h2 unless a component defines its own value. |
| Header and content frame | Header 80px high; maximum content width 1600px; desktop horizontal padding 80px. Hero padding is 240px 80px 32px, changing to 160px 24px 24px below 980px. Header/footer use 16px horizontal padding on narrow mobile; homepage content retains 24px. |
| Buttons | Inter 500 at 14px, 14px × 22px padding, 4px radius, 10px icon gap, 16px icons. Primary neutral black, white text; hover `#1a1a1a`. |
| Neutral palette | Ink `#0b0b0b` / `#141414`; white `#ffffff`; warm paper `#fafaf9`; cream `#f5f3ee`; quote gray `#ececea`. Dark sections use `#000000`, `#0a0a0a` or `#0b0b0b`. Orange `#fb7a00` is a limited accent, not a dominant background. The earlier olive/green palette is superseded. |
| Hero image treatment | Existing Luật Việt Đức Berlin photo with neutral black gradient overlays; no colored olive tint. Papermark's video and brand imagery are not used. |
| Footer | Black `#000000`, white titles, links/muted text at 65% white, separators at 12% white; six desktop columns, collapsing responsively. Source wordmark is Articulat 500 at 36px/1; navigation headings 14px/500 and links 13px/24px. |

Papermark's server-rendered footer initially says `data-footer-theme="light"`, but its client code derives the theme from the preceding section. The black final CTA makes the live homepage footer dark. The Luật Việt Đức footer deliberately uses this observed black appearance; do not infer a light footer from the initial HTML alone. Shared tokens are in `design-system.css`; public component details are in the final source-matched section of `editorial-ui.css`.

## Editing points

| Layer in apps/cms | Responsibility |
| --- | --- |
| public/design-system.css | Shared font, color, width, spacing, focus and reduced-motion tokens |
| public/fonts/inter.css, OFL.txt and sources.json | Active seven-subset Inter declarations, license and provenance; licensed Articulat binary is supplied separately |
| scripts/frontend-shell.mjs | One public shell transform shared by local and container preparation |
| public/editorial-ui.js | Public homepage presentation and bilingual shell markers |
| public/editorial-ui.css | Public shell, homepage and retained catalog/news/about/contact/policy page families |
| public/legal-runtime.js | Correct operational descriptions for live chat and replace the unavailable contact form with live chat entry |
| public/live-bridge.js | Public settings, published CMS articles, legacy redirects and question transfer |
| public/live.css | Scoped live application layout: account, chat, inbox, connections, knowledge and articles |
| src/modules/shared/Header.tsx | Shared live application header, mobile navigation and footer |
| src/modules/chat/Workspace.tsx | Chat/inbox rendering and existing API interaction |
| src/app/(payload)/admin-custom.css | Scoped Payload admin typography, cards and dashboard |
| src/modules/settings/AdminWelcome.tsx | Role-specific admin shortcuts and actual configured connection states |

Custom public CSS/JS URLs carry a content revision computed by `src/modules/shared/presentation-version.mjs`, shared by the public shell and live application layout. The revision hashes `design-system.css`, `live.css`, `editorial-ui.css`, `live-bridge.js`, `editorial-ui.js` and `legal-runtime.js`; editing those files changes the URL automatically on the next build/process start so the CDN and returning browsers receive the new release. The font URLs remain stable and are not part of that hash; a later font replacement needs an explicit new asset URL or cache refresh.

Do not edit generated public/frontend.html or public/assets. Run npm run dev/build or node scripts/prepare-frontend.mjs to regenerate them. Container builds call prepare-container.mjs and the same transform. The root prototype is retained as reference; superseded theme-only stylesheets are omitted from generated output, while structural catalog, newsroom, feature and information-page styles remain.

Editorial homepage override must execute after steel-ui.js and before app.js, because app.js renders synchronously. legal-runtime.js must execute after legal-pages.js/legal-de.js and before app.js. Preserve route identifiers, form names, language markers and dialog IDs when editing presentation.

## User-facing behavior

Public legacy pages retain Vietnamese/German switching. The live application remains Vietnamese. Mobile navigation includes account access. The chat composer stays within the visible viewport and its transcript scrolls independently; short viewports compact secondary content. A homepage question opens a new intake even for returning guests with saved conversations, and is never submitted automatically. Empty/new intake opens at the top; actual messages scroll to the newest entry. Phone intake compacts decoration and uses two fields side by side at390px, reverting to one column below360px. Existing consent and server authorization still apply.

The homepage reuses the existing `LVD_FEATURES.partnerSlider()` and all 13 partner entries (three from the G2G Career source and ten from Bizlawyer). The redesign changes their presentation and scrolling, not the data or order. Keep the original logos and their source records; do not replace the row with invented partner names or endorsement claims.

Revised copy distinguishes the 303-topic Vietnamese catalog from published, reviewed answers; the German catalog states that content is being edited. Homepage, FAQ, contact and footer text direct questions into the existing specialist queue and same conversation. They do not promise fixed response times, an available Google sign-in, or customer-facing AI. The new hero and section copy are bilingual; retained legal/catalog/news content stays in its existing content modules.

Admin settings continue to own site name, logo, extra navigation, social links, public notices and operating settings. Structural design changes use the shared tokens and modules above. Light/dark admin themes use Payload's own account preference.

Google, R2, email and internal AI show their actual configured state. Customer AI remains disabled. This release does not enable any deferred external connection or change schema, role permissions, data retention enforcement or legal review status.

## Verification observed

- TypeScript check and optimized production build passed.
- 31 CMS access/review tests and 50 foundation policy/concurrency tests passed.
- Local HTTP suite passed guest persistence, cross-session denial, CSRF rejection, redacted queue, claim/reply, AI authorization and public/admin routes.
- Browser checks covered desktop1440, mobile390/320, a short600px chat viewport, language switching, search/topic pages, news/detail, about/team, contact/privacy, account, knowledge, connections, staff claim and admin light/dark views.
- Browser confirmed homepage questions are prefilled in chat without automatic sending, sent messages persist, and anonymous staff access shows the access screen.
- Font verification confirms all seven active Inter subsets match their recorded source bytes and cover the checked Vietnamese/German characters. The Articulat declaration and binary are handled under the owner's confirmed Web license; the binary is excluded from Git.

Deployment uses the existing isolated Compose project; backup and rollback remain as documented in ops/deploy/README.md. Never restart unrelated VPS services for a presentation release.

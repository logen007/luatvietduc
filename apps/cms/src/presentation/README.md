# Presentation modules

Edit these small source files rather than the generated public bundles.
`modules.json` defines concatenation order; fragments retain their surrounding JS scope.

- `editorial-ui-js/00-native-routing.js`: bookmark compatibility for the native public pages. Only this compatibility fragment is assembled into editorial-ui.js. Legacy fragments remain as references.
- `editorial-ui-css`: base, hero/header, partners, country links, topic cards, news/footer/responsive and application menu.
- `live-css`: shared shell, footer, account, connections, articles, responsive rules and chat.
- Chat entry is `modules/chat/Workspace.tsx`; customer and staff screens are separate. `useWorkspace.ts` owns transport, retry and polling; `chat/ui/` owns composer, history and transcript. `modules/assistant/` owns FAQ scope, provider formatting and transactional delivery.

Stage intended source edits, then run from the repository root:

```sh
bash ops/deploy/publish.sh "fix(ui): describe the change"
```

This assembles and commits the tracked public bundles and pushes the current project branch. It runs no local tests or preview and does not connect to the VPS. GitHub performs the required checks; the existing server-owned release service handles backup, candidate validation and promotion. CI rejects stale generated bundles, preserving the release service's existing content hash contract. Deployment policy and schema changes still require their separate reviewed path.

## Fast edits — owner workflow

For routine UI and copy requests: edit the responsible source module, stage intended files, run the publish command once, and finish after the push succeeds. The owner checks the interface. Do not run local checks/build/preview, browser review, screenshots, CI polling or deployment polling. The existing automatic checks and release protection remain in place. A successful push means sent for automatic update, not verified live.

Batch related requests into one push. Do not interrupt an already running release with a second push for cosmetic follow-up work; combine changes before publishing where possible. No Termius or VPS steps are needed.

| Requested area | Edit here (relative to apps/cms) |
| --- | --- |
| Hero text / video source / section order | src/modules/public-site/Home.tsx |
| Hero and public header style | src/presentation/editorial-ui-css/01-header-hero.css |
| Partner logos / display | src/modules/public-site/Home.tsx; src/presentation/editorial-ui-css/02-partners.css |
| Topic cards and counts | src/modules/public-site/ui.tsx; src/presentation/editorial-ui-css/04-topics.css |
| Shared header/footer links | src/modules/shared/navigation.json |
| Application header/footer markup | src/modules/shared/Header.tsx; src/modules/shared/Footer.tsx |
| Public footer / responsive layout | src/presentation/editorial-ui-css/05-news-footer-responsive.css |
| Application footer | src/presentation/live-css/01-footer.css |
| Customer chat | src/modules/chat/CustomerWorkspace.tsx; src/modules/chat/ui/; src/presentation/live-css/07-assistant-chat.css |
| Specialist inbox | src/modules/chat/StaffWorkspace.tsx; src/presentation/live-css/08-specialist-inbox.css (also imported by admin layout) |
| Chat transport | src/modules/chat/useWorkspace.ts; src/modules/shared/polling.ts |
| FAQ / AI answering | src/modules/assistant/faq.ts; format.ts; reply.ts |
| Public settings request | src/modules/settings/client.ts; view.ts |
| Contact form and submit interaction | src/modules/public-site/Contact.tsx; src/presentation/editorial-ui-css/07-contact-form.css |
| Library / news / information pages | src/modules/public-site/Library.tsx; News.tsx; Information.tsx |
| Public reads / routes / metadata | src/modules/public-site/server.ts; routes.ts; seo.ts |
| Native public page layout | src/presentation/editorial-ui-css/09-native-pages.css |
| Contact email validation and sending | src/modules/contact/; recipient in Resend connection settings |

Suggested completion: “Đã đẩy bản sửa [phần thay đổi]. Hệ thống đang tự cập nhật; anh kiểm tra giao diện giúp em.” If publishing fails, report the actual failure. Never claim the website is updated based only on a push.

## Footer version

Shared version: `src/modules/shared/site-version.json`, format `xx.xx.xx`, shown in both public and application footers. Publishing automatically increments the patch by default. Pass `minor` as the second argument for a feature group or `major` for a major change; lower components reset. The first version is `01.00.00`. Documentation-only commits need no bump. Do not edit this version separately from publishing.

## Loading and polling

Application routes load the design system and assembled live CSS, without three redundant legacy stylesheets. Public settings share a short same-tab cache and bypass session/vault reads. Hidden pages pause polling; requests never overlap. The hero defers video loading until allowed to play and pauses when off-screen. These changes reduce redundant work; no runtime speed benchmark is claimed.

## Current split

Public identity and setting interpretation: `modules/shared/public-shell.mjs`.
Admin copy: `modules/admin/presentation.ts`; field schema and permissions stay in feature modules.
CSS sources remain in modules.json. `live.css` owns the public shell;
`customer-chat.css` is loaded only at /tro-chuyen; `specialist-inbox.css` and
`admin-theme.css` load in the admin layout. The reviewed fast lane includes these
CSS files and the two exact admin CSS source paths. React/TypeScript changes still
require a full application build. See docs/07-current-structure.md for backend ownership.

Public pages use native React/SSR routes. Edit `modules/public-site/`, not the retained prototype renderers. Root prototype assets and old renderer fragments remain for reference and rollback. `content.json` is reproducibly extracted source content, not a new approved knowledge store. Database articles remain the authority for published content and AI eligibility.

## CMS interface regression checks

The existing required CMS workflow runs browser checks through npm postbuild on CI. It uses the built CMS on localhost:3047, the isolated lvd_test database, synthetic admin credentials, and intercepted provider requests. No production target or external provider is allowed. Ordinary local builds and container builds do not install/run browsers. Scenarios cover public VI/DE, phone layout, session loading, signed-in menus, recovery from connection failures, unsaved edits, and native admin destinations. This is a focused regression gate, not a visual or accessibility certification.

Project copy guidance is .agents/skills/luat-viet-duc-copy/SKILL.md. Keep approved navigation labels and write idiomatic Vietnamese/German without invented legal guarantees or delivery promises.

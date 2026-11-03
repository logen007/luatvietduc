# Presentation modules

Edit these small source files rather than the generated public bundles.
`modules.json` defines concatenation order; fragments retain their surrounding JS scope.

- `editorial-ui-js`: partner strip, content helpers, homepage, video/counts and navigation lifecycle.
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
| Hero text / video source / section order | src/presentation/editorial-ui-js/03-homepage.js |
| Hero and public header style | src/presentation/editorial-ui-css/01-header-hero.css |
| Partner logos / display | src/presentation/editorial-ui-js/01-partners.js; src/presentation/editorial-ui-css/02-partners.css |
| Topic cards and counts | src/presentation/editorial-ui-css/04-topics.css; src/presentation/editorial-ui-js/04-video-counts.js |
| Shared header/footer links | src/modules/shared/navigation.json |
| Application header/footer markup | src/modules/shared/Header.tsx; src/modules/shared/Footer.tsx |
| Public footer / responsive layout | src/presentation/editorial-ui-css/05-news-footer-responsive.css |
| Application footer | src/presentation/live-css/01-footer.css |
| Customer chat | src/modules/chat/CustomerWorkspace.tsx; src/modules/chat/ui/; src/presentation/live-css/07-assistant-chat.css |
| Specialist inbox | src/modules/chat/StaffWorkspace.tsx; src/presentation/live-css/06-chat.css |
| Chat transport | src/modules/chat/useWorkspace.ts; src/modules/shared/polling.ts |
| FAQ / AI answering | src/modules/assistant/faq.ts; format.ts; reply.ts |
| Public settings request | src/modules/settings/client.ts; view.ts |

Suggested completion: “Đã đẩy bản sửa [phần thay đổi]. Hệ thống đang tự cập nhật; anh kiểm tra giao diện giúp em.” If publishing fails, report the actual failure. Never claim the website is updated based only on a push.

## Footer version

Shared version: `src/modules/shared/site-version.json`, format `xx.xx.xx`, shown in both public and application footers. Publishing automatically increments the patch by default. Pass `minor` as the second argument for a feature group or `major` for a major change; lower components reset. The first version is `01.00.00`. Documentation-only commits need no bump. Do not edit this version separately from publishing.

## Loading and polling

Application routes load the design system and assembled live CSS, without three redundant legacy stylesheets. Public settings share a short same-tab cache and bypass session/vault reads. Hidden pages pause polling; requests never overlap. The hero defers video loading until allowed to play and pauses when off-screen. These changes reduce redundant work; no runtime speed benchmark is claimed.

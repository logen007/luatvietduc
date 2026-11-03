# Work integration — 2026-11-03

Base main and feat/platform-foundation were both verified at 42dea650e55c457f816ae648f11c0fea880aa4dd. Work is isolated on feat/platform-cms-bootstrap. All handoff files were read and SHA256 checks passed. Other referenced Library wireframes were not part of this archive and have not been read in this session.

## Review findings and changes

- Integrated the previously uncommitted foundation draft. Added rejection of unknown jurisdiction codes at the knowledge gate (a matching invalid source/query previously passed at runtime). Foundation now has 50 tests.
- Expanded the CI push branch filter so the new work branch runs checks. Added CMS CI with disposable PostgreSQL, migration, integration test and build. Existing prototype workflows unchanged.
- Built apps/cms with Payload admin/REST, PostgreSQL schema/migration, generated types, authentication configuration, offline owner provisioning, restricted article versions/review and private settings.
- Payload first-register uses elevated Local API access internally; collection create access alone cannot block it. Added a beforeChange gate requiring authenticated owner or offline bootstrap context.
- Root prototype still contains Bizlawyer social links. This is recorded for UI migration; new settings are dedicated to Luật Việt Đức and start empty. No prototype HTML/assets were changed.

## Connection evidence and limitations

GitHub connector confirmed push permissions and Git clone/remote reads succeeded. No Termius connector, SSH destination or authenticated SSH agent was available. SSH executable availability is not VPS access. The server audit was syntax-checked only, never run against a VPS.

The local runtime is Node 24.22.1. Docker/PostgreSQL binaries are absent. System package installation was unavailable in this runtime. Database migrations, actual authentication and DB integration therefore require the disposable CI service or an authorized local database. No VPS was provisioned or touched; no DNS/domain, email, provider or production changes were made.

## Remaining acceptance

Full CMS country/field scoped reviewer and publisher workflow, audit trail, settings coverage, UI port preserving fonts/layout/catalog and chat, private conversations and guest sessions, idempotency/transactions, inbox/realtime/AI cancellation, approved-source RAG, email and operational verification remain open. Current admin role restrictions are a conservative scaffold, not completed RBAC. No staging URL or deployment exists. luatvietduc.com remains planned and unverified.

## Follow-up verification

- Local HTTP smoke: `/` returned 200; `/health/live` returned the expected JSON.
- PostgreSQL 17.6 migration passed in GitHub Actions. Its integration check revealed Payload merges existing publication status into update data; moved content invalidation ahead of the publication guard and added a regression test (12 CMS tests).
- Patched transitive DOMPurify to 3.4.17 using an explicit npm override after audit found critical advisories. Audit after patch: 0 high, 0 critical; 6 low and 5 moderate remain in upstream dependencies (including development tooling). Do not run `npm audit fix --force` to downgrade the Payload adapter.
- Git CLI has read access but no push credential; remote commits were saved through the authenticated GitHub connector. Draft PR: https://github.com/logen007/luatvietduc/pull/1 (base feat/platform-foundation).


### Continuation — 2026-11-03

Continued feat/platform-cms-bootstrap from 12c1d43. Added country-scoped article writes/version access and editor/reviewer/publisher transitions using existing schema. Authenticated members now read approved public content. Added 13 focused regression cases and Local API integration exercising foreign-country denial, reviewer approval, publisher publication and withdrawal. No legacy UI, production or infrastructure changes. Remaining: field scope, reviewer attribution/audit, concurrency protection, settings expansion and UI port.

Verification observed: 25/25 CMS unit tests, TypeScript check, initial migration on isolated local PostgreSQL, Local API database integration and production build passed. Local runtime Node 26.5.0 (CI remains pinned to Node 24.22.1); build emitted warnings. Test database was stopped after verification. No HTTP/browser acceptance or VPS deployment was performed.

### Owner-selected workflow update — 2026-11-03

Reviewer now approves and publishes in one operation within assigned country. Legacy publisher enum is retained without editorial access. Country-only permissions replace the earlier field-scope proposal. Recorded internal-only AI trials, human-first customer chat, R2 storage choice, domain report and pending email in docs/03-owner-decisions.md. Verification: 27 CMS tests, typecheck and actual Local API database integration passed. No schema change or deployment.

### Integrated release — 2026-11-03

Deployed code commit 04c6da7 to the owner-authorized public domain https://luatvietduc.com using a separate web container and PostgreSQL database. Owner provisioned offline; no credential is stored in this repository. HTTPS readiness returned 200 and status ready. Live synthetic checks passed: owner login, guest question, staff claim/reply, private-note filtering, cross-session denial and close. Browser QA verified homepage-to-chat, persisted history after reload and a human response on the public domain. Existing shared containers retained their uptimes.

CI https://github.com/logen007/luatvietduc/actions/runs/41588280855 passed at 04c6da7: 50 foundation tests, 31 CMS tests, typecheck, migrations, editorial DB integration (including concurrent edits), chat DB integration and build. Local HTTP integration also passed. Fresh-install migrations were verified against an empty local database; a backup restore into a separate local database succeeded. Initial server backup created and daily backup scheduled (same-VPS only; off-VPS destination still unconfigured).

External connections remaining: Google OAuth (owner explicitly deferred), R2 bucket/token, transactional email and the internal AI provider key/model. These are inactive in the UI, not simulated successes. No customer AI is enabled. No actual Google/R2/email/AI-provider integration test has occurred. Load testing and a full security review are not claimed.


### Reference-matched presentation release — 2026-11-03

Deployed code commit af77d039c05450fe86b94c20d781b4e3ec7e730b to https://luatvietduc.com via the existing Termius N8N session. Release image is luatvietduc-web:af77d03; presentation revision eb3522b9480f. The owner confirmed an Articulat Web license. Its binary is installed separately, ignored by Git, and served locally alongside the exact seven Inter subsets. Public headings, scale, spacing, neutral palette and black six-column footer follow the measured Papermark source. All 13 original partner images were verified loaded on the public website.

Browser verification on the public domain confirmed Articulat 500 at 92px/96.6px on a 1440px viewport, 81.92px/86.016px at1280 and48px on390. The footer renders black. Mobile intake now fits the390px portrait conversation viewport and starts at scrollTop0. With two saved conversations, a homepage question remains in a separate new intake, is not automatically submitted, and does not select an older thread. Existing synthetic closed conversations and human replies persisted after deployment. No customer record was edited during presentation verification.

CI https://github.com/logen007/luatvietduc/actions/runs/41606669446 passed at af77d03: foundation policy/concurrency tests, CMS access/review tests, typecheck, migrations, database/system integration and production build. The local HTTP suite also passed during this UI correction. Local production builds and browser checks covered phone320/390 and desktop1280/1440, with VI/DE public navigation.

Backup before release: backups/luatvietduc-20261103T084906Z.dump. Private candidate checks returned200 for readiness, chat and licensed font before activation. Production readiness returned200/status ready. Temporary candidate containers were removed; nine other/database container IDs remained unchanged. No main merge, DNS change or unrelated service restart. Google OAuth, R2, email, internal AI and off-VPS backup destination remain deferred as previously recorded.

### Compact presentation release — 2026-11-03

After the owner's explicit approval, deployed UI commit 529be65323adf132e4fbb8e4b397538e2ff02400 through Termius N8N to https://luatvietduc.com. Production image is luatvietduc-web:529be65 and presentation revision is 79fd3cf190bb. All 13 existing partner logos now form a continuous monochrome strip inside the bottom of the hero, following the measured Papermark placement and motion. Country links use small flags instead of large illustrations. Removed repetitive labels, process instructions and duplicate sections; fixed the active desktop navigation pseudo-element; changed the home heading to “Chủ đề đang được quan tâm” and rendered topic names in Inter 600. Licensed fonts and the dark footer remain. Updated docs/05-ui-system.md records the copy and presentation rules.

Public browser checks confirmed the revision, loaded Articulat, all 13 logos, partner placement, small country flags, bold topic names, single country-root heading and the removed desktop strike-through. Phone390 and desktop1280/1440 checks passed without horizontal overflow; phone VI/DE switching and menu opening/closing worked. No question or customer record was submitted during this release verification. Screenshots are saved in the task outputs directory.

Optimized local builds, 31 CMS tests and isolated editorial database integration passed. CI for test-only follow-up 957c2678e070ab9375b3682b38f2507b9dfe9d41 passed for both push and PR: https://github.com/logen007/luatvietduc/actions/runs/41618692140 and https://github.com/logen007/luatvietduc/actions/runs/41618700617. The follow-up synchronizes two synthetic test writers before the existing article lock, checks the precise stale-snapshot rejection and persisted winning content, and confirms serial writes succeed. It changes only the test script; the deployed application files are identical to the approved 529be65 release.

Backup before activation: backups/luatvietduc-20261103T101141Z.dump. Seven private candidate paths returned200, including readiness, account, chat and the licensed font with its verified SHA256. Production returned200/status ready after activation. Removed lvd-ui-check; all nine other/database container IDs matched the before-release snapshot. The image remains pinned to529be65. No main merge, DNS change, database migration or unrelated service restart. Previously deferred external connections remain deferred.

### Automatic release activation — 2026-11-03

The owner explicitly approved persistent automatic updates from the project branch and unlocked the Mac for the one-time setup. Installed the reviewed engine/configuration from commit78f803597dadef76a0d26db9fd63db25e8d10094 via the existing Termius N8N session. The root-owned systemd timer is enabled and active. It checks the public repository each minute and accepts only the exact successful push workflow for feat/platform-cms-bootstrap. No VPS credentials were transferred to GitHub, no SSH key/user/port was added, and the shared proxy, database and unrelated services were not restarted. The engine, Compose, Dockerfile and workflow policy are pinned by approved hashes; schema/migration changes require separate review.

The initial --check confirmed the exact approved candidate without activation. The first service run started18:06:41 and finished18:09:33 Vietnam time. It built and promoted luatvietduc-web:78f803597dadef76a0d26db9fd63db25e8d10094, verified the private candidate and public release identity, recorded previous image529be65, and removed lvd-auto-check. Backup backups/luatvietduc-auto-20261103T110909Z.dump was created and its archive index validated before activation. This release did not run data migrations. All nine other/database container IDs remained unchanged. The next timer invocation completed successfully with “unchanged”, proving the schedule remains active after the first deployment.

Public browser verification showed /release.json commit78f803597dadef76a0d26db9fd63db25e8d10094, /health/ready status ready, presentation revision79fd3cf190bb, loaded Articulat and all13 partner images with no horizontal overflow. CI push41622660954 and PR41622670311 passed the full foundation/CMS checks and14 deployment-tool tests. Rollback/error paths are covered by those isolated mock tests; no deliberate production fault was injected. No main merge or customer-record write occurred. Screenshots and the Vietnamese operating summary are in the task outputs directory. Future routine edits can use GitHub and HTTPS verification without Termius. Schema changes and changes to the frozen deployment policy use the separately reviewed maintenance path described in ops/deploy/AUTO_DEPLOY.md.

### Video hero and unified chat — 2026-11-03

Released commit c233e0d4649a7e982bbb08759cae144345ec24aa through the approved automatic GitHub-to-VPS path, without Termius operations. Public /release.json confirmed that commit and the public shell served presentation revision a58274f2001a. CI push 41634908020 and PR 41634916227 both succeeded: https://github.com/logen007/luatvietduc/actions/runs/41634908020 and https://github.com/logen007/luatvietduc/actions/runs/41634916227.

Replaced the hero photo with a self-hosted, silent 13-second Berlin video and poster; the source/permission record is in public/media/LICENSES.md (Giang/Pexels). The video is 870,846 bytes, H.264 720p/25fps with fast start and no audio. Motion/data preferences are checked before playback, with explicit play/pause and visibility handling. All 13 original partner logos remain over a 12px backdrop blur; the visible partner heading is removed. News now precedes the featured topics. Counts use Articulat 500 at 76px desktop and 60px phone, including all 16 Vietnamese library cards. Removed the footer callout/geography row and suppressed its default disclaimer while retaining configurable custom footer text. Removed the /bai-viet listing and all list navigation; that URL redirects to /#/tin-tuc, while published article detail URLs remain intact.

The shared application header/modal menu and chat now use the public typography and neutral palette. Chat CSS was consolidated into one scoped section; history, consent, notice, submission, idempotency, polling, access and staff actions remain. Local typecheck, optimized build, 31 CMS tests and the HTTP integration suite passed. A local synthetic browser conversation was sent, persisted after reload and kept separate from a second unsent homepage draft. Public QA checked desktop 1440 and phone 390: video played muted, all logos loaded, expected section order and count sizes appeared, footer removals held, list redirect worked, and chat/menu had no horizontal overflow with its composer inside the viewport. Local phone 320 also passed layout checks. No production message was submitted; only the existing synthetic closed history was inspected. Local preview/database were stopped. Four public screenshots and the Vietnamese release checklist are in task outputs.

### Six-scene hero montage — 2026-11-03

Automatically deployed 9d462ff9af8f8fb12c4ed2f6f003572050c63f4a without local application tests/build/preview or VPS interaction. Replaced the single skyline shot with six licensed stock scenes (discussion, document close-up, boardroom review, signing, client discussion, Berlin), 25.04 seconds with 0.4-second internal crossfades; silent H.264 720p/25fps, 3,049,532 bytes. Versioned media/poster URLs avoid stale caches. Sources and credits are in public/media/LICENSES.md. Updated only the homepage and hero-overlay modules plus preload/asset records; the publish command assembled tracked bundles.

GitHub push41638524405 and PR41638532127 succeeded. Public /release.json confirmed the deployed commit; browser observed the new media URL, duration25.04, readyState4, muted=true and active playback. Presentation revision10a343d35e3f. Live screenshot and the finished video are saved in task outputs. No customer records, settings schema or deployment policy were changed.

### Header and hero copy refinement — 2026-11-03

Automatically released afe51b4d14ee2d14c15181ff17c76557ef84ced1. Header language controls and duplicate plain login link were removed; the single black action now links to /tai-khoan and says Đăng nhập in both shell renderers. Phone rules keep it visible without horizontal overflow at320px. Hero heading is “Giải đáp pháp luật Việt Nam và Đức.” The description uses balanced wrapping at48ch and a nonbreaking space in “tài sản”. Public browser confirmed the heading, one login action, zero header language controls and revisioncb6bd9d541f7; /release.json confirmed the exact commit. GitHub push41640923844 and PR41640933603 succeeded. No local application test/build/preview or VPS interaction was used. Live screenshot is saved in task outputs/luatvietduc-header-giai-dap-live.png.

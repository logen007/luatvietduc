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

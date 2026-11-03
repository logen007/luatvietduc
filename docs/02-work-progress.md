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

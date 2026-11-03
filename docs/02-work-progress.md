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

# Luật Việt Đức CMS — local scaffold

Continue the existing prototype; root HTML/assets are untouched. This application is a development baseline, not the completed public site. No n8n or Chatwoot.

## Verified package matrix

Checked on 2026-11-03 against the installed npm package metadata and official installation documentation: https://payloadcms.com/docs/getting-started/installation . The package peer range is stricter than the general docs: `@payloadcms/next@3.92.1` accepts Next >=16.3.3 <17. Pinned: Node 24.22.1, Payload/Next adapter/Postgres adapter 3.92.1, Next 16.4.4, React/ReactDOM 19.3.1, TypeScript 5.9.3. Lockfile is committed. PostgreSQL Compose/CI target is 17.6; pgvector, embeddings and providers are not installed.

## Local startup

1. `npm ci --ignore-scripts`
2. Create an ignored `.env` from `.env.example`, using a locally generated long secret and a private development database URL.
3. With Docker available: set `LOCAL_DB_PASSWORD` in your local environment, then `docker compose up -d postgres`. The database binds to loopback port 54329 only. Match DATABASE_URL to the chosen password.
4. `npm run migrate` applies the tracked initial migration; schema push is disabled. Never run against an existing shared database.
5. Provision an initial owner using `npm run bootstrap:owner` with a JSON object on stdin containing `email`, `name`, and a random `password` of at least 16 characters. Use a local secret manager/secure input pipe; never place passwords in command arguments, chat, shell history or repository. The script accepts an empty users collection only. Public first-user registration is blocked by a server hook.
6. `npm run dev` binds to 127.0.0.1:3000. Visit `/admin`. No public staging URL exists yet.

## Verification

`npm run typecheck`, `npm test`, `npm run build`. Database integration: point DATABASE_URL at an isolated **localhost database named lvd_test**, apply migrations, then `npm run test:db`. The integration test creates synthetic records and tests actual login, privilege isolation, publication and re-review. It refuses other database names/hosts. CI provisions a disposable PostgreSQL service for it.

`/health/live` checks the process only; it does not claim database readiness. Build success does not establish admin login or migration success. Email has no delivery adapter; do not use real email addresses/password-reset flows yet.

## Implemented boundaries

- Payload admin and REST wiring, generated types, Postgres adapter and initial migration.
- User roles enumerated; only owner manages accounts. Other roles remain deliberately restricted pending full workflow implementation.
- Article drafts/versions, public filtering, restricted publication, review invalidation on content edits, private settings and empty dedicated social list.
- No working private chat storage, realtime, uploads, email, RAG, review-by-jurisdiction workflow or production backup yet. AI remains off. The approved chat UI is still the unchanged prototype.
- Local API callers must explicitly choose `overrideAccess:false` with an authenticated server user; offline bootstrap is the documented exception. CI uses elevated creation only for its synthetic initial owner.

Do not deploy this scaffold publicly, change main/DNS, or touch shared VPS services without the release gate in the handoff.

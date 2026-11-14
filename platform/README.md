# Luật Việt Đức — foundation 0.1

## Integrated foundation
This foundation was integrated from the handoff archive. It is the first implementation step, **not a running CMS, API or live chat service**.
It contains typed domain rules, tests, safe defaults, an SSH inventory script and the implementation contract. The current static website remains unchanged.

- Versioned AI-to-human handoff, jurisdiction-limited claiming and transcript access rules.
- Knowledge eligibility checks: public, published, approved, in scope, current and not withdrawn/conflicting.
- Social settings empty by default. Planned domain: `luatvietduc.com`; ownership and DNS are unverified.
- AI, live chat, public registration and indexing disabled until their modules pass acceptance.

## Run locally
```sh
cd platform
npm ci --ignore-scripts
npm run typecheck
npm test
```
Node >=22 for this small foundation package; TypeScript 5.8.3 is pinned only for these dependency-free domain rules. Re-resolve the complete supported Node/Next/Payload/TypeScript matrix and lock dependencies when scaffolding the real application. No claim that this compiler version supports a future Payload release.

## Integration requirements
These pure functions do not implement authentication or database permissions. Actors must be server-authenticated. Use transactions and an atomic `UPDATE ... WHERE version = expectedVersion`; exactly one claim/handoff may win. Store and return idempotency keys for retried commands. Re-check conversation version and source eligibility immediately before persisting/broadcasting an AI reply. Stop streaming on handoff. Do not send private transcript content with queue previews.

Authentication, Payload collections, PostgreSQL migrations, realtime sockets, operator inbox, model API calls, email, uploads, backups and deployment are **not implemented yet**.

See `../docs/01-implementation.md` for staged delivery and the operational gate.

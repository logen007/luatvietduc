# Modular application — implementation and operations

## Runtime modules

The Next.js/Payload app remains in apps/cms. src/payload.config.ts composes modules rather than owning business logic.

| Module | Responsibility |
| --- | --- |
| modules/identity | Provisioned staff, verified Google Gmail identity, expiring revocable sessions |
| modules/content | Article drafts/versions, country permissions, reviewer publication, transaction locks, review attribution and audit |
| modules/settings | Validated owner settings, public projection, admin entry links, connection status |
| modules/knowledge | Public reviewed sources with dates, revision invalidation, fixed internal AI source test |
| modules/chat | Guest ownership, queue preview, assigned transcripts, messages, private notes, atomic claim/close/reopen |
| modules/storage | Private R2-backed CMS media, owner-controlled publication; uploads fail closed until R2 is configured |
| modules/shared | Shared shell, DB pool and transaction helper |

UI entry points: / retains the approved prototype from a generated public copy; /tro-chuyen, /tai-khoan, /chuyen-vien, /kien-thuc, /quan-tri and /bai-viet are live modules. Legacy hash chat/account routes redirect to the live paths. Root source HTML/assets remain untouched. prepare-frontend.mjs copies the retained design; changes to frontend styles are isolated in public/live.css. Published CMS articles appear in their own list/detail and replace the homepage news grid when available. Empty dedicated social settings render nothing.

Payload collections own CMS schema. Explicit lvd_* PostgreSQL tables own identity sessions, chat, event audit, idempotency, limits and AI quota. Both are managed by tracked migrations; schema push remains disabled. Do not use Payload collection endpoints to bypass the chat service. New chat transports must call the same authorization/transaction service.

## Access and concurrency

Owner alone manages accounts and settings. Editors submit, reviewers approve/publish in assigned VN/DE countries. The compatibility publisher role grants no editorial writes. Existing-record country queries and resulting-country hook checks both apply. A database row lock plus original updatedAt check rejects concurrent stale article/knowledge writes. Audit rows are created in the same Payload transaction. Review attribution is server-populated and edits invalidate it. This protects overlapping backend writes; browser editing locks still need normal user reload/review on conflicts.

Guests receive random HTTP-only identities, hashed in storage. Verified Google sign-in associates that guest's history with the account. Chat queue previews omit titles/messages/contacts. Only the customer, assigned in-country staff or owner can read transcripts. Human claim locks the row and compares a version. Duplicate message keys return the original result; reusing a key for other content fails. Internal notes are excluded for customers. Cursor polling every 2.5 seconds provides delivery/replay from persisted messages; there is no WebSocket service yet. Customer AI is intentionally disabled, so no customer data reaches a model and no AI generation can race a human claim.

Google uses authorization code + PKCE, signed short-lived flow state, nonce, remote JWKS ID-token validation and verified Gmail email. Sessions expire after seven days and logout revokes them. No Gmail/Drive permission is requested. Google Client ID/secret must be configured by the owner before end-to-end real sign-in is possible. Password-based staff login remains for explicitly provisioned accounts; public registration is blocked.

## Deliberately unavailable without connections

R2 needs a private bucket and limited token; no local public upload fallback. No customer document upload is enabled. Email is not configured: no real delivery/recovery promises. Internal AI uses only a selected public approved source and a fixed synthetic summarization prompt; arbitrary customer prompts are not accepted. It requires provider key/model, checks source validity before and after generation, has daily quota and timeout, and never publishes output automatically. This is not acceptance of legal answer quality, full RAG evaluation or customer AI launch.

## Verification and release

Run npm test, npm run typecheck, migration on isolated localhost lvd_test, npm run test:db, npm run test:system, npm run build. Start local server with APP_URL matching its origin, then npm run test:http. HTTP test refuses non-local databases/hosts. PostgreSQL restore drills use a separate target database. Browser QA should cover guest send/reload, staff queue/reply, admin fields and mobile layouts. OAuth/R2 must additionally be tested against actual connected services.

See ops/deploy/README.md for isolated Compose deployment, backup and rollback. No shared service restart or existing database reuse is required.

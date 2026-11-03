# Luật Việt Đức — modular application

Continue the retained root prototype; do not replace its source assets. The running app combines Next.js/Payload/PostgreSQL with live chat and modular admin configuration. See ../../docs/04-modular-system.md for design, authorization and actual limits. The owner-authorized release is available at https://luatvietduc.com; no main merge was performed.

## Local setup

1. Use Node 24.22.1, then npm ci --ignore-scripts.
2. Create an ignored .env from .env.example with a random long PAYLOAD_SECRET and private development DATABASE_URL. Match APP_URL to the exact browser origin.
3. Use the local Compose PostgreSQL at loopback 54329 or a separate local database; apply npm run migrate. Schema push is disabled.
4. Create the first owner offline with npm run bootstrap:owner, passing JSON email/name/password through secure stdin. It refuses nonempty users collections. Never use real credentials in commands, logs, chat or the public repo.
5. npm run dev serves the app on 127.0.0.1:3000. The predev/prebuild helper copies the approved assets into ignored generated files.

## Modules and usage

- /admin: Vietnamese CMS, accounts, country-scoped author/reviewer workflow, versions, dated knowledge and audit.
- /tro-chuyen: guest/customer chat; /chuyen-vien: assigned staff inbox, private notes and versioned claim/close/reopen.
- /tai-khoan: verified Google Gmail login when connected, customer history, staff navigation.
- /quan-tri: owner-only connection status; /admin/globals/site-settings: validated website and operational settings.
- /kien-thuc: fixed internal source test using approved, current public knowledge when the provider is connected. No customer AI or conversation reuse.
- /bai-viet: actual approved published articles; old hash catalog/routes remain available.
- /health/live checks the process; /health/ready also checks migrated database access.

Google, R2, email and AI are not configured by default. R2 uploads fail closed without a connection. Email recovery is explicitly unavailable. Google credentials and a private R2 bucket-scoped token belong in server environment only. Google login requests openid/email/profile, never Gmail or Drive access. See ../../ops/deploy/README.md for setup and rollback.

## Verification

npm test; npm run typecheck; npm run build. With isolated localhost lvd_test: npm run migrate; npm run test:db; npm run test:system. Start the local server with matching APP_URL, then npm run test:http. Test scripts refuse non-local/non-test databases. Integration tests create synthetic records; never point them at the deployed database.

Pinned dependencies: Payload/adapters/translations 3.92.1, Next 16.4.4, React 19.3.1, TypeScript 5.9.3, Node 24.22.1, PostgreSQL 17.6. DOMPurify override remains 3.4.17. Last package audit has no high/critical findings, with upstream low/moderate findings still present. Dependency audit is not a full system security review.

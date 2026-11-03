# Luật Việt Đức — development rules

## Preserve the current website
- The root `index.html`, `assets/` and existing workflows are the legacy public prototype.
- User authorized a full Papermark-inspired UI redesign on 2026-11-03. Preserve the original prototype sources as reference; apply the new shell, theme and page presentation in apps/cms while keeping content, routes and behavior intact.
- Work on a feature branch. Never push directly to `main`, merge, change DNS, restart shared services or modify production data without explicit approval.
- Owner confirmed domain ownership and Cloudflare routing, authorized direct deployment, and the isolated application was verified serving HTTPS on `luatvietduc.com` on 2026-11-03. Changes to unrelated services still require explicit authorization.

## Product decisions
- No n8n and no Chatwoot. Build the chat product and operator inbox in our codebase.
- Redesign the approved chat UI under the current user instruction while preserving its behavior. Social accounts belong to Luật Việt Đức, not Bizlawyer. Empty social settings render nothing.
- Target architecture: Next.js + TypeScript + Payload CMS + PostgreSQL/pgvector; custom realtime and worker processes. Verify and lock mutually supported package versions before scaffolding the application.
- Treat 303 Vietnamese topic titles as topic-only, not approved legal answers. Never fabricate legal approval, sources, staff availability or message delivery.

## Data and security
- Secrets, VPS identifiers, SSH keys and customer conversations never belong in this public repository.
- Public knowledge and private conversations are separate. Do not send private records to model providers or search indexes by default.
- Authorization is enforced server-side for every HTTP endpoint, socket event, upload and CMS Local API call. Domain helpers do not replace authentication or database authorization.
- Read/write transitions must use database transactions and optimistic concurrency checks. Human handoff invalidates any in-flight AI generation.
- Do not use AI self-reported confidence as the only handoff criterion.
- Production database ports stay private. Never use `docker system prune`, `down -v`, blanket upgrades or a new proxy on existing ports without a reviewed plan.

## Delivery
- Owner workflow: skip local test/build/preview cycles for routine edits. Edit presentation modules, assemble tracked bundles and push; use GitHub CI and automatic release verification. Do not use Termius/VPS interaction for routine releases. See apps/cms/src/presentation/README.md.
- Small changes, repeatable tests, documented migrations and separate staging/prod secrets.
- Do not claim a test/deployment was performed unless its result was observed.
- Before release, test access isolation, retries/idempotency, reconnects, AI handoff races, knowledge withdrawal and backup restore.

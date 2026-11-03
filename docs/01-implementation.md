# Luật Việt Đức — first implementation baseline

Date: 2026-11-03. Baseline repository commit: `42dea650e55c457f816ae648f11c0fea880aa4dd`.

## Confirmed product constraints
No n8n. No Chatwoot. Custom chat retaining the existing UI. Dedicated Luật Việt Đức social accounts; never substitute Bizlawyer social identities. `luatvietduc.com` is a planned purchase, not a provisioned domain.

## Target architecture (not yet installed)
Next.js + TypeScript frontend and Payload CMS, PostgreSQL with pgvector for approved knowledge, custom realtime gateway and background worker. The gateway may use Socket.IO; messages are persisted first and delivered with acknowledgements, deduplication and reconnect replay. Background jobs run in our backend rather than a workflow SaaS. Evaluate the selected queue package against the pinned runtime before implementation; don't add Redis merely out of habit. Embeddings and text-generation models remain replaceable behind server-only adapters.

The CMS and public website can share an application initially; isolate realtime/worker processes when needed. A monorepo does not mean putting every service on an already loaded VPS. No per-service microservices or Kubernetes requirement.

## Delivery order and acceptance
1. **This local draft: foundation (not committed).** Rules, defaults, repeatable unit tests and read-only server inventory. No deployment.
2. **Infrastructure gate.** Measure current VPS resources and listening ports; record existing service owners privately. Choose isolated staging resources and a dedicated deployment identity. No changes to existing services, firewall or proxy until a reviewed plan exists.
3. **Application scaffold.** Supported pinned Next/Payload/Node versions, lockfile, PostgreSQL development/staging database, migrations, admin authentication and health endpoints. Acceptance: clean install/build and admin sign-in on protected staging.
4. **CMS/settings/roles.** Content, categories, experts, menus, social, locales and review workflow. Collection/field authorization and Local API access tested. Acceptance: editor cannot self-publish; reviewer is jurisdiction-scoped; public output excludes internal settings and secrets.
5. **Website integration.** Port approved visual components without redesigning the current chat. Preserve 16 categories per jurisdiction and the 303 Vietnamese topic titles without claiming they are approved answers. Define and test old hash-link compatibility.
6. **Users and support.** Secure guest sessions, verified email accounts, persistence, operator inbox, assignment, retention and private replies. Acceptance: two users cannot access each other's transcript, files or socket rooms.
7. **AI knowledge and handoff.** Source import/review/index/withdrawal, citation checks, evaluation set, budget/rate limits, timeout fallback and human queue. Private case messages never become public knowledge automatically. Do not base handoff only on a model confidence number.
8. **Release gate.** Browser/mobile/accessibility tests, load tests, restore drill, monitoring, explicit domain ownership/DNS confirmation and production approval.

## Server access and secrets
The assistant currently has GitHub access but no authenticated Termius/SSH session. Do not interpret a TCP check as a server login. Never copy SSH passwords, private keys or populated .env files into chat or this public repository.

`ops/server-audit.sh` only prints basic resources, container names/status/ports and runtime versions. Run it in the user's existing Termius session, not on the assistant's sandbox as a substitute for the VPS. It does not install software, inspect container environments, read logs or restart services. Review output before sharing. Audit output and host addresses stay outside the public repository.

After sizing, prefer a dedicated deploy identity and authenticated access channel, with explicit allowlisted deployment scope. Docker socket access and membership of the docker group are privileged; don't describe them as low-privilege. Never expose an unauthenticated web terminal or public database to obtain access.

## Settings versus secrets
CMS settings: menus, identity, approved design choices, separate social URLs, content workflow, feature flags, support hours, notifications and AI policy. Backend must enforce restricted setting changes with an audit trail. Settings publication must not expose private integration values.
Secrets stay in the deployment secret store. Public registration, AI and chat default to off until their own tests and operations are ready. Empty social URLs are hidden, not rendered as dead links.

## Data and AI safeguards to implement
Separate public source records, immutable reviewed revisions, private conversations, assignments and internal notes. Source identity, jurisdiction, effective dates, review deadline and withdrawals gate retrieval. Re-check eligibility at answer time; removing a source must invalidate cached answers and vector entries. URL ingestion requires SSRF controls, size/content limits and an allowlist; a URL-format check is not a network security boundary. Model-provider data handling and retention need explicit review before sending live user messages. Legal compliance and editorial validity require qualified human review; passing code tests does not establish either.

## Deployment boundary
No package installation, database creation, runtime container, domain purchase, DNS/Cloudflare change, email setup, model request or production deployment was performed by this local draft. Do not merge merely because unit tests pass.

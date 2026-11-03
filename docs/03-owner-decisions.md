# Owner decisions — 2026-11-03

These decisions supersede conflicting earlier workflow proposals.

- Editor submits; reviewer approves and publishes. No separate publisher is required. Legacy publisher role grants no editorial write access.
- Permissions are assigned by VN/DE jurisdiction, not by legal field. Specialty may be used for chat routing without becoming a content permission boundary.
- AI handoff goes to the appropriate specialist queue; a human claims the conversation. Outside staffed hours, persist the request and state availability without promising a response time.
- AI trials are internal only, using public approved knowledge and synthetic questions. Customer chat starts human-operated. No customer data is sent to an AI provider; no provider is configured yet.
- Target file storage is Cloudflare R2. Not provisioned or connected yet. Separate public media, private documents and encrypted off-VPS backups; credentials remain outside this public repository. No paid subscription or billing has been authorized.
- Owner reports domain purchased and routed through Cloudflare to VPS. DNS/TLS/site routing still require verification before staging. This report is not deployment authorization.
- Email service is not available yet. Do not enable real verification, password recovery or email delivery claims until configured and tested.

## Next milestone

Finish CMS acceptance: reviewer attribution and review history, race-safe transitions, then admin browser and HTTP authorization checks. Central settings follow with validated configuration and clear configured/unconfigured status. R2 access is needed only for storage integration; do not request secrets in chat.

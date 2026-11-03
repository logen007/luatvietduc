# Admin consolidation and settings review — 2026-11-04

## Navigation

All operational screens use the authenticated native Payload shell:

| Area | Canonical route |
| --- | --- |
| Settings overview | `/admin/settings` |
| Website settings | `/admin/globals/site-settings` |
| Google / Gemini / R2 / Resend | `/admin/settings/connections` |
| Drive backups and trial restore | `/admin/settings/backups` |
| Specialist inbox | `/admin/inbox` |
| Internal knowledge test | `/admin/knowledge` |
| FAQ editing | `/admin/collections/knowledge` |
| Articles / files / users / audit | Native collections under `/admin/collections/` |

The previous `/quan-tri`, `/kien-thuc`, `/chuyen-vien` routes redirect to these locations. Customer account/chat remain public product routes. Owner-only settings and role-specific inbox/knowledge visibility are checked on the server, independently of navigation links. All native collection access rules remain in force.

Site settings use unnamed tabs: identity, navigation/social, support/chat, internal AI, privacy/search. Existing SQL field paths are preserved; this is not a data migration of website settings.

## Actual status, not just stored values

| Setting or feature | Status |
| --- | --- |
| Provider credentials and enable/disable | Existing encrypted runtime vault; moved into native admin, with provider setup instructions. Save → check → enable. |
| Google login | Wired, but a real client and successful sign-in are still required. Structural check is explicitly labeled, not claimed as an OAuth test. |
| Gemini | Internal public-source test only. No customer AI response pipeline enabled. A model metadata check does not prove generation quota. |
| R2 | Wired private media adapter; actual activation deferred by owner on 2026-11-04. No replacement bucket or public access enabled. |
| Resend | Wired email adapter and owner-only test. Provider account and `mail.luatvietduc.com` configuration created; keys and DNS verification still need completion. Owner approved three sending verification DNS records, not root MX replacement. |
| Drive backup | New owner-only queue, encrypted archive worker and trial-restore UI. Requires reviewed migration, worker installation, separate OAuth authorization and an external age identity before any operational claim. |
| Chat enable, message length | Existing runtime enforcement. |
| Support notice, office hours, time zone | Existing display settings; do not promise an automatic staffing schedule. |
| Conversation retention | A stored policy value, not an implemented automatic deletion job. Keep the field label explicit. |
| AI request/token limits | Existing internal-test limits. |
| Social links | Existing settings and icons; blank slots remain non-clickable. |
| Logo, name, navigation, privacy | Existing public bridge settings; React application header currently consumes name only. Header/footer synchronization should be a focused follow-up, not claimed complete here. |
| Accent and footer text | Legacy setting values; neutral redesign overrides parts of the original theme, and the owner removed the old disclaimer. Do not claim full visual theme editing. |
| FAQ specialist self-publication | Still pending the previously separated protected collection change. This admin reorganization does not grant new publication rights. |

## Responsive source review

Reviewed public, application and admin layout sources. Fixed the application footer's intermediate breakpoint from six to five tracks to match its current contents. New admin layouts collapse connection and settings cards, wrap long URLs and values, provide horizontal table scrolling, use minimum 44px actions and 16px mobile inputs, and retain checkbox sizing. Internal chat keeps its own layout and no longer renders the public header within admin.

The new custom views use Payload's `DefaultTemplate`, which supplies the same navigation/account controls as collection pages. The explicit TypeScript import-map output path prevents the old tracked map from silently missing these screens.

Visual checks on physical desktop/mobile screens are **not yet completed**: the owner's Mac locked during service configuration, and the owner asked to continue source work first. Do not describe this source review as a completed device audit.

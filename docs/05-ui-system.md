# Presentation system — November 2026

The current owner request authorizes a full public and application redesign inspired by Papermark's typography, spacing and component hierarchy. No Papermark branding, commercial font files, video or imagery is copied. The existing Luật Việt Đức photos, illustrations and content remain. Inter is self-hosted with its OFL license and source metadata in public/fonts.

## Editing points

| Layer in apps/cms | Responsibility |
| --- | --- |
| public/design-system.css | Shared font, color, width, spacing, focus and reduced-motion tokens |
| scripts/frontend-shell.mjs | One public shell transform shared by local and container preparation |
| public/editorial-ui.js | Public homepage presentation and bilingual shell markers |
| public/editorial-ui.css | Public shell, homepage and retained catalog/news/about/contact/policy page families |
| public/legal-runtime.js | Correct operational descriptions for live chat and replace the unavailable contact form with live chat entry |
| public/live-bridge.js | Public settings, published CMS articles, legacy redirects and question transfer |
| public/live.css | Scoped live application layout: account, chat, inbox, connections, knowledge and articles |
| src/modules/shared/Header.tsx | Shared live application header, mobile navigation and footer |
| src/modules/chat/Workspace.tsx | Chat/inbox rendering and existing API interaction |
| src/app/(payload)/admin-custom.css | Scoped Payload admin typography, cards and dashboard |
| src/modules/settings/AdminWelcome.tsx | Role-specific admin shortcuts and actual configured connection states |

Do not edit generated public/frontend.html or public/assets. Run npm run dev/build or node scripts/prepare-frontend.mjs to regenerate them. Container builds call prepare-container.mjs and the same transform. The root prototype is retained as reference; superseded theme-only stylesheets are omitted from generated output, while structural catalog, newsroom, feature and information-page styles remain.

Editorial homepage override must execute after steel-ui.js and before app.js, because app.js renders synchronously. legal-runtime.js must execute after legal-pages.js/legal-de.js and before app.js. Preserve route identifiers, form names, language markers and dialog IDs when editing presentation.

## User-facing behavior

Public legacy pages retain Vietnamese/German switching. The live application remains Vietnamese. Mobile navigation includes account access. The chat composer stays within the visible viewport and its transcript scrolls independently; short viewports compact secondary content. No automatic submission is introduced when transferring a question from the homepage. Existing consent and server authorization still apply.

Admin settings continue to own site name, logo, extra navigation, social links, public notices and operating settings. Structural design changes use the shared tokens and modules above. Light/dark admin themes use Payload's own account preference.

Google, R2, email and internal AI show their actual configured state. Customer AI remains disabled. This release does not enable any deferred external connection or change schema, role permissions, data retention enforcement or legal review status.

## Verification observed

- TypeScript check and optimized production build passed.
- 31 CMS access/review tests and 50 foundation policy/concurrency tests passed.
- Local HTTP suite passed guest persistence, cross-session denial, CSRF rejection, redacted queue, claim/reply, AI authorization and public/admin routes.
- Browser checks covered desktop1440, mobile390/320, a short600px chat viewport, language switching, search/topic pages, news/detail, about/team, contact/privacy, account, knowledge, connections, staff claim and admin light/dark views.
- Browser confirmed homepage questions are prefilled in chat without automatic sending, sent messages persist, and anonymous staff access shows the access screen.

Deployment uses the existing isolated Compose project; backup and rollback remain as documented in ops/deploy/README.md. Never restart unrelated VPS services for a presentation release.

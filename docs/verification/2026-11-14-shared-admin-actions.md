# Shared AdminCP actions — 2026-11-14

Reuse the article toolbar standard for native edit/save menus, list create and
filter controls, article import actions, media filters/list actions/dialogs,
connection forms, backups, AI rule footers and profile buttons. Shared CSS tokens
are 44px height, 4px corners and 8px gap. Primary, disabled and destructive states
continue to use their existing controls and permissions. Native document menus
have one outer border; mobile rows wrap and stay inside the page. Backup Drive
and refresh actions share an explicit group. Relationship add controls use a
separate square and bounded tooltips; tag chips omit the edit shortcut.

## Observed checks

- Production build and TypeScript completed successfully.
- `scripts/test-admin-actions-browser.mjs` passed 72 page/viewport combinations:
  18 screens at 320/390/768/1440px. Screens cover native category, tag, knowledge,
  quick reply and user edits, site settings, seven collection lists, connections,
  backups, AI rules, CSV import and profile.
- Actual rendered action boxes have height 44px / corners 4px and stay inside the
  viewport. Pages have no horizontal overflow. Document/list menus open, fit
  the viewport and close with Escape; list filters expand/collapse; media view
  toggles work and bulk Apply stays disabled without selection. No page errors.
- Reviewed screenshots of mobile edit/list/connection pages and desktop media.
- File-details header/action controls additionally passed at 320/390/768/1440px;
  the modal opens/closes and its actions remain within the viewport.
- Article-toolbar regression passed at 320/390/768/1024/1280/1642px, including
  keyboard order, menus, translation failure recovery and synthetic publishing.
- Existing media picker regression passed at 320/390/768/1280/1642px: private
  filtering, explicit selection, empty results, upload failure/recovery, cover
  selection and insertion into the rich text editor.
- Existing image editor helper passed at mobile/desktop: crop/rotate/flip/scale,
  undo/redo, pending save, cancel without writes, original restore, malformed
  acknowledgement and failed-save retry. Its observer also measured the shared
  button dimensions; inspected the mobile image editor screenshot.
- The image helper now confirms the existing shared HTML modal for discard and
  restore, replacing its obsolete browser-dialog handling. All image bytes and
  transform responses are mocked; no live storage/provider is contacted.

All verification uses a built localhost CMS and synthetic `lvd_test` accounts,
records and image fixture. Egress is restricted to localhost. Fixtures are cleaned
up. Screenshots/measurements are ignored under `apps/cms/test-results/`.
Mobile results are Chrome touch emulation, not physical iPhone/Safari evidence.
This document records local verification and does not assert live deployment.

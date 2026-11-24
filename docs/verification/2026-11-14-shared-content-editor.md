# Shared article / knowledge editor structure — 2026-11-14

The previous admin action pass standardized controls but left knowledge titles
as native body fields. Article and knowledge editors now share the actual
`InlineDocumentTitle` component and `admin-editor.css` title/action/content shell.

Knowledge's existing title field uses `DocumentTitleField` through the admin
presentation adapter. It keeps the same field path, native form state, maximum
length, required validation, save/publish operations and server permissions.
The field portals its one input into the action header; the duplicate native
heading and body title input are absent. Errors appear at the header input.
Article language/translation operations retain their existing title state and
use the same title input component. No storage fields or migration changed.

Both content editors use the same 320px desktop settings column, continuous
vertical divider, one page scroll and mobile stacked settings. Header titles
have the same size/weight, occupy available space, and reserve room for Back on
mobile/tablet. Knowledge retains its native manual Draft/Publish actions and
private-content fields; article-specific permalink/language/cover controls stay
with articles. Source-owned knowledge titles are read-only, matching the existing
server prohibition on editing article-derived knowledge.

## Observed verification

- TypeScript and a full production build passed; import map generated normally.
- 29 focused knowledge/native/private-content and translation unit tests passed.
- `scripts/test-content-editor-header.mjs`: article and knowledge edit pages each
  passed at 320/390/768/1024/1280/1642px (12 layout cases). One visible title in
  the action header, shared font/height, no Back overlap, 44px/4px actions, no
  horizontal page/sidebar overflow, 320px settings column and full-height divider.
- At 390/1280px: rename via header, save draft, browser-authorized read and reload
  preserved title and body; blank title shows an inline required error without
  overwriting the draft; corrected title publishes and is confirmed by a read.
- Creating knowledge from its new header persists the title as a draft. An
  article-derived knowledge header is read-only. A verified authenticated member
  is denied a title update through the native API.
- Existing article-toolbar regression passed all six widths, including Tab/menu,
  preview, translation busy/error recovery and synthetic article publishing.
- Reviewed screenshots of knowledge at 390/1280px and article at 1024px.

Tests used an isolated localhost `lvd_test` database, synthetic accounts/content,
real native form submissions and localhost-only browser egress. Fixtures are
cleaned up. Browser reads use the authenticated browser session (secure cookies
on localhost), including the negative member-permission check. Screenshots are
ignored under `apps/cms/test-results/content-editor/`. These are Chrome results
with mobile emulation, not physical iPhone/Safari or live activation evidence.

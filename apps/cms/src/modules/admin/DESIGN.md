# Luật Việt Đức — Admin dashboard

Operational CMS for Admin and Chuyên viên. Public-site styling is separate.

References: [Geist neutral color system](https://vercel.com/geist/colors) and [tapflow dashboard DESIGN.md](https://github.com/raghubetina/tapflow-workshop-lab/blob/codex/workshop-seat-leases/packages/dashboard/DESIGN.md). The admin uses only black, neutral gray and white. Public content images keep their original colors.

## Visual foundations

- Dark canvas #0a0a0a; sidebar #0d0d0d; panel #141414; elevated panel #1c1c1c.
- Hairline border #303030; body #f5f5f5; secondary text #a3a3a3.
- White #fafafa for primary actions and keyboard focus. Selected destinations use #242424, a white indicator and heavier text. Status and error labels stay explicit; do not rely on hue.
- Inter throughout the admin. Body 14px/1.55, labels 12–13px, page title 26px/1.2 semibold. No oversized marketing typography.
- Spacing: 4, 8, 12, 16, 24, 32. Controls at least 40px high. Panel radius 12px; input/button radius 8px.

## Navigation

Desktop: 264px sidebar with grouped destinations and active child links. Content occupies the remaining width. Child menus have a separate disclosure button. Do not add a branding block above the destinations.

At 1024px and below: a fixed 280px drawer, capped at viewport width minus 40px, inset 10px from the edges. Its header is the width of the drawer, never 100vw. A backdrop retains visible context and the native close/keyboard behavior. Choosing a destination closes the drawer. The page must not shift horizontally.

## Shared action rules

The sidebar footer is one row: avatar, account name and role on the left; native logout icon on the right. Its accessible label and tooltip remain “Đăng xuất”, with a 44px target. Do not show a separate website link, logout text row or branding block. These are the owner's explicit decisions from 2026-11-04. Identity is not a navigation action.

For each shared component change, review the default, selected, expanded, disabled and narrow-screen states together. Styling needs one responsible component rather than unrelated fixes on each page.

## Pages and states

Dashboard: real counts, role-appropriate shortcuts, truthful connection status. Missing counts show a dash; never invent chart data or activity.

Forms: readable labels, dark inputs, visible focus, explicit disabled/loading/error states. Keep native Payload saving, validation, access checks and dialogs.

Tables: compact rows, subtle horizontal rules, header/hover distinction, horizontal scroll on narrow screens. Do not force a wide table into a single phone column.

Settings, AI knowledge, backups, connection panels and specialist inbox share the same surface/text tokens. Security-sensitive actions retain their existing behavior.

## Interaction acceptance matrix

Use one account/session contract for public and React shells. Review guest,
loading, signed-in user, specialist, admin, expired session and request failure in
both VI and DE. Unknown/loading/error states must not claim the visitor is signed
out. Header, mobile menu and account page must agree. Revalidate after returning
from another page/tab; a late response must not undo logout. Role shortcuts are
presentation only; server authorization remains authoritative.

Check each shared change in desktop and mobile, open/closed navigation and
keyboard focus. Account identity is text, navigation actions have visible labels,
and logout is the native icon action with an accessible name and tooltip. Avoid adding
page-specific versions of these controls. Tests of the shared state matrix guard
against recurrence; no claim of a full visual audit without observing those views.

The staff interface uses Vietnamese, including native collection actions, search,
dates and upload labels. Browser language and old locale cookies must not switch
only part of the console to English. Public VI/DE content is independent.
Custom views use native Gutter and SetStepNav, with headings and breadcrumbs from
pages.ts. Lists, document editors and custom pages share a 28px top inset (20px on
mobile). New AI authoring starts in the common article editor; direct sources
remain editable for existing records only.

# Luật Việt Đức — Admin dashboard

Operational CMS for Admin and Chuyên viên. Public-site styling is separate.

References: [microfeed CMS DESIGN.md](https://github.com/microfeed/microfeed/blob/main/DESIGN.md) and [tapflow dashboard DESIGN.md](https://github.com/raghubetina/tapflow-workshop-lab/blob/codex/workshop-seat-leases/packages/dashboard/DESIGN.md). This is our own palette and implementation.

## Visual foundations

- Dark canvas #10131b; sidebar #111722; panel #161c27; elevated panel #1d2532.
- Hairline border #2e3849; body #edf1f7; secondary text #a5b0c1.
- Accent #80a7ff for the selected destination, primary actions and keyboard focus.
- Inter throughout the admin. Body 14px/1.55, labels 12–13px, page title 26px/1.2 semibold. No oversized marketing typography.
- Spacing: 4, 8, 12, 16, 24, 32. Controls at least 40px high. Panel radius 12px; input/button radius 8px.

## Navigation

Desktop: 264px sidebar with identity, grouped destinations and active child links. Content occupies the remaining width. Child menus have a separate disclosure button.

At 1024px and below: a fixed 280px drawer, capped at viewport width minus 40px, inset 10px from the edges. Its header is the width of the drawer, never 100vw. A backdrop retains visible context and the native close/keyboard behavior. Choosing a destination closes the drawer. The page must not shift horizontally.

## Pages and states

Dashboard: real counts, role-appropriate shortcuts, truthful connection status. Missing counts show a dash; never invent chart data or activity.

Forms: readable labels, dark inputs, visible focus, explicit disabled/loading/error states. Keep native Payload saving, validation, access checks and dialogs.

Tables: compact rows, subtle horizontal rules, header/hover distinction, horizontal scroll on narrow screens. Do not force a wide table into a single phone column.

Settings, AI knowledge, backups, connection panels and specialist inbox share the same surface/text tokens. Security-sensitive actions retain their existing behavior.

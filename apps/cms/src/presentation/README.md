# Presentation modules

Edit these small source files rather than the generated public bundles.
`modules.json` defines concatenation order; fragments retain their surrounding JS scope.

- `editorial-ui-js`: partner strip, content helpers, homepage, video/counts and navigation lifecycle.
- `editorial-ui-css`: base, hero/header, partners, country links, topic cards, news/footer/responsive and application menu.
- `live-css`: shared shell, footer, account, connections, articles, responsive rules and chat.
- React chat markup remains in `modules/chat/Workspace.tsx`; application navigation in `modules/shared/Header.tsx`.

Stage intended source edits, then run from the repository root:

```sh
bash ops/deploy/publish.sh "fix(ui): describe the change"
```

This assembles and commits the tracked public bundles and pushes the current project branch. It runs no local tests or preview and does not connect to the VPS. GitHub performs the required checks; the existing server-owned release service handles backup, candidate validation and promotion. CI rejects stale generated bundles, preserving the release service's existing content hash contract. Deployment policy and schema changes still require their separate reviewed path.

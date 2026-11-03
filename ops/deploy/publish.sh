#!/usr/bin/env bash
# Caller stages the intended changes first. No local tests, preview, or VPS access.
set -euo pipefail
cd "$(dirname "$0")/../.."
if [[ $# -lt 1 || $# -gt 2 || -z "$1" ]]; then
  echo 'Usage: bash ops/deploy/publish.sh "commit message" [patch|minor|major]' >&2
  exit 1
fi
node apps/cms/scripts/bump-site-version.mjs "${2:-patch}"
node apps/cms/scripts/assemble-presentation.mjs
git add apps/cms/public/editorial-ui.js apps/cms/public/editorial-ui.css apps/cms/public/live.css
git commit -m "$1"
git push origin HEAD:feat/platform-cms-bootstrap

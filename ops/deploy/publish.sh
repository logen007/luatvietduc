#!/usr/bin/env bash
# Caller stages the intended changes first. No local tests, preview, or VPS access.
set -euo pipefail
cd "$(dirname "$0")/../.."
prepare_only=false
if [[ ${1:-} == --prepare-only ]]; then
  prepare_only=true
  shift
fi
if [[ $# -lt 1 || $# -gt 2 || -z "$1" ]]; then
  echo 'Usage: bash ops/deploy/publish.sh [--prepare-only] "commit message" [patch|minor|major]' >&2
  exit 1
fi
node apps/cms/scripts/bump-site-version.mjs "${2:-patch}"
node apps/cms/scripts/assemble-presentation.mjs
git add apps/cms/public/admin-theme.css apps/cms/public/customer-chat.css apps/cms/public/specialist-inbox.css apps/cms/public/editorial-ui.js apps/cms/public/editorial-ui.css apps/cms/public/live.css apps/cms/public/legal-runtime.js
git commit -m "$1"
if [[ "$prepare_only" == false ]]; then
  git push origin HEAD:feat/platform-cms-bootstrap
fi

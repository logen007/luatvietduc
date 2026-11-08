import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

const bundles = ['admin-theme.css', 'customer-chat.css', 'specialist-inbox.css', 'design-system.css', 'live.css', 'editorial-ui.css', 'live-bridge.js', 'editorial-ui.js', 'legal-runtime.js'];
let cached;
// Resolve one immutable release, then reuse its digest until files change. The
// metadata check also catches local edits without retaining old release caches.
export function getPresentationVersion(publicDirectory) {
  const root = realpathSync(publicDirectory);
  const signature = JSON.stringify([root, ...bundles.map(file => {
    const stat = statSync(path.join(root, file));
    return [stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs];
  })]);
  if (cached?.signature === signature) return cached.version;
  const hash = createHash('sha256');
  for (const file of bundles) {
    hash.update(file).update(readFileSync(path.join(root, file)));
  }
  const version = hash.digest('hex').slice(0, 12);
  cached = {signature, version};
  return version;
}

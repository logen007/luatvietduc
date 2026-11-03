import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Public files need a content revision because the CDN caches their stable paths.
const revisions = new Map();
export function getPresentationVersion(publicDirectory) {
  if (!revisions.has(publicDirectory)) {
    const hash = createHash('sha256');
    for (const file of ['design-system.css', 'live.css', 'editorial-ui.css', 'live-bridge.js', 'editorial-ui.js', 'legal-runtime.js']) {
      hash.update(file).update(readFileSync(path.join(publicDirectory, file)));
    }
    revisions.set(publicDirectory, hash.digest('hex').slice(0, 12));
  }
  return revisions.get(publicDirectory);
}

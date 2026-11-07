import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Re-read small public bundles so a presentation switch changes app CSS URLs too.
export function getPresentationVersion(publicDirectory) {
  const hash = createHash('sha256');
  for (const file of ['admin-theme.css', 'customer-chat.css', 'specialist-inbox.css', 'design-system.css', 'live.css', 'editorial-ui.css', 'live-bridge.js', 'editorial-ui.js', 'legal-runtime.js']) {
    hash.update(file).update(readFileSync(path.join(publicDirectory, file)));
  }
  return hash.digest('hex').slice(0, 12);
}

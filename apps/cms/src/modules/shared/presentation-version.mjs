import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

const bundles = ['admin-theme.css', 'customer-chat.css', 'specialist-inbox.css', 'design-system.css', 'live.css', 'editorial-ui.css', 'live-bridge.js', 'editorial-ui.js', 'legal-runtime.js'];
const allowedFiles=new Set([...bundles,'fonts/inter.css']);
const cached=new Map();
let cachedRoot;
// Resolve one immutable release, then reuse its digest until files change. The
// metadata check also catches local edits without retaining old release caches.
// A caller may fingerprint one asset so editing inbox CSS does not invalidate
// unchanged public CSS, fonts, chat preloads or scripts. Default digest is stable
// for the legacy renderer; only known public presentation assets are accepted.
export function getPresentationVersion(publicDirectory, files=bundles) {
  if(!files.length||files.some(file=>!allowedFiles.has(file)))throw Error('Unknown presentation asset');
  const root = realpathSync(publicDirectory);
  if(cachedRoot!==root){cached.clear();cachedRoot=root;}
  const key=files.join('\n');
  const signature = JSON.stringify([root, ...files.map(file => {
    const stat = statSync(path.join(root, file));
    return [stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs];
  })]);
  const previous=cached.get(key);
  if (previous?.signature === signature) return previous.version;
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file).update(readFileSync(path.join(root, file)));
  }
  const version = hash.digest('hex').slice(0, 12);
  if(cached.size>=32&&!cached.has(key))cached.delete(cached.keys().next().value);
  cached.set(key,{signature, version});
  return version;
}

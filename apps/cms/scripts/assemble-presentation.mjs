import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../src/presentation/', import.meta.url));
const output = fileURLToPath(new URL('../public/', import.meta.url));
const modules = JSON.parse(readFileSync(path.join(root, 'modules.json'), 'utf8'));
for (const [bundle, parts] of Object.entries(modules)) {
  const content = parts.map(part => readFileSync(path.join(root, part), 'utf8')).join('');
  const target = path.join(output, bundle);
  if (readFileSync(target, 'utf8') !== content) {
    if (process.env.CI) throw new Error(`Regenerate and commit public/${bundle} with assemble-presentation.mjs`);
    writeFileSync(target, content);
  }
}

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

const file = 'apps/cms/src/modules/shared/site-version.json';
const mode = process.argv[2] || 'patch';
if (!['patch', 'minor', 'major'].includes(mode)) throw new Error('Version mode must be patch, minor or major');
// The first release introduces 01.00.00; subsequent publishes increase it.
if (spawnSync('git', ['cat-file', '-e', `HEAD:${file}`], { stdio: 'ignore' }).status === 0) {
  const previous = JSON.parse(execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8' })).version;
  if (!/^\d{2}\.\d{2}\.\d{2}$/.test(previous)) throw new Error('Expected version xx.xx.xx');
  let [major, minor, patch] = previous.split('.').map(Number);
  if (mode === 'major') { major++; minor = 0; patch = 0; }
  else if (mode === 'minor') { minor++; patch = 0; }
  else patch++;
  if (patch > 99) { patch = 0; minor++; }
  if (minor > 99) { minor = 0; major++; }
  if (major > 99) throw new Error('Version exceeds xx.xx.xx');
  const version = [major, minor, patch].map(n => String(n).padStart(2, '0')).join('.');
  writeFileSync(file, JSON.stringify({ version }, null, 2) + '\n');
}
execFileSync('git', ['add', file]);
console.log(`Site version: ${JSON.parse(readFileSync(file, 'utf8')).version}`);

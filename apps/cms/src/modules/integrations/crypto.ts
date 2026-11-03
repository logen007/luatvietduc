import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import type { Provider, Values } from './catalog';
function key(secret: string) {
  if (secret.length < 24) throw new Error('Encryption key unavailable');
  return Buffer.from(hkdfSync('sha256', secret, 'lvd-integrations-v1', 'server-side-secrets', 32));
}
export function seal(provider: Provider, values: Values, secret = process.env.PAYLOAD_SECRET || '') {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(secret), iv);
  cipher.setAAD(Buffer.from(provider));
  const data = Buffer.concat([cipher.update(JSON.stringify(values), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}
export function unseal(provider: Provider, value: string, secret = process.env.PAYLOAD_SECRET || ''): Values {
  const [version, iv, tag, data, extra] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !data || extra) throw new Error('Invalid encrypted configuration');
  const decipher = createDecipheriv('aes-256-gcm', key(secret), Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from(provider)); decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8'));
}

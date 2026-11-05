import { integrationCatalog, type Provider, type Values } from './catalog';
import {isAdmin} from '../identity/permissions';
import {isOtherProviderKey,translationModel,translationVendor} from './translation-policy';
export class IntegrationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function requireOwner(user: { role?: string } | null | undefined) {
  if (!isAdmin(user)) throw new IntegrationError(403, 'Chỉ chủ hệ thống được cấu hình kết nối.');
}
export function mergeValues(provider: Provider, previous: Values, input: unknown): Values {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new IntegrationError(400, 'Thông tin không hợp lệ.');
  // Credentials from the previous provider must never be sent to Google.
  if (provider === 'translation' && previous.vendor !== translationVendor) previous = {};
  const result: Values = {};
  for (const field of integrationCatalog[provider].fields) {
    const value = (input as Record<string, unknown>)[field.key];
    if (value !== undefined && typeof value !== 'string') throw new IntegrationError(400, 'Giá trị phải là văn bản.');
    const clean = typeof value === 'string' ? value.trim() : '';
    if (clean.length > 4096 || /[\r\n\0]/.test(clean)) throw new IntegrationError(400, 'Giá trị có ký tự hoặc độ dài không hợp lệ.');
    result[field.key] = field.secret && !clean ? previous[field.key] || '' : clean;
  }
  if (provider === 'translation') {result.vendor = translationVendor;result.model ||= translationModel;}
  validateValues(provider, result);
  return result;
}
export function validateValues(provider: Provider, v: Values) {
  const invalid = (message: string): never => { throw new IntegrationError(400, message); };
  for (const field of integrationCatalog[provider].fields) if (!v[field.key] && !('optional' in field && field.optional)) invalid('Vui lòng điền ' + field.label + '.');
  if (['google','drive'].includes(provider) && !/^[\w.-]+\.apps\.googleusercontent\.com$/.test(v.clientId)) invalid('Client ID Google không đúng định dạng.');
  if (provider === 'drive' && !/^age1[0-9a-z]{58}$/.test(v.ageRecipient)) invalid('Nhập khóa age công khai hợp lệ; không nhập khóa khôi phục bí mật ở đây.');
  if (['ai','translation'].includes(provider) && !/^[a-zA-Z0-9][a-zA-Z0-9.-]{0,99}$/.test(v.model)) invalid('Tên model không hợp lệ; chỉ nhập tên, không nhập URL.');
  if (provider === 'translation' && (v.vendor !== translationVendor || v.model !== translationModel || isOtherProviderKey(v.apiKey))) invalid('Dùng khóa Google AI Studio và model Gemini 3.1 Flash-Lite. Khóa Cursor/xAI không dùng được ở đây.');
  if (provider === 'r2') {
    let url: URL; try { url = new URL(v.endpoint); } catch { return invalid('Endpoint R2 không hợp lệ.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !/^[a-f0-9]{32}(?:\.eu|\.fedramp)?\.r2\.cloudflarestorage\.com$/.test(url.hostname) || !['', '/'].includes(url.pathname) || url.search || url.hash) invalid('Chỉ dùng HTTPS endpoint chính thức của Cloudflare R2.');
    if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(v.bucket)) invalid('Tên bucket R2 không hợp lệ.');
  }
  if (provider === 'email' && !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(v.fromAddress)) invalid('Địa chỉ gửi không hợp lệ.');
  if (provider === 'email' && v.contactTo && !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(v.contactTo)) invalid('Nhập một email nhận liên hệ hợp lệ.');
}

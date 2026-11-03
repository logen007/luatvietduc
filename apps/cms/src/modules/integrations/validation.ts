import { integrationCatalog, type Provider, type Values } from './catalog';
export class IntegrationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function requireOwner(user: { role?: string } | null | undefined) {
  if (user?.role !== 'owner') throw new IntegrationError(403, 'Chỉ chủ hệ thống được cấu hình kết nối.');
}
export function mergeValues(provider: Provider, previous: Values, input: unknown): Values {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new IntegrationError(400, 'Thông tin không hợp lệ.');
  const result: Values = {};
  for (const field of integrationCatalog[provider].fields) {
    const value = (input as Record<string, unknown>)[field.key];
    if (value !== undefined && typeof value !== 'string') throw new IntegrationError(400, 'Giá trị phải là văn bản.');
    const clean = typeof value === 'string' ? value.trim() : '';
    if (clean.length > 4096 || /[\r\n\0]/.test(clean)) throw new IntegrationError(400, 'Giá trị có ký tự hoặc độ dài không hợp lệ.');
    result[field.key] = field.secret && !clean ? previous[field.key] || '' : clean;
  }
  validateValues(provider, result);
  return result;
}
export function validateValues(provider: Provider, v: Values) {
  const invalid = (message: string): never => { throw new IntegrationError(400, message); };
  for (const field of integrationCatalog[provider].fields) if (!v[field.key] && !('optional' in field && field.optional)) invalid('Vui lòng điền ' + field.label + '.');
  if (['google','drive'].includes(provider) && !/^[\w.-]+\.apps\.googleusercontent\.com$/.test(v.clientId)) invalid('Client ID Google không đúng định dạng.');
  if (provider === 'drive' && !/^age1[0-9a-z]{58}$/.test(v.ageRecipient)) invalid('Nhập khóa age công khai hợp lệ; không nhập khóa khôi phục bí mật ở đây.');
  if (provider === 'ai' && !/^[a-zA-Z0-9][a-zA-Z0-9.-]{0,99}$/.test(v.model)) invalid('Tên model không hợp lệ; chỉ nhập tên, không nhập URL.');
  if (provider === 'r2') {
    let url: URL; try { url = new URL(v.endpoint); } catch { return invalid('Endpoint R2 không hợp lệ.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !/^[a-f0-9]{32}(?:\.eu|\.fedramp)?\.r2\.cloudflarestorage\.com$/.test(url.hostname) || !['', '/'].includes(url.pathname) || url.search || url.hash) invalid('Chỉ dùng HTTPS endpoint chính thức của Cloudflare R2.');
    if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(v.bucket)) invalid('Tên bucket R2 không hợp lệ.');
  }
  if (provider === 'email' && !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(v.fromAddress)) invalid('Địa chỉ gửi không hợp lệ.');
  if (provider === 'email' && v.contactTo && !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(v.contactTo)) invalid('Nhập một email nhận liên hệ hợp lệ.');
}

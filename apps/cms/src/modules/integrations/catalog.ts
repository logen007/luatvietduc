export const integrationCatalog = {
  google: { title: 'Đăng nhập Google', help: 'Tạo OAuth Client loại Web application trong Google Cloud.', fields: [
    { key: 'clientId', label: 'Client ID', secret: false, placeholder: '…apps.googleusercontent.com' },
    { key: 'clientSecret', label: 'Client Secret', secret: true, placeholder: '' },
  ] },
  ai: { title: 'AI · Google Gemini', help: 'Dùng để thử nội bộ với nguồn công khai. Không tự bật trả lời khách.', fields: [
    { key: 'apiKey', label: 'API key', secret: true, placeholder: '' },
    { key: 'model', label: 'Tên model', secret: false, placeholder: 'Tên model trong tài khoản Google AI của anh' },
  ] },
  r2: { title: 'Lưu tệp · Cloudflare R2', help: 'Dùng bucket riêng tư và khóa S3 chỉ có quyền trên bucket này.', fields: [
    { key: 'endpoint', label: 'S3 endpoint', secret: false, placeholder: 'https://<account-id>.r2.cloudflarestorage.com' },
    { key: 'bucket', label: 'Tên bucket', secret: false, placeholder: '' },
    { key: 'accessKeyId', label: 'Access Key ID', secret: true, placeholder: '' },
    { key: 'secretAccessKey', label: 'Secret Access Key', secret: true, placeholder: '' },
  ] },
  email: { title: 'Gửi email · Resend', help: 'Tạo API key và xác minh tên miền gửi tại Resend. Kiểm tra sẽ gửi một email đến chính tài khoản chủ hệ thống.', fields: [
    { key: 'apiKey', label: 'API key', secret: true, placeholder: '' },
    { key: 'fromAddress', label: 'Địa chỉ gửi đã xác minh', secret: false, placeholder: 'lienhe@luatvietduc.com' },
    { key: 'fromName', label: 'Tên người gửi', secret: false, placeholder: 'Luật Việt Đức' },
  ] },
} as const;
export type Provider = keyof typeof integrationCatalog;
export type Values = Record<string, string>;
export function isProvider(value: unknown): value is Provider {
  return typeof value === 'string' && Object.hasOwn(integrationCatalog, value);
}

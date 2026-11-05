export const integrationCatalog = {
  drive: { title: 'Google Drive · Sao lưu', help: 'Dùng OAuth riêng cho sao lưu, khóa age công khai và thư mục riêng của Luật Việt Đức. Lưu thay đổi ở đây sẽ yêu cầu kết nối lại tài khoản Drive.', fields: [
    {key:'clientId',label:'OAuth Client ID cho sao lưu',secret:false,placeholder:'…apps.googleusercontent.com'},
    {key:'clientSecret',label:'OAuth Client Secret',secret:true,placeholder:''},
    {key:'ageRecipient',label:'Khóa age công khai để mã hóa',secret:false,placeholder:'age1…'},
  ] },
  google: { title: 'Đăng nhập Google', help: 'Tạo OAuth Client loại Web application trong Google Cloud.', fields: [
    { key: 'clientId', label: 'Client ID', secret: false, placeholder: '…apps.googleusercontent.com' },
    { key: 'clientSecret', label: 'Client Secret', secret: true, placeholder: '' },
  ] },
  ai: { title: 'AI · Google Gemini', help: 'Dùng bài viết được bật cho AI và kho kiến thức riêng để lập chỉ mục. Chỉ xử lý câu hỏi khách đã xác nhận gửi qua thông báo tại ô chat; không gửi giấy tờ hay hồ sơ nhạy cảm. Sau khi kiểm tra và bật kết nối, quản lý trợ lý cho khách trong Cài đặt website → AI & kho FAQ.', fields: [
    { key: 'apiKey', label: 'API key', secret: true, placeholder: '' },
    { key: 'model', label: 'Model (để trống để tự chọn)', secret: false, placeholder: 'Tự chọn model Flash phù hợp từ Google' },
  ] },
  translation: { title: 'Dịch bài viết · Grok', help: 'Khóa xAI riêng cho dịch Việt–Đức. Chỉ dịch khi bấm Dịch bằng AI.', fields: [
    { key: 'apiKey', label: 'API key xAI', secret: true, placeholder: '' },
    { key: 'model', label: 'Model (để trống để tự chọn)', secret: false, placeholder: 'Tự chọn Grok phù hợp với khóa' },
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
    { key: 'contactTo', label: 'Hộp thư nhận form Liên hệ (để trống: email chủ hệ thống)', secret: false, optional: true, placeholder: 'Email nhận liên hệ' },
  ] },
} as const;
export type Provider = keyof typeof integrationCatalog;
export type Values = Record<string, string>;
export function isProvider(value: unknown): value is Provider {
  return typeof value === 'string' && Object.hasOwn(integrationCatalog, value);
}

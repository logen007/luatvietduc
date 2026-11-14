// Only fixed result codes cross the OAuth redirect; never provider responses,
// authorization codes, credentials or tokens.
export const driveOAuthErrors={
 setup:'Lưu cấu hình Drive trước khi kết nối.',
 session:'Phiên đăng nhập đã hết hạn. Đăng nhập lại rồi kết nối Drive.',
 state:'Lượt kết nối không còn hợp lệ. Bấm Kết nối Google Drive để bắt đầu lại.',
 expired:'Lượt kết nối đã hết hạn. Bấm Kết nối Google Drive để bắt đầu lại.',
 changed:'Cấu hình đã thay đổi khi đang kết nối. Tải lại trang rồi kết nối Drive.',
 denied:'Chưa cấp quyền Drive. Kết nối lại và bấm Cho phép trên Google.',
 client:'Google không chấp nhận Client ID hoặc Client Secret. Kiểm tra cặp thông tin của OAuth Client dùng cho sao lưu.',
 redirect:'Redirect URI chưa khớp. Thêm đúng địa chỉ callback hiển thị bên dưới vào OAuth Client.',
 grant:'Google không chấp nhận lượt kết nối này. Bấm Kết nối Google Drive để bắt đầu lại.',
 refresh:'Google chưa cấp quyền truy cập ngoại tuyến. Kết nối lại và bấm Cho phép.',
 scope:'Chưa được cấp quyền lưu tệp Drive. Kết nối lại và cho phép ứng dụng tạo tệp.',
 api:'Google Drive API chưa được bật cho dự án của OAuth Client. Bật API rồi kết nối lại.',
 permission:'Google từ chối tạo thư mục sao lưu. Kiểm tra quyền Drive và chính sách tài khoản Google.',
 quota:'Google Drive đã hết dung lượng hoặc đang giới hạn yêu cầu. Kiểm tra Drive rồi thử lại.',
 folder:'Chưa tạo được thư mục sao lưu trên Drive. Thử kết nối lại sau.',
 google:'Chưa hoàn tất kết nối với Google. Thử kết nối lại sau.',
 save:'Chưa lưu được quyền Drive. Kết nối lại và giữ nguyên cấu hình trong lúc Google đang mở.',
 unknown:'Chưa kết nối được Drive. Bấm Kết nối Google Drive để thử lại.',
} as const;
export type DriveOAuthError=keyof typeof driveOAuthErrors;
export function driveOAuthMessage(result:string|null,reason:string|null){
 if(result!=='failed')return null;
 return driveOAuthErrors[reason&&Object.hasOwn(driveOAuthErrors,reason)?reason as DriveOAuthError:'unknown'];
}
export function tokenFailure(error:unknown):DriveOAuthError{
 if(error==='invalid_client')return 'client';
 if(error==='redirect_uri_mismatch')return 'redirect';
 if(error==='invalid_grant')return 'grant';
 if(error==='access_denied')return 'denied';
 if(error==='invalid_scope')return 'scope';
 return 'google';
}
export function folderFailure(body:unknown,status:number):DriveOAuthError{
 const error=(body as {error?:{errors?:unknown;details?:unknown}}|null)?.error;
 const reasons=[error?.errors,error?.details].flatMap(items=>Array.isArray(items)?items.map(item=>item?.reason):[]);
 if(reasons.some(reason=>['accessNotConfigured','SERVICE_DISABLED','serviceDisabled'].includes(reason)))return 'api';
 if(status===429||reasons.some(reason=>['storageQuotaExceeded','rateLimitExceeded','userRateLimitExceeded'].includes(reason)))return 'quota';
 if(status===401||status===403)return 'permission';
 return 'folder';
}

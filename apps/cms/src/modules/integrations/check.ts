import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import type { Provider, Values } from './catalog';
import { validateValues } from './validation';
export function r2Client(v: Values) {
  validateValues('r2', v);
  return new S3Client({ region: 'auto', endpoint: v.endpoint, forcePathStyle: true,
    credentials: { accessKeyId: v.accessKeyId, secretAccessKey: v.secretAccessKey }, maxAttempts: 1 });
}
export async function checkConnection(provider: Provider, v: Values, email: string) {
  validateValues(provider, v);
  if (provider === 'drive') {
    const {driveAccess} = await import('../backup/google');
    if(!v.refreshToken||!v.folderId)return {state:'failed',message:'Hãy kết nối tài khoản Google Drive trước khi kiểm tra.'};
    const token=await driveAccess(v);
    const response=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(v.folderId)+'?fields=id,mimeType,trashed',{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(10000)});
    const folder=response.ok?await response.json():null;
    return folder?.mimeType==='application/vnd.google-apps.folder'&&!folder.trashed?{state:'passed',message:'Đọc được thư mục sao lưu riêng trên Drive.'}:{state:'failed',message:'Không truy cập được thư mục sao lưu.'};
  }
  if (provider === 'google') return { state: 'configured', message: 'Định dạng hợp lệ. Sau khi bật, đăng nhập Google để xác nhận Client Secret, màn hình đồng ý và redirect URI.' };
  if (provider === 'translation') {
    const response=await fetch('https://api.groq.com/openai/v1/models',{headers:{Authorization:'Bearer '+v.apiKey},signal:AbortSignal.timeout(10000),redirect:'error',cache:'no-store'});
    if(!response.ok)return {state:'failed',message:response.status===401||response.status===403?'Khóa Groq chưa hợp lệ hoặc chưa có quyền truy cập.':response.status===429?'Groq đang giới hạn lượt truy cập. Thử lại sau.':'Chưa truy cập được Groq. Kiểm tra khóa và quyền truy cập model.'};
    try{
      const reader=response.body?.getReader(),decoder=new TextDecoder();let bytes=0,text='';
      if(reader)for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>256000){await reader.cancel();throw new Error('Model listing exceeds limit');}text+=decoder.decode(part.value,{stream:true});}
      const listing=JSON.parse(text+decoder.decode());
      if(!Array.isArray(listing?.data)||!listing.data.some((model:any)=>model?.id===v.model&&model.active===true))return {state:'failed',message:'Khóa này chưa truy cập được model dịch đang chọn. Hệ thống không tự đổi model.'};
      return {state:'passed',message:'Khóa Groq và model truy cập được. Chưa gửi bài để dịch; dùng tài khoản ở gói Free.'};
    }catch{return {state:'failed',message:'Chưa đọc được danh sách model Groq. Thử lại sau.'};}
  }
  if (provider === 'ai') {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(v.model), {
      headers: { 'x-goog-api-key': v.apiKey }, signal: AbortSignal.timeout(10000), redirect: 'error', cache: 'no-store' });
    if (!response.ok) return { state: 'failed', message: 'Chưa truy cập được API hoặc model. Kiểm tra khóa, model và quyền trong tài khoản Google AI.' };
    return { state: 'passed', message: 'API key và model truy cập được. Chưa kiểm tra hạn mức tạo nội dung; AI cho khách vẫn tắt.' };
  }
  if (provider === 'r2') {
    const client = r2Client(v);
    try { await client.send(new HeadBucketCommand({ Bucket: v.bucket }), { abortSignal: AbortSignal.timeout(10000) }); }
    finally { client.destroy(); }
    return { state: 'passed', message: 'Truy cập bucket thành công. Không tải lên hay xóa tệp khi kiểm tra.' };
  }
  const response = await fetch('https://api.resend.com/emails', { method:'POST',
    headers: { Authorization: 'Bearer ' + v.apiKey, 'content-type':'application/json' },
    body: JSON.stringify({ from: `${v.fromName} <${v.fromAddress}>`, to:[email], subject:'Kiểm tra kết nối Luật Việt Đức', text:'Đây là email kiểm tra do chủ hệ thống yêu cầu từ trang Kết nối.' }),
    redirect:'error', signal:AbortSignal.timeout(10000) });
  if (!response.ok) return { state:'failed', message:'Resend chưa chấp nhận email. Kiểm tra API key, tên miền gửi đã xác minh và hạn mức.' };
  return { state:'passed', message:'Resend đã nhận email kiểm tra gửi đến tài khoản của anh. Hãy kiểm tra hộp thư; chưa xác nhận thư đã đến.' };
}

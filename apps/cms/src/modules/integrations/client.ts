import {invalidatePublicSession} from '../shared/session-client';
import type {Values} from './catalog';
// Refresh public fields without losing an edited value or accepting a secret
// from the response. Secret inputs belong only to the current component draft.
export function mergeConnectionDraft(original:Values,draft:Values,fresh:Values,fields:readonly {key:string;secret:boolean}[]):Values{
 const values:Values={};
 for(const field of fields){
  const entered=draft[field.key]||'';
  if(field.secret){if(entered)values[field.key]=entered;}
  else values[field.key]=entered!==(original[field.key]||'')?entered:fresh[field.key]||'';
 }
 return values;
}
export class ConnectionError extends Error{
 constructor(message:string,readonly status=0){super(message);this.name='ConnectionError';}
}
export async function requestConnection(data?:unknown){
 let response:Response;
 try{response=await fetch('/service/integrations',{method:data?'POST':'GET',cache:'no-store',signal:AbortSignal.timeout(data?45000:15000),headers:data?{'content-type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined});}
 catch{throw new ConnectionError(data?'Chưa xác nhận được kết quả. Tải lại trang để kiểm tra cấu hình trước khi thử lại.':'Chưa kết nối được. Kiểm tra mạng rồi thử lại.');}
 const body=await response.json().catch(()=>null);
 if(!response.ok){if(typeof window!=='undefined'&&[401,403].includes(response.status))invalidatePublicSession();throw new ConnectionError(response.status===401?'Phiên đăng nhập đã hết. Đăng nhập lại để tiếp tục.':response.status===403?'Tài khoản chưa có quyền quản lý kết nối.':body?.error||'Dịch vụ đang gián đoạn. Vui lòng thử lại.',response.status);}
 if(!body||(!data&&!Array.isArray(body.connections))||(data&&!body.connection))throw new ConnectionError(data?'Chưa xác nhận được kết quả. Tải lại trang để kiểm tra cấu hình trước khi thử lại.':'Chưa đọc được cấu hình. Vui lòng thử lại.');
 return body;
}

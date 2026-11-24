import type {Attachment} from './contracts';

// Bound both the request and its response body. An interrupted upload has an
// unknown result, so this transport never retries or claims an attachment.
export async function uploadChatAttachment(conversation:string,file:File,signal:AbortSignal):Promise<Attachment>{
 const request=new AbortController(),abort=()=>request.abort(signal.reason);
 const timer=setTimeout(()=>request.abort(),90000);
 if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
 let response:Response,value:Partial<Attachment>&{error?:string};
 try{
  request.signal.throwIfAborted();
  response=await fetch(`/service/conversations/${conversation}/files`,{method:'POST',headers:{'content-type':'application/octet-stream','x-file-name':encodeURIComponent(file.name)},body:file,signal:request.signal});
  value=await response.json();
  request.signal.throwIfAborted();
 }catch{
  throw new Error('Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.');
 }finally{
  clearTimeout(timer);signal.removeEventListener('abort',abort);
 }
 if(!response.ok)throw new Error(value?.error||'Chưa tải được tệp.');
 // A 2xx status alone does not establish a usable attachment. Keep malformed
 // or unrelated response data out of both the composer and account handoff.
 if(!value||typeof value!=='object'||typeof value.id!=='string'||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value.id)||typeof value.name!=='string'||!value.name.length||value.name.length>180||typeof value.size!=='number'||!Number.isSafeInteger(value.size)||value.size<1||value.size>10*1024*1024||typeof value.mimeType!=='string'||!value.mimeType.length||value.mimeType.length>100||value.url!=='/service/chat-files/'+value.id)throw new Error('Không thể đọc phản hồi của dịch vụ. Vui lòng thử lại.');
 return {id:value.id,name:value.name,size:value.size,mimeType:value.mimeType,url:value.url};
}

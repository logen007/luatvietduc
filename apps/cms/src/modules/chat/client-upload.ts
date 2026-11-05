import type {Attachment} from './contracts';

// Bound both the request and its response body. An interrupted upload has an
// unknown result, so this transport never retries or claims an attachment.
export async function uploadChatAttachment(conversation:string,file:File,signal:AbortSignal):Promise<Attachment>{
 const request=new AbortController(),abort=()=>request.abort(signal.reason);
 const timer=setTimeout(()=>request.abort(),90000);
 if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
 let response:Response,value:Attachment&{error?:string};
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
 return value;
}

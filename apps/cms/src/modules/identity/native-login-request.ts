import {HttpError} from '../http/errors';
import {requireSameOrigin} from '../http/request';

const maxBytes=8*1024;
const invalid=()=>new HttpError(400,'Nội dung đăng nhập không hợp lệ.');

async function boundedBody(request:Request){
 if(!request.body||request.bodyUsed||request.body.locked)throw invalid();
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   if(!(value instanceof Uint8Array))throw invalid();
   size+=value.byteLength;if(size>maxBytes)throw new HttpError(413,'Nội dung quá lớn.');
   chunks.push(value.slice());
  }
 }catch(error){
  // Consume the original stream directly. Cancellation must not hold up the
  // rejection if an upstream producer does not settle its cancellation hook.
  // Let a queued Web FormData pull finish before cancelling its encoder.
  await new Promise(resolve=>setTimeout(resolve,0));
  void reader.cancel().catch(()=>{});
  if(error instanceof HttpError)throw error;
  throw invalid();
 }finally{reader.releaseLock();}
 const body=new Uint8Array(size);let offset=0;
 for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
 return body;
}

export async function readNativeLoginRequest(request:Request):Promise<{email:string;forwarded:Request}>{
 requireSameOrigin(request);
 const contentType=request.headers.get('content-type')||'',type=contentType.split(';',1)[0].trim().toLowerCase();
 if(type!=='application/json'&&type!=='multipart/form-data')throw new HttpError(415,'Định dạng đăng nhập không hợp lệ.');
 const body=await boundedBody(request);let data:unknown;
 try{
  if(type==='application/json')data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body));
  else{
   const form=await new Response(body,{headers:{'content-type':contentType}}).formData(),payload=form.getAll('_payload');
   if(payload.length!==1||typeof payload[0]!=='string')throw invalid();
   data=JSON.parse(payload[0]);
  }
 }catch{throw invalid();}
 if(!data||typeof data!=='object'||Array.isArray(data)||typeof (data as Record<string,unknown>).email!=='string')throw invalid();
 // Admission and native auth must receive the same object. Forwarding raw
 // multipart bytes would let their different parsers disagree about identity.
 const headers=new Headers(request.headers);headers.set('content-type','application/json');headers.delete('content-length');
 return {email:(data as {email:string}).email,forwarded:new Request(request.url,{method:request.method,headers,body:JSON.stringify(data),signal:request.signal,credentials:request.credentials})};
}

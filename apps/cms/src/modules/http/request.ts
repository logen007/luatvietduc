import {HttpError} from './errors';
export function requireSameOrigin(req:Request){
 if(req.headers.get('origin')!==(process.env.APP_URL||'http://localhost:3000'))throw new HttpError(403,'Nguồn yêu cầu không hợp lệ.');
}
export async function readJsonRequest(req:Request,maxBytes=16000):Promise<Record<string,unknown>>{
 requireSameOrigin(req);
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw new HttpError(415,'Yêu cầu JSON.');
 const reader=req.body?.getReader(),decoder=new TextDecoder();let size=0,text='';
 if(reader)for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>maxBytes){await reader.cancel();throw new HttpError(413,'Nội dung quá lớn.');}text+=decoder.decode(part.value,{stream:true});}
 let data:unknown;
 try{data=JSON.parse(text||'{}');}catch{throw new HttpError(400,'JSON không hợp lệ.');}
 if(!data||typeof data!=='object'||Array.isArray(data))throw new HttpError(400,'Nội dung không hợp lệ.');
 return data as Record<string,unknown>;
}

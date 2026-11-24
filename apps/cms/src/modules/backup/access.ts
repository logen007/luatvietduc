import {getPayload} from 'payload';
import config from '@payload-config';
import {requireOwner,IntegrationError} from '../integrations/validation';
export async function backupOwner(req:Request){const payload=await getPayload({config});const {user}=await payload.auth({headers:req.headers});requireOwner(user);return user!;}
export async function backupInput(req:Request){
 if(req.headers.get('origin')!==(process.env.APP_URL||'http://localhost:3000'))throw new IntegrationError(403,'Nguồn yêu cầu không hợp lệ.');
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw new IntegrationError(415,'Yêu cầu JSON.');
 const reader=req.body?.getReader();let text='',size=0;const decoder=new TextDecoder();if(reader)for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>8192){await reader.cancel();throw new IntegrationError(413,'Nội dung quá lớn.');}text+=decoder.decode(chunk.value,{stream:true});}
 try{const data=JSON.parse(text);if(!data||typeof data!=='object'||Array.isArray(data))throw new Error();return data;}catch{throw new IntegrationError(400,'Nội dung không hợp lệ.');}
}

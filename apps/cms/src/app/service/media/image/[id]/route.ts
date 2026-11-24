import {getPayload,APIError} from 'payload';
import config from '@payload-config';
import {readJsonRequest} from '../../../../../modules/http/request';
import {HttpError} from '../../../../../modules/http/errors';
import {editMediaImage,mediaImageId,mediaOriginalResponse} from '../../../../../modules/storage/image-edit';
export const dynamic='force-dynamic';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
async function handle(request:Request,context:Context){
 try{
  const id=mediaImageId((await context.params).id),payload=await getPayload({config});
  if(request.method==='GET')return await mediaOriginalResponse(request,payload,id);
  return json({doc:await editMediaImage(request,payload,id,await readJsonRequest(request,8192))});
 }catch(error){
  if(error instanceof HttpError||error instanceof APIError)return json({error:error.message},error.status);
  return json({error:'Chưa xử lý được ảnh. Vui lòng thử lại.'},503);
 }
}
export const GET=handle;
export const POST=handle;

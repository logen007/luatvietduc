import {NextResponse} from 'next/server';
import type {Payload} from 'payload';
import {readJsonRequest} from '../http/request';
import {HttpError} from '../http/errors';
import {realPreviewIdentity} from './role-preview-auth';
import {ROLE_PREVIEW_COOKIE,ROLE_PREVIEW_SECONDS,readRolePreview,readRolePreviewExpires,signRolePreview} from './role-preview-token';
export async function rolePreviewRequest(request:Request,payload:Payload){
 const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 try{
  const user=await realPreviewIdentity(payload,request.headers);
  if(user?.collection!=='users'||user.role!=='owner')throw new HttpError(403,'Chỉ Admin cao nhất được thử vai trò.');
  if(request.method==='GET')return json({role:readRolePreview(Number(user.id),request.headers)||'owner',expiresAt:readRolePreviewExpires(Number(user.id),request.headers)});
  if(request.method!=='POST')return json({error:'Phương thức không hợp lệ.'},405);
  const data=await readJsonRequest(request,1024),role=data.role;
  if(role!=='owner'&&role!=='support'&&role!=='member')throw new HttpError(400,'Vai trò không hợp lệ.');
  const response=json({role});
  response.cookies.set(ROLE_PREVIEW_COOKIE,role==='owner'?'':signRolePreview(Number(user.id),role,request.headers),{httpOnly:true,secure:(process.env.APP_URL||'').startsWith('https:'),sameSite:'strict',path:'/',maxAge:role==='owner'?0:ROLE_PREVIEW_SECONDS});
  return response;
 }catch(error){return json({error:error instanceof HttpError?error.message:'Chưa chuyển được vai trò. Vui lòng thử lại.'},error instanceof HttpError?error.status:503);}
}

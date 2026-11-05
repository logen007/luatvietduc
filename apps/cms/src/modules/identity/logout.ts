import {createLocalReq,logoutOperation,type Payload} from 'payload';
import {NextResponse} from 'next/server';
import {pool,hash} from '../shared/db';
import {cookieValue} from './session';
import {requireSameOrigin} from '../http/request';
import {HttpError} from '../http/errors';

// Both public and native admin logout must revoke both authentication strategies.
export async function logoutRequest(request:Request,payload:Payload){
 const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 try{
  requireSameOrigin(request);
  const token=cookieValue(request.headers,'lvd-session');
  const localHeaders=new Headers(request.headers);
  // Google may win authentication when both cookies exist. Authenticate the local
  // credential independently so its server-side session cannot survive logout.
  localHeaders.set('cookie',(request.headers.get('cookie')||'').split(';').map(value=>value.trim()).filter(value=>!value.startsWith('lvd-session=')).join('; '));
  localHeaders.set('DisableAutologin','true');
  const {user}=await payload.auth({headers:localHeaders});
  if(user?.collection==='users'){
   const req=await createLocalReq({user,req:{headers:localHeaders}},payload);
   await logoutOperation({collection:payload.collections.users,req,allSessions:new URL(request.url).searchParams.get('allSessions')==='true'});
  }
  if(token&&token.length<=100)await pool.query('DELETE FROM lvd_sessions WHERE token_hash=$1',[await hash(token)]);
  const response=json({ok:true});
  for(const name of ['lvd-session','payload-token','lvd-oauth'])response.cookies.set(name,'',{httpOnly:true,secure:(process.env.APP_URL||'').startsWith('https:'),sameSite:'lax',path:'/',expires:new Date(0),maxAge:0});
  return response;
 }catch(error){
  return json({error:error instanceof HttpError?error.message:'Chưa đăng xuất được. Vui lòng thử lại.'},error instanceof HttpError?error.status:503);
 }
}

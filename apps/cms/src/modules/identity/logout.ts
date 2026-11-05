import {createLocalReq,logoutOperation,initTransaction,commitTransaction,killTransaction,type Payload} from 'payload';
import {NextResponse} from 'next/server';
import {cookieValue} from './session';
import {appSessionUser,revokeAppSession,revokeAppUserSessions,lockAccounts} from './app-sessions';
import {clearSessionCookies} from './session-cookies';
import {requireSameOrigin} from '../http/request';
import {HttpError} from '../http/errors';

export async function revokeBrowserSessions(request:Request,payload:Payload,allSessions=false){
  const token=cookieValue(request.headers,'lvd-session');
  const localHeaders=new Headers(request.headers);
  // Google may win authentication when both cookies exist. Authenticate the local
  // credential independently so its server-side session cannot survive logout.
  localHeaders.set('cookie',(request.headers.get('cookie')||'').split(';').map(value=>value.trim()).filter(value=>!value.startsWith('lvd-session=')).join('; '));
  localHeaders.set('DisableAutologin','true');
  const {user}=await payload.auth({headers:localHeaders});
  const googleUser=await appSessionUser(token);
  const accounts=[...(user?.collection==='users'?[Number(user.id)]:[]),...(googleUser?[googleUser]:[])];
  const req=await createLocalReq({req:{headers:localHeaders,user}},payload);
  await initTransaction(req);
  try{
   // Native logout reads/writes the user document. Lock before that read so it
   // cannot write an old role over a concurrent administrator change.
   await lockAccounts(req,accounts);
   if(user?.collection==='users')await logoutOperation({collection:payload.collections.users,req,allSessions});
   if(allSessions&&googleUser&&Number(user?.id)!==googleUser){
    // A verified Google-only caller can revoke the same account's native
    // sessions too; no local cookie is required for "all devices".
    const previousUser=req.user;
    try{
     const googleAccount=await payload.findByID({collection:'users',id:googleUser,overrideAccess:true,req});
     req.user={...googleAccount,collection:'users'};
     await logoutOperation({collection:payload.collections.users,req,allSessions:true});
    }finally{req.user=previousUser;}
   }
   if(allSessions){
    for(const id of new Set(accounts))await revokeAppUserSessions(id,req);
   }else await revokeAppSession(token,req);
   await commitTransaction(req);
  }catch(error){
   await killTransaction(req);throw error;
  }
}
// Both public and native admin logout must revoke both authentication strategies.
export async function logoutRequest(request:Request,payload:Payload){
 const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 try{
  requireSameOrigin(request);
  await revokeBrowserSessions(request,payload,new URL(request.url).searchParams.get('allSessions')==='true');
  const response=json({ok:true});
  clearSessionCookies(response);
  return response;
 }catch(error){
  return json({error:error instanceof HttpError?error.message:'Chưa đăng xuất được. Vui lòng thử lại.'},error instanceof HttpError?error.status:503);
 }
}

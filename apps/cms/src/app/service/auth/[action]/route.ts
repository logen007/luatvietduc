import {NextResponse} from 'next/server';
import {getPayload,APIError} from 'payload';
import config from '@payload-config';
import {accountActions,accountInput,type AccountAction} from '../../../../modules/identity/account-input';
import {accountEmail} from '../../../../modules/identity/account-email';
import {readJsonRequest} from '../../../../modules/http/request';
import {HttpError} from '../../../../modules/http/errors';
import {cookieValue} from '../../../../modules/identity/session';
import {linkGuestConversations} from '../../../../modules/chat/guest-account';
import {rateLimit} from '../../../../modules/chat/service';
import {activeValues} from '../../../../modules/integrations/store';
import {pool,hash} from '../../../../modules/shared/db';
import {setPasswordSession} from '../../../../modules/identity/session-cookies';
import {withPasswordLoginLock} from '../../../../modules/identity/password-login';
export const dynamic='force-dynamic';
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
export async function POST(req:Request,context:{params:Promise<{action:string}>}){
 try{
  const {action:raw}=await context.params;
  if(!accountActions.includes(raw as AccountAction))throw new HttpError(404,'Not found.');
  const action=raw as AccountAction,data=accountInput(action,await readJsonRequest(req,8000));
  const address=req.headers.get('cf-connecting-ip')||req.headers.get('x-real-ip')||'unknown';
  await rateLimit('account-global',60);await rateLimit('account-address:'+address,15);
  if(data.email)await rateLimit('account-email:'+action+':'+data.email,action==='login'?8:3);
  const payload=await getPayload({config}),{user:current}=await payload.auth({headers:req.headers});
  if(current)throw new HttpError(409,'You are already signed in.');
  const accountContext={accountLanguage:data.language,conversation:data.conversation};
  if(action==='register'||action==='resend'||action==='forgot'){
   if(!(await activeValues('email')))throw new HttpError(503,'Email is temporarily unavailable. Please try Google or try again later.');
   if(action==='forgot')await payload.forgotPassword({collection:'users',data:{email:data.email},context:accountContext});
   else{
    const found=await payload.find({collection:'users',where:{email:{equals:data.email}},limit:1,depth:0,overrideAccess:true,showHiddenFields:true});
    if(!found.docs.length&&action==='register')await payload.create({collection:'users',overrideAccess:true,context:{...accountContext,publicMember:true},data:{name:data.name,email:data.email,password:data.password,role:'member'}});
    else if(found.docs[0]){
     const user=found.docs[0] as typeof found.docs[0]&{_verified?:boolean;_verificationToken?:string};
     if(user._verified===false&&user._verificationToken){const mail=accountEmail('verify',user._verificationToken,accountContext);await payload.sendEmail({to:data.email,...mail});}
    }
   }
   // The same response is used for existing and unknown emails. No account,
   // verification token, password or authentication token is returned.
   return json({ok:true,state:action==='forgot'?'reset-email':'verification-email'},202);
  }
  if(action==='verify'){
   try{await payload.verifyEmail({collection:'users',token:data.token});}catch{throw new HttpError(400,'This link is invalid or has expired.');}
   return json({ok:true,state:'verified'});
  }
  if(action==='reset'){
   let result;
   try{result=await payload.resetPassword({collection:'users',data:{token:data.token,password:data.password},overrideAccess:true});}catch{throw new HttpError(400,'This link is invalid or has expired.');}
   // A valid reset link proves email ownership, including pending signups.
   const resetId=Number(result.user.id);if(!Number.isSafeInteger(resetId)||resetId<1)throw new HttpError(503,'Unable to complete this request. Please try again.');
   await payload.update({collection:'users',id:resetId,overrideAccess:true,context:{verifiedReset:true},data:{}});
   return json({ok:true,state:'password-reset'});
  }
  let login;
  try{login=await withPasswordLoginLock(data.email,()=>payload.login({collection:'users',data:{email:data.email,password:data.password},depth:0}));}catch(error){
   if(error instanceof APIError&&[409,503].includes(error.status))throw new HttpError(error.status,'Chưa đăng nhập được. Vui lòng thử lại.');
   throw new HttpError(401,'Email or password is incorrect, or your email has not been verified.');
  }
  if(!login.token||!login.user)throw new HttpError(503,'Unable to sign in. Please try again.');
  const guest=cookieValue(req.headers,'lvd-guest');
  if(guest&&/^[\w-]{43}$/.test(guest))await linkGuestConversations(Number(login.user.id),await hash(guest));
  const owns=data.conversation&&(await pool.query('SELECT id FROM lvd_conversations WHERE id=$1 AND user_id=$2',[data.conversation,login.user.id])).rowCount===1;
  const response=json({ok:true,redirectTo:owns?'/tro-chuyen?conversation='+encodeURIComponent(data.conversation):'/tai-khoan'});
  setPasswordSession(response,{token:login.token,exp:login.exp});
  return response;
 }catch(error){
  if(error instanceof HttpError)return json({error:error.message},error.status);
  console.error('Account operation failed',error instanceof Error?error.name:'Error');
  return json({error:'Unable to complete this request. Please try again.'},503);
 }
}

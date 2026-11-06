import {APIError,type CollectionBeforeOperationHook,type CollectionBeforeValidateHook,type CollectionBeforeChangeHook,type CollectionBeforeLoginHook} from 'payload';
import {sql} from '@payloadcms/db-postgres';
import {lockAccounts,revokeAppUserSessions,revokeAppSession} from './app-sessions';
import {cookieValue} from './session';
import pg from 'pg';
import {payloadTransaction} from '../shared/payload-transaction';
const shared=globalThis as unknown as {lvdLoginRevisionPool?:pg.Pool};
const revisionPool=shared.lvdLoginRevisionPool??=new pg.Pool({
 connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:1500,
 query_timeout:2000,idleTimeoutMillis:10000,allowExitOnIdle:true,
 application_name:'lvd-login-revision',
});
if(!revisionPool.listenerCount('error'))revisionPool.on('error',()=>{});
const resetting=new WeakSet<object>();
type LoginRevision={id:number;revision:string};
const loggingIn=new WeakMap<object,LoginRevision|undefined>();
async function loginRevision(id:number|null,email:string|null){
 // One committed snapshot covers everything native login writes back, including
 // child arrays. updatedAt alone cannot see native login/logout session changes.
 // Login already holds the user row here. Shared application transactions can
 // occupy every shared-pool connection while waiting on that row, so committed
 // snapshots need their own short, non-locking connection pool.
 try{return (await revisionPool.query<LoginRevision>(`SELECT u.id,jsonb_build_object(
  'row',u.xmin::text,
  'sessions',COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) FROM users_sessions s WHERE s._parent_id=u.id),'[]'::jsonb),
  'jurisdictions',COALESCE((SELECT jsonb_agg(to_jsonb(j) ORDER BY j.id) FROM users_jurisdictions j WHERE j.parent_id=u.id),'[]'::jsonb)
 )::text AS revision FROM users u WHERE u.id=$1 OR u.email=$2`,[id,email])).rows[0];}
 catch{throw new APIError('Chưa đăng nhập được. Vui lòng thử lại.',503);}
}
export const trackAccountOperation:CollectionBeforeOperationHook=async({operation,args,req})=>{
 if(operation==='resetPassword'){
  resetting.add(req);
  const token='data' in args&&typeof args.data?.token==='string'?args.data.token:'';
  if(!/^[a-f0-9]{40,128}$/i.test(token))throw new APIError('Token is either invalid or has expired.',403);
  await(await payloadTransaction(req)).execute(sql`SELECT id FROM users WHERE reset_password_token=${token} AND reset_password_expiration>now() ORDER BY id FOR UPDATE`);
 }else if(['create','update','login'].includes(operation))resetting.delete(req);
 if(operation==='update'&&('overrideAccess' in args&&args.overrideAccess||req.user?.role==='owner')){
  if('id' in args&&args.id){const id=Number(args.id);if(Number.isSafeInteger(id)&&id>0)await lockAccounts(req,[id]);}
  else if('where' in args&&args.where){
   const found=await req.payload.find({collection:'users',where:args.where,depth:0,pagination:false,limit:0,sort:'id',select:{name:true},overrideAccess:args.overrideAccess,req});
   const ids=found.docs.map(doc=>doc.id);await lockAccounts(req,ids);
   // Freeze the target set so newly matching rows cannot bypass these locks.
   args.where={and:[args.where,{id:{in:ids}}]};
  }
 }
 if(operation==='login'){
  const email='data' in args&&typeof args.data?.email==='string'?args.data.email.toLowerCase().trim():'';
  loggingIn.set(req,email?await loginRevision(null,email):undefined);
 }
 return args;
};
export const guardAccountLogin:CollectionBeforeLoginHook=async({req,user})=>{
 if(!loggingIn.has(req))return user;
 const before=loggingIn.get(req);loggingIn.delete(req);
 // Payload has already written the user inside its transaction. A separate
 // non-locking read still sees the preceding committed row, never our own write.
 // Any intervening change aborts that whole native write before a token escapes.
 const current=before&&before.id===Number(user.id)?await loginRevision(before.id,null):undefined;
 if(!before||!current||current.revision!==before.revision)throw new APIError('Tài khoản vừa thay đổi. Vui lòng đăng nhập lại.',409);
 return user;
};
// Payload resetPassword validates the reset token and hashes the new password
// before this hook, within the same transaction as its native session changes.
export const revokeResetSessions:CollectionBeforeValidateHook=async({operation,data,req})=>{
 if(operation==='update'&&resetting.has(req)&&data?.id&&data.hash&&data.salt){await revokeAppUserSessions(Number(data.id),req);if(req.context.verifiedReset===true)data._verified=true;resetting.delete(req);}
 return data;
};
export const revokeChangedCredentials:CollectionBeforeChangeHook=async({operation,data,originalDoc,req})=>{
 if(operation!=='update'||!originalDoc)return data;
 const password=typeof data.password==='string'&&Boolean(data.password),email=data.email!==undefined&&data.email!==originalDoc.email,unverified=data._verified===false&&originalDoc._verified!==false;
 if(password||email||unverified){
  await revokeAppUserSessions(Number(originalDoc.id),req);
  if(email||unverified)data.sessions=[];
 }
 return data;
};
export const retireGoogleSessionOnLogin=async({req}:{req:Parameters<CollectionBeforeChangeHook>[0]['req']})=>{
 await revokeAppSession(cookieValue(req.headers,'lvd-session'),req);
};

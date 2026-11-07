import {createHash} from 'node:crypto';
import pg from 'pg';
import {APIError,type CollectionBeforeChangeHook} from 'payload';
import {sql} from '@payloadcms/db-postgres';
import {payloadTransaction} from '../shared/payload-transaction';

const shared=globalThis as unknown as {lvdPasswordLoginPool?:pg.Pool};
const admissionPool=shared.lvdPasswordLoginPool??=new pg.Pool({
 connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:1500,
 query_timeout:2000,idleTimeoutMillis:10000,allowExitOnIdle:true,
 application_name:'lvd-password-login',
});
// pg removes failed idle clients itself; an idle error must not stop the app.
if(!admissionPool.listenerCount('error'))admissionPool.on('error',()=>{});
const lockKey=(value:string)=>createHash('sha256').update('lvd-password-login:'+value).digest().readBigInt64BE().toString();
const conflict=()=>new APIError('Đăng nhập đang được xử lý. Vui lòng thử lại.',409);
const unavailable=()=>new APIError('Chưa đăng nhập được. Vui lòng thử lại.',503);
const normalizeEmail=(value:unknown)=>typeof value==='string'?value.toLowerCase().trim():'';

export const guardPasswordLoginEmailMutation:CollectionBeforeChangeHook=async({operation,data,originalDoc,req})=>{
 const before=normalizeEmail(originalDoc?.email),after=normalizeEmail(data?.email);
 if(operation!=='create'&&(data?.email===undefined||before===after))return data;
 const emails=[...new Set([before,after].filter(Boolean))].sort();if(!emails.length)return data;
 const db=await payloadTransaction(req);
 // Nonblocking transaction locks cooperate with password admission's session
 // locks. Never wait here while the Payload update owns the account row.
 for(const email of emails){
  const key=lockKey('email:'+email),result=await db.execute(sql`SELECT pg_try_advisory_xact_lock(${key}::bigint) AS locked`);
  if(result.rows[0]?.locked!==true)throw conflict();
 }
 return data;
};

export async function withPasswordLoginLock<T>(email:string,callback:()=>Promise<T>):Promise<T>{
 let client:pg.PoolClient;
 try{client=await admissionPool.connect();}catch{throw unavailable();}
 const keys:string[]=[],normalized=normalizeEmail(email);let destroy=false,admitted=false;
 const broken=()=>{destroy=true;};client.on('error',broken);
 async function acquire(key:string){
  const result=await client.query<{locked:boolean}>('SELECT pg_try_advisory_lock($1::bigint) AS locked',[key]);
  if(!result.rows[0]?.locked)throw conflict();
  keys.push(key);
 }
 try{
  // Always retain the email key: a concurrent rename must not split requests
  // between an unknown-email key and the account's canonical ID key.
  await acquire(lockKey('email:'+normalized));
  const found=await client.query<{id:number}>('SELECT id FROM users WHERE email=$1',[normalized]);
  if(found.rows[0])await acquire(lockKey('user:'+found.rows[0].id));
  if(destroy)throw unavailable();
  admitted=true;
  return await callback();
 }catch(error){
  if(!admitted&&!(error instanceof APIError)){destroy=true;throw unavailable();}
  throw error;
 }finally{
  if(!destroy){
   for(const key of keys.reverse()){
    try{const result=await client.query<{unlocked:boolean}>('SELECT pg_advisory_unlock($1::bigint) AS unlocked',[key]);if(!result.rows[0]?.unlocked){destroy=true;break;}}
    catch{destroy=true;break;}
   }
  }
  client.removeListener('error',broken);client.release(destroy);
 }
}

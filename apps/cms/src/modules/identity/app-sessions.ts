import {randomBytes} from 'node:crypto';
import type {PayloadRequest} from 'payload';
import {sql} from '@payloadcms/db-postgres';
import {hash,pool,transaction} from '../shared/db';
import {payloadTransaction} from '../shared/payload-transaction';
import {GOOGLE_SESSION_SECONDS} from './session-policy';
export async function lockAccounts(req:PayloadRequest,ids:number[]){
 const db=await payloadTransaction(req);
 // Stable ordering also covers a browser carrying credentials for two accounts.
 for(const id of [...new Set(ids)].sort((a,b)=>a-b)){
  if(!Number.isSafeInteger(id)||id<1)throw new Error('Invalid account');
  await db.execute(sql`SELECT id FROM users WHERE id=${id} FOR UPDATE`);
 }
}
export async function createAppSession(userId:number){
 const token=randomBytes(32).toString('base64url');
 await transaction(async db=>{
  const user=await db.query('SELECT id,_verified FROM users WHERE id=$1 FOR UPDATE',[userId]);
  if(!user.rows[0]||user.rows[0]._verified!==true)throw new Error('Verified account required');
  await db.query("INSERT INTO lvd_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+make_interval(secs=>$3))",[await hash(token),userId,GOOGLE_SESSION_SECONDS]);
 });
 return token;
}
export async function appSessionUser(token:string|undefined){
 if(!token||token.length>100)return null;
 const userId=(await pool.query('SELECT s.user_id FROM lvd_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u._verified=true',[await hash(token)])).rows[0]?.user_id;
 return typeof userId==='number'?userId:null;
}
export async function revokeAppSession(token:string|undefined,req?:PayloadRequest){
 if(!token||token.length>100)return;
 const digest=await hash(token);
 if(req)await(await payloadTransaction(req)).execute(sql`DELETE FROM lvd_sessions WHERE token_hash=${digest}`);
 else await pool.query('DELETE FROM lvd_sessions WHERE token_hash=$1',[digest]);
}
export async function revokeAppUserSessions(userId:number,req?:PayloadRequest){
 if(req){await lockAccounts(req,[userId]);await(await payloadTransaction(req)).execute(sql`DELETE FROM lvd_sessions WHERE user_id=${userId}`);}
 else await pool.query('DELETE FROM lvd_sessions WHERE user_id=$1',[userId]);
}

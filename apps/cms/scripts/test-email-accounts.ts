import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {POST} from '../src/app/service/auth/[action]/route';
import {pool,hash} from '../src/modules/shared/db';
import {seal} from '../src/modules/integrations/crypto';
import * as chat from '../src/modules/chat/service';
import {testAccountVerification} from './test-account-verification';
export async function testEmailAccounts(payload:Payload,owner:User){
 const db=new URL(process.env.DATABASE_URL||'');if(db.pathname!=='/lvd_test'||!['127.0.0.1','localhost'].includes(db.hostname))throw new Error('Synthetic account checks only');
 assert.equal((await pool.query("SELECT provider FROM lvd_integrations WHERE provider='email'")).rowCount,0);
 const outbox:{html?:unknown}[]=[],send=payload.sendEmail,adapterSend=payload.email.sendEmail;
 const capture:typeof payload.sendEmail=async message=>{outbox.push({html:message.html});return {id:randomUUID()};};
 payload.sendEmail=capture;payload.email.sendEmail=capture;
 const email='account-'+randomUUID()+'@example.invalid',password='Synthetic account password 123!',updated='Updated synthetic password 456!',origin=process.env.APP_URL||'http://localhost:3000',guest=randomBytes(32).toString('base64url');
 let userId:number|undefined;
 const call=(action:string,data:Record<string,unknown>,options:{origin?:string;cookie?:string}={})=>POST(new Request(origin+'/service/auth/'+action,{method:'POST',headers:{origin:options.origin||origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.19',cookie:options.cookie||'lvd-guest='+guest},body:JSON.stringify(data)}),{params:Promise.resolve({action})});
 try{
  await pool.query("INSERT INTO lvd_integrations(provider,encrypted_values,enabled,version,check_state,updated_by) VALUES('email',$1,true,1,'passed',$2)",[seal('email',{apiKey:'synthetic-no-provider-key',fromName:'Synthetic account check',fromAddress:'no-reply@example.invalid'}),owner.id]);
  assert.equal((await call('register',{email,password},{origin:'https://attacker.invalid'})).status,403);
  const anonymous={user:null,guestHash:await hash(guest)},conversation=await chat.createConversation(anonymous,{consent:true});
  const registration=await call('register',{email,password,role:'owner',_verified:true,conversation:conversation.id});assert.equal(registration.status,202);assert.deepEqual(await registration.json(),{ok:true,state:'verification-email'});
  const user=(await payload.find({collection:'users',where:{email:{equals:email}},limit:1,showHiddenFields:true,overrideAccess:true})).docs[0];userId=user.id;assert.equal(user.role,'member');assert.equal(user._verified,false);
  const stored=(await pool.query('SELECT hash,salt FROM users WHERE id=$1',[userId])).rows[0];assert.ok(stored.hash&&stored.salt);assert.notEqual(stored.hash,password);
  assert.equal((await call('login',{email,password})).status,401,'Pending email cannot sign in');
  assert.equal(outbox.length,1);const verification=/token=([a-f0-9]+)/.exec(String(outbox[0].html))![1];assert.ok(verification);assert.equal((await call('verify',{token:verification})).status,200);assert.equal((await call('verify',{token:verification})).status,400,'Verification is single use');
  assert.equal((await call('login',{email,password:'wrong synthetic password'})).status,401);
  const login=await call('login',{email,password,conversation:conversation.id});assert.equal(login.status,200);const body=await login.json();assert.equal(body.redirectTo,'/tro-chuyen?conversation='+conversation.id);assert.ok(!('token' in body));
  const cookie=login.headers.get('set-cookie')||'';assert.match(cookie,/HttpOnly/i);assert.match(cookie,/SameSite=lax/i);const token=/payload-token=([^;]+)/.exec(cookie)![1];const authenticated=await payload.auth({headers:new Headers({cookie:'payload-token='+token,origin})});assert.equal(authenticated.user?.id,userId);
  const linked=(await pool.query('SELECT user_id,guest_hash FROM lvd_conversations WHERE id=$1',[conversation.id])).rows[0];assert.equal(linked.user_id,userId);assert.equal(linked.guest_hash,null);
  const otherGuest=randomBytes(32).toString('base64url'),otherConversation=await chat.createConversation({user:null,guestHash:await hash(otherGuest)},{consent:true});
  assert.equal((await call('login',{email,password,conversation:otherConversation.id})).status,200);assert.equal((await pool.query('SELECT user_id FROM lvd_conversations WHERE id=$1',[otherConversation.id])).rows[0].user_id,null,'Another guest chat stays anonymous');
  await pool.query('DELETE FROM lvd_conversations WHERE id=$1',[otherConversation.id]);
  await payload.update({collection:'users',id:userId,overrideAccess:true,data:{_verified:false} as never});
  await pool.query("INSERT INTO lvd_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",[await hash(randomUUID()),userId]);
  assert.equal((await call('forgot',{email})).status,202);const reset=/token=([a-f0-9]+)/.exec(String(outbox.at(-1)?.html))![1];assert.ok(reset);
  assert.equal((await call('reset',{token:'a'.repeat(64),password:updated})).status,400);
  const beforeReset=(await pool.query('SELECT hash,salt,reset_password_token,reset_password_expiration,_verified FROM users WHERE id=$1',[userId])).rows[0];
  await pool.query("CREATE OR REPLACE FUNCTION lvd_test_reset_verification_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic reset verification failure'; END $$");
  try{
   await pool.query(`CREATE TRIGGER lvd_test_reset_verification_failure BEFORE UPDATE ON users FOR EACH ROW WHEN (OLD.id=${userId} AND OLD._verified=false AND NEW._verified=true) EXECUTE FUNCTION lvd_test_reset_verification_failure()`);
   assert.ok((await call('reset',{token:reset,password:updated})).status>=400);
   assert.deepEqual((await pool.query('SELECT hash,salt,reset_password_token,reset_password_expiration,_verified FROM users WHERE id=$1',[userId])).rows[0],beforeReset,'Verification failure must roll back the password and preserve the same reset link for retry');
   assert.equal((await pool.query('SELECT user_id FROM lvd_sessions WHERE user_id=$1',[userId])).rowCount,1,'Verification failure must also roll back app-session revocation');
  }finally{await pool.query('DROP TRIGGER IF EXISTS lvd_test_reset_verification_failure ON users');await pool.query('DROP FUNCTION IF EXISTS lvd_test_reset_verification_failure()');}
  assert.equal((await call('reset',{token:reset,password:updated})).status,200);assert.equal((await call('reset',{token:reset,password:updated})).status,400,'Reset link is single use');
  assert.equal((await payload.findByID({collection:'users',id:userId,overrideAccess:true}))._verified,true,'Reset proves pending email ownership atomically');
  assert.equal((await pool.query('SELECT user_id FROM lvd_sessions WHERE user_id=$1',[userId])).rowCount,0,'Password reset revokes app sessions');
  assert.equal((await call('login',{email,password})).status,401);assert.equal((await call('login',{email,password:updated})).status,200);
  const duplicate=await call('register',{email,password});assert.equal(duplicate.status,202);assert.deepEqual(await duplicate.json(),{ok:true,state:'verification-email'});assert.equal((await payload.find({collection:'users',where:{email:{equals:email}},limit:2,overrideAccess:true})).totalDocs,1);
  await testAccountVerification(payload,owner);
  console.log('Email account checks passed: verified member-only signup, cookie login, scoped guest linking, CSRF, atomic pending-signup password reset/rollback/retry and token reuse denial; no provider request.');
 }finally{
  payload.sendEmail=send;payload.email.sendEmail=adapterSend;
  if(userId){await pool.query('DELETE FROM lvd_conversations WHERE user_id=$1',[userId]);await payload.delete({collection:'users',id:userId,overrideAccess:true});}
  await pool.query("DELETE FROM lvd_integrations WHERE provider='email'");
 }
}

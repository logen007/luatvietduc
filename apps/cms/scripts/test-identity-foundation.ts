import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createLocalReq,type Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import {seal} from '../src/modules/integrations/crypto';
import {createAppSession,appSessionUser} from '../src/modules/identity/app-sessions';
import {logoutRequest} from '../src/modules/identity/logout';
export async function testIdentityFoundation(payload:Payload,owner:User){
 const db=new URL(process.env.DATABASE_URL||'');if(db.pathname!=='/lvd_test'||!['127.0.0.1','localhost'].includes(db.hostname))throw new Error('Isolated identity checks only');
 const password=randomUUID(),updated=randomUUID(),origin=process.env.APP_URL||'http://localhost:3000';
 const user=await payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Synthetic account foundation',email:randomUUID()+'@example.invalid',role:'support',password,jurisdictions:['VN']}});
 const authenticate=(cookie:string)=>payload.auth({headers:new Headers({cookie,origin})});
 const login=(secret=password,req?:Parameters<Payload['login']>[0]['req'])=>payload.login({collection:'users',data:{email:user.email,password:secret},req});
 const outbox:{html?:unknown}[]=[],send=payload.sendEmail,adapterSend=payload.email.sendEmail;
 const capture:typeof payload.sendEmail=async message=>{outbox.push({html:message.html});return {id:randomUUID()};};
 const hooks=payload.collections.users.config.hooks.afterChange;
 const failAfterChange:NonNullable<typeof hooks>[number]=({doc,req})=>{if(req.context.syntheticIdentityAbort)throw new Error('Synthetic identity rollback');return doc;};
 try{
  const google=await createAppSession(user.id);assert.equal(await appSessionUser(google),user.id);
  await payload.update({collection:'users',id:user.id,user:owner,overrideAccess:false,data:{name:'Updated synthetic name'}});assert.equal(await appSessionUser(google),user.id,'Profile text changes preserve the session');
  hooks.push(failAfterChange);
  try{await assert.rejects(()=>payload.update({collection:'users',id:user.id,user:owner,overrideAccess:false,context:{syntheticIdentityAbort:true},data:{password:updated}}),/Synthetic identity rollback/);}
  finally{hooks.splice(hooks.indexOf(failAfterChange),1);}
  assert.equal(await appSessionUser(google),user.id,'Failed password changes roll back Google revocation in the same transaction');
  const local=await login();await payload.update({collection:'users',id:user.id,user:owner,overrideAccess:false,data:{password:updated}});
  assert.equal(await appSessionUser(google),null,'Native CMS password update revokes Google');assert.equal((await authenticate('payload-token='+local.token)).user,null,'Native CMS also revokes its old local session');
  await assert.rejects(()=>login());await login(updated);
  const oldGoogle=await createAppSession(user.id),otherGoogle=await createAppSession(user.id);
  const req=await createLocalReq({req:{headers:new Headers({cookie:'lvd-session='+oldGoogle,origin})}},payload);
  const switched=await login(updated,req);assert.equal(await appSessionUser(oldGoogle),null,'Native password login retires the previous browser Google session');assert.equal(await appSessionUser(otherGoogle),user.id);assert.equal((await authenticate('payload-token='+switched.token)).user?.id,user.id);
  // A database failure after native session revocation must roll both stores
  // back. This trigger exists only in lvd_test and is removed before continuing.
  await pool.query('CREATE OR REPLACE FUNCTION lvd_test_identity_delete_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION \'Synthetic identity delete failure\'; END $$');
  try{
   await pool.query('CREATE TRIGGER lvd_test_identity_delete_failure BEFORE DELETE ON lvd_sessions FOR EACH ROW EXECUTE FUNCTION lvd_test_identity_delete_failure()');
   const failed=await logoutRequest(new Request(origin+'/service/logout',{method:'POST',headers:{origin,cookie:'lvd-session='+otherGoogle+'; payload-token='+switched.token}}),payload);
   assert.equal(failed.status,503);assert.equal(await appSessionUser(otherGoogle),user.id);assert.equal((await authenticate('payload-token='+switched.token)).user?.id,user.id,'Failed logout restores both session stores');
  }finally{await pool.query('DROP TRIGGER IF EXISTS lvd_test_identity_delete_failure ON lvd_sessions');await pool.query('DROP FUNCTION lvd_test_identity_delete_failure()');}
  assert.equal((await pool.query("SELECT provider FROM lvd_integrations WHERE provider='email'")).rowCount,0);
  await pool.query("INSERT INTO lvd_integrations(provider,encrypted_values,enabled,check_state,updated_by) VALUES('email',$1,true,'passed',$2)",[seal('email',{apiKey:'synthetic-no-provider-key',fromAddress:'synthetic@example.invalid',fromName:'Synthetic'}),owner.id]);
  payload.sendEmail=capture;payload.email.sendEmail=capture;
  await payload.forgotPassword({collection:'users',data:{email:user.email}});const reset=/token=([a-f0-9]+)/.exec(String(outbox.at(-1)?.html))?.[1];assert.ok(reset);
  await assert.rejects(()=>payload.resetPassword({collection:'users',data:{token:'a'.repeat(64),password},overrideAccess:true}));assert.equal(await appSessionUser(otherGoogle),user.id,'Invalid reset token cannot revoke sessions');
  await payload.resetPassword({collection:'users',data:{token:reset,password},overrideAccess:true});assert.equal(await appSessionUser(otherGoogle),null,'Native reset endpoint revokes Google without relying on the public wrapper');assert.equal((await authenticate('payload-token='+switched.token)).user,null);
  const unverified=await createAppSession(user.id);await payload.update({collection:'users',id:user.id,user:owner,overrideAccess:false,data:{_verified:false} as never});assert.equal(await appSessionUser(unverified),null);await assert.rejects(()=>createAppSession(user.id));
  await payload.update({collection:'users',id:user.id,user:owner,overrideAccess:false,context:{verifiedReset:true},data:{}});
  const a=await createAppSession(user.id),b=await createAppSession(user.id),first=await login(),second=await login();
  const response=await logoutRequest(new Request(origin+'/api/users/logout?allSessions=true',{method:'POST',headers:{origin,cookie:'lvd-session='+a+'; payload-token='+first.token}}),payload);assert.equal(response.status,200);
  for(const token of [a,b])assert.equal(await appSessionUser(token),null);for(const token of [first.token,second.token])assert.equal((await authenticate('payload-token='+token)).user,null);
  const passwordOnly=await login(),remoteGoogle=await createAppSession(user.id);
  assert.equal((await logoutRequest(new Request(origin+'/api/users/logout?allSessions=true',{method:'POST',headers:{origin,cookie:'payload-token='+passwordOnly.token}}),payload)).status,200);
  assert.equal(await appSessionUser(remoteGoogle),null,'Password-only all-session logout also revokes Google on other devices');
  const remotePassword=await login(),googleOnly=await createAppSession(user.id);
  assert.equal((await logoutRequest(new Request(origin+'/api/users/logout?allSessions=true',{method:'POST',headers:{origin,cookie:'lvd-session='+googleOnly}}),payload)).status,200);
  assert.equal((await authenticate('payload-token='+remotePassword.token)).user,null,'Google-only all-session logout also revokes native sessions on other devices');
  assert.ok(response.cookies.getAll().some(cookie=>cookie.name==='lvd-oauth'&&cookie.path==='/auth/google'&&cookie.maxAge===0),'Logout clears OAuth state at its real path');
  console.log('Identity foundation checks passed: native CMS password changes/reset, rollback, local login switching, verified-only Google, all-session logout and OAuth cookie scope.');
 }finally{
  const index=hooks.indexOf(failAfterChange);if(index>=0)hooks.splice(index,1);
  payload.sendEmail=send;payload.email.sendEmail=adapterSend;
  await pool.query("DELETE FROM lvd_integrations WHERE provider='email'");await payload.delete({collection:'users',id:user.id,user:owner,overrideAccess:false});
 }
}

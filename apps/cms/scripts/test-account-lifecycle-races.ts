import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import {seal} from '../src/modules/integrations/crypto';
import {createAppSession,appSessionUser} from '../src/modules/identity/app-sessions';
import {logoutRequest} from '../src/modules/identity/logout';
import {testLoginRevisionPool} from './test-login-revision-pool';

export async function testAccountLifecycleRaces(payload:Payload,owner:User){
 const db=new URL(process.env.DATABASE_URL||'');
 if(db.pathname!=='/lvd_test'||!['127.0.0.1','localhost'].includes(db.hostname)||!['5432','55439'].includes(db.port))throw new Error('Isolated account race checks only');
 const origin=process.env.APP_URL||'http://localhost:3000',password=randomUUID(),ids:number[]=[];
 const inserted=await pool.query("INSERT INTO lvd_integrations(provider,encrypted_values,enabled,check_state) VALUES('email',$1,true,'passed') ON CONFLICT(provider) DO NOTHING RETURNING provider",[seal('email',{apiKey:'synthetic-no-provider-key',fromAddress:'synthetic@example.invalid',fromName:'Synthetic'})]);
 const originalFindOne=payload.db.findOne,originalFind=payload.db.find;
 const user=async()=>{const doc=await payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Synthetic lifecycle race',email:randomUUID()+'@example.invalid',password,role:'support',jurisdictions:['VN']}});ids.push(doc.id);return doc;};
 const login=(doc:User,secret=password)=>payload.login({collection:'users',data:{email:doc.email,password:secret}});
 const auth=(token:string)=>payload.auth({headers:new Headers({origin,cookie:'payload-token='+token})});
 const current=(id:number)=>payload.findByID({collection:'users',id,overrideAccess:true,showHiddenFields:true,depth:0});
 const downgrade=(id:number)=>payload.update({collection:'users',id,user:owner,overrideAccess:false,data:{role:'member'}});
 const logout=(token:string,all=false)=>logoutRequest(new Request(origin+'/service/logout'+(all?'?allSessions=true':''),{method:'POST',headers:{origin,cookie:'payload-token='+token}}),payload);
 async function resetToken(id:number){const token=randomUUID().replaceAll('-','')+randomUUID().replaceAll('-','');await pool.query("UPDATE users SET reset_password_token=$1,reset_password_expiration=now()+interval '10 minutes' WHERE id=$2",[token,id]);return token;}
 function pauseRead(id:number,transaction:boolean){
  let capturedResolve!:()=>void,resume!:()=>void,used=false;
  const captured=new Promise<void>(resolve=>{capturedResolve=resolve;}),gate=new Promise<void>(resolve=>{resume=resolve;});
  const prepared=new WeakSet<object>(),hooks=payload.collections.users.config.hooks.beforeOperation;
  const mark:NonNullable<typeof hooks>[number]=({operation,req,args})=>{if(operation==='update')prepared.add(req);return args;};hooks.push(mark);
  payload.db.findOne=(async function(this:Payload['db'],args:any){const result=await originalFindOne.call(this,args);if(!used&&args.collection==='users'&&result?.id===id&&Boolean(args.req?.transactionID)===transaction){used=true;capturedResolve();await gate;}return result;}) as typeof originalFindOne;
  payload.db.find=(async function(this:Payload['db'],args:any){const result=await originalFind.call(this,args);if(!used&&transaction&&args.collection==='users'&&prepared.has(args.req)&&result.docs.some((doc:any)=>doc.id===id)){used=true;capturedResolve();await gate;}return result;}) as typeof originalFind;
  return {resume,restore:()=>{resume();payload.db.findOne=originalFindOne;payload.db.find=originalFind;hooks.splice(hooks.indexOf(mark),1);},captured:()=>Promise.race([captured,new Promise<never>((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Native user read was not reached')),5000);timer.unref();})])};
 }
 async function lockedPair(first:()=>Promise<unknown>,second:()=>Promise<unknown>,id:number){
  const pause=pauseRead(id,true);let a:Promise<unknown>|undefined,b:Promise<unknown>|undefined;
  try{a=first();await pause.captured();b=second();let completed=false;void b.then(()=>{completed=true;},()=>{completed=true;});await new Promise(resolve=>setTimeout(resolve,100));assert.equal(completed,false,'The competing lifecycle operation must wait before reading the user');pause.resume();await Promise.all([a,b]);}
  finally{pause.restore();await Promise.allSettled([a,b].filter(Boolean) as Promise<unknown>[]);}
 }
 async function staleLogin(doc:User,change:()=>Promise<unknown>){
  const pause=pauseRead(doc.id,false);let pending:Promise<unknown>|undefined;
  try{
   pending=login(doc);const rejected=assert.rejects(pending,(error:any)=>error.status===409,'Changed accounts must ask for a retry');
   await pause.captured();await change();pause.resume();await rejected;
  }finally{pause.restore();if(pending)await Promise.allSettled([pending]);}
 }
 try{
  for(const updateFirst of [false,true])for(const bulk of [false,true]){
   const doc=await user(),session=await login(doc);
   const change=()=>bulk?payload.update({collection:'users',where:{id:{equals:doc.id}},user:owner,overrideAccess:false,data:{role:'member'}}):downgrade(doc.id);
   const first=()=>updateFirst?change():logout(session.token!),second=()=>updateFirst?logout(session.token!):change();
   await lockedPair(first,second,doc.id);
   assert.equal((await current(doc.id)).role,'member');assert.equal((await auth(session.token!)).user,null,'A simultaneous profile write must not restore the logged-out session');
  }
  for(const updateFirst of [false,true]){
   const doc=await user(),session=await login(doc),google=await createAppSession(doc.id),token=await resetToken(doc.id),replacement=randomUUID();
   const reset=()=>payload.resetPassword({collection:'users',data:{token,password:replacement},overrideAccess:true});
   await lockedPair(updateFirst?()=>downgrade(doc.id):reset,updateFirst?reset:()=>downgrade(doc.id),doc.id);
   assert.equal((await current(doc.id)).role,'member');assert.equal((await auth(session.token!)).user,null);assert.equal(await appSessionUser(google),null);
   await assert.rejects(()=>payload.resetPassword({collection:'users',data:{token,password},overrideAccess:true}));
   assert.equal((await login(doc,replacement)).user?.role,'member');
  }
  {
   const doc=await user();await login(doc);
   await staleLogin(doc,()=>downgrade(doc.id));
   assert.equal((await current(doc.id)).role,'member');assert.equal((await login(doc)).user?.role,'member');
  }
  for(const all of [false,true]){
   const doc=await user(),a=await login(doc),b=await login(doc);
   await staleLogin(doc,()=>logout(a.token!,all));
   assert.equal((await auth(a.token!)).user,null);assert.equal(Boolean((await auth(b.token!)).user),!all);
   await login(doc);
   assert.equal((await auth(a.token!)).user,null,'A fresh retry must retain the previous revocation');
  }
  {
   const doc=await user();await login(doc);
   const version=(await pool.query('SELECT xmin::text AS version FROM users WHERE id=$1',[doc.id])).rows[0].version;
   await staleLogin(doc,async()=>{await pool.query("UPDATE users_jurisdictions SET value='DE' WHERE parent_id=$1",[doc.id]);});
   assert.equal((await pool.query('SELECT xmin::text AS version FROM users WHERE id=$1',[doc.id])).rows[0].version,version,'Child-row edits do not advance the user row version');
   assert.deepEqual((await current(doc.id)).jurisdictions,['DE']);assert.deepEqual((await login(doc)).user?.jurisdictions,['DE']);
  }
  {
   const doc=await user(),session=await login(doc),version=(await pool.query('SELECT xmin::text AS version FROM users WHERE id=$1',[doc.id])).rows[0].version;
   await staleLogin(doc,async()=>{await pool.query('DELETE FROM users_sessions WHERE _parent_id=$1',[doc.id]);});
   assert.equal((await pool.query('SELECT xmin::text AS version FROM users WHERE id=$1',[doc.id])).rows[0].version,version);
   assert.equal((await auth(session.token!)).user,null,'Child-session revocation must survive a stale native login');
  }
  {
   const doc=await user();
   for(let attempt=1;attempt<=2;attempt++){await assert.rejects(()=>login(doc,randomUUID()));assert.equal(Number((await pool.query('SELECT login_attempts FROM users WHERE id=$1',[doc.id])).rows[0].login_attempts),attempt);}
   await login(doc);assert.equal(Number((await pool.query('SELECT login_attempts FROM users WHERE id=$1',[doc.id])).rows[0].login_attempts),0);
  }
  await testLoginRevisionPool(payload,owner);
  console.log('Account lifecycle race checks passed: single/bulk update/logout and update/reset in both orders, stale login rollback on downgrade/logout/all-session logout/child-only scope and session changes, reset replay rejection and persistent failed-attempt counters.');
 }finally{
  payload.db.findOne=originalFindOne;payload.db.find=originalFind;
  for(const id of ids)await payload.delete({collection:'users',id,overrideAccess:true});
  if(inserted.rowCount)await pool.query("DELETE FROM lvd_integrations WHERE provider='email'");
 }
}

import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import {withPasswordLoginLock} from '../src/modules/identity/password-login';

export async function testPasswordLoginAdmission(payload:Payload,owner:User){
 const database=new URL(process.env.DATABASE_URL||'');
 if(database.pathname!=='/lvd_test'||!['localhost','127.0.0.1'].includes(database.hostname)||!['5432','55439'].includes(database.port))throw new Error('Isolated password admission checks only');
 const password=randomUUID(),originalFindOne=payload.db.findOne,originalQuery=pg.Client.prototype.query;
 let doc:User|undefined,pending:Promise<unknown>|undefined,resume=()=>{};const extraIds:number[]=[];
 const login=(email:string,secret=password)=>withPasswordLoginLock(email,()=>payload.login({collection:'users',data:{email,password:secret}}));
 const state=async(id:number)=>(await pool.query('SELECT role,login_attempts,lock_until FROM users WHERE id=$1',[id])).rows[0];
 try{
  doc=await payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Synthetic password admission',email:randomUUID()+'@example.invalid',password,role:'support',jurisdictions:['VN']}});
  await login(doc.email);
  await pool.query('UPDATE users SET login_attempts=3,lock_until=NULL WHERE id=$1',[doc.id]);
  let capturedResolve=()=>{},entered=0,used=false;
  const captured=new Promise<void>(resolve=>{capturedResolve=resolve;}),gate=new Promise<void>(resolve=>{resume=resolve;});
  const id=doc.id;
  payload.db.findOne=(async function(this:Payload['db'],args:any){const result=await originalFindOne.call(this,args);if(!used&&args.collection==='users'&&!args.req?.transactionID&&result?.id===id){used=true;capturedResolve();await gate;}return result;}) as typeof originalFindOne;
  pending=withPasswordLoginLock(doc.email,()=>{entered++;return payload.login({collection:'users',data:{email:doc!.email,password:randomUUID()}});});
  const failed=assert.rejects(pending,(error:any)=>error.status===401);
  await Promise.race([captured,new Promise<never>((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Native authentication was not reached')),5000);timer.unref();})]);
  await assert.rejects(()=>withPasswordLoginLock(' '+doc!.email.toUpperCase()+' ',async()=>{entered++;throw new Error('Concurrent native auth must not run');}),(error:any)=>error.status===409);
  assert.equal(entered,1,'Only one wrong-password request can enter native auth');
  await payload.update({collection:'users',id:doc.id,user:owner,overrideAccess:false,data:{role:'member'}});
  resume();await failed;payload.db.findOne=originalFindOne;
  assert.equal((await state(doc.id)).role,'member','Failed authentication cannot restore a concurrent downgrade');
  assert.equal(Number((await state(doc.id)).login_attempts),4,'The native failed-attempt increment persists');
  assert.equal((await login(doc.email)).user?.role,'member','A normal retry succeeds after admission is released');
  assert.equal(Number((await state(doc.id)).login_attempts),0);

  // Sequential native failures still reach the configured lockout, including
  // the expired-lock recovery path; admission does not replace those rules.
  for(let attempt=1;attempt<=5;attempt++){await assert.rejects(()=>login(doc!.email,randomUUID()));assert.equal(Number((await state(doc.id)).login_attempts),attempt);}
  assert.ok(new Date((await state(doc.id)).lock_until).getTime()>Date.now());
  await assert.rejects(()=>login(doc!.email));assert.equal((await state(doc.id)).role,'member');
  await pool.query("UPDATE users SET lock_until=now()-interval '1 second' WHERE id=$1",[doc.id]);
  assert.equal((await login(doc.email)).user?.role,'member');assert.equal(Number((await state(doc.id)).login_attempts),0);

  const oldEmail=doc.email;let newEmail=randomUUID()+'@example.invalid';
  let enteredHeld=()=>{},releaseHeld=()=>{};
  const held=new Promise<void>(resolve=>{enteredHeld=resolve;}),hold=new Promise<void>(resolve=>{releaseHeld=resolve;});
  pending=withPasswordLoginLock(oldEmail,async()=>{enteredHeld();await hold;return 'held';});
  await held;
  try{
   await assert.rejects(()=>payload.update({collection:'users',id:doc!.id,user:owner,overrideAccess:false,data:{email:newEmail}}),(error:any)=>error.status===409);
   assert.equal((await payload.findByID({collection:'users',id:doc.id,overrideAccess:true})).email,oldEmail,'An admitted old email cannot be renamed underneath native authentication');
  }finally{releaseHeld();await pending;}
  await payload.update({collection:'users',id:doc.id,user:owner,overrideAccess:false,data:{email:newEmail}});
  assert.equal((await login(newEmail)).user?.id,doc.id);

  // The missing-email result is captured before a rename/create can add that
  // mapping. Keep admission paused at precisely the former TOCTOU window.
  const missingEmail=randomUUID()+'@example.invalid';let lookupReached=()=>{},releaseLookup=()=>{},lookupUsed=false,missingCallback=false;
  const lookupCaptured=new Promise<void>(resolve=>{lookupReached=resolve;}),lookupGate=new Promise<void>(resolve=>{releaseLookup=resolve;});resume=releaseLookup;
  pg.Client.prototype.query=(function(this:pg.Client,...args:any[]){
   const result=(originalQuery as any).apply(this,args);
   if(!lookupUsed&&args[0]==='SELECT id FROM users WHERE email=$1'&&args[1]?.[0]===missingEmail)return Promise.resolve(result).then(async value=>{assert.equal(value.rows.length,0);lookupUsed=true;lookupReached();await lookupGate;return value;});
   return result;
  }) as typeof originalQuery;
  pending=withPasswordLoginLock(missingEmail,async()=>{missingCallback=true;return 'missing';});void pending.catch(()=>{});
  try{
   await Promise.race([lookupCaptured,new Promise<never>((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Missing-email admission lookup was not reached')),5000);timer.unref();})]);
   await assert.rejects(()=>payload.update({collection:'users',id:doc!.id,user:owner,overrideAccess:false,data:{email:missingEmail}}),(error:any)=>error.status===409);
   await assert.rejects(()=>payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Synthetic blocked mapping',email:missingEmail,password,role:'member'}}),(error:any)=>error.status===409);
   assert.equal(missingCallback,false);assert.equal((await payload.findByID({collection:'users',id:doc.id,overrideAccess:true})).email,newEmail);
  }finally{releaseLookup();await pending;pg.Client.prototype.query=originalQuery;}
  assert.equal(missingCallback,true);
  const created=await payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Synthetic released mapping',email:missingEmail,password,role:'member'}});extraIds.push(created.id);
  await payload.delete({collection:'users',id:created.id,overrideAccess:true});extraIds.splice(extraIds.indexOf(created.id),1);
  await payload.update({collection:'users',id:doc.id,user:owner,overrideAccess:false,data:{email:missingEmail}});newEmail=missingEmail;
  assert.equal((await login(newEmail)).user?.id,doc.id,'A released email mapping can be created and reassigned normally');

  const unknown=randomUUID()+'@example.invalid';let enteredUnknown=()=>{},releaseUnknown=()=>{};
  const unknownHeld=new Promise<void>(resolve=>{enteredUnknown=resolve;}),unknownHold=new Promise<void>(resolve=>{releaseUnknown=resolve;});
  pending=withPasswordLoginLock(unknown,async()=>{enteredUnknown();await unknownHold;return 'unknown';});await unknownHeld;
  try{
   await assert.rejects(()=>withPasswordLoginLock(unknown.toUpperCase(),async()=>{throw new Error('Unknown-email contention must use the same response');}),(error:any)=>error.status===409);
   assert.equal(await withPasswordLoginLock(newEmail,async()=>true),true,'An unrelated account can use the other admission connection');
  }finally{releaseUnknown();await pending;}
  const failure=new Error('Synthetic callback failure');
  await assert.rejects(()=>withPasswordLoginLock(unknown,async()=>{throw failure;}),error=>error===failure);
  assert.equal(await withPasswordLoginLock(unknown,async()=>true),true,'Callback errors release admission');

  let unlockFailed=false;
  pg.Client.prototype.query=(function(this:pg.Client,...args:any[]){if(!unlockFailed&&typeof args[0]==='string'&&args[0].startsWith('SELECT pg_advisory_unlock')){unlockFailed=true;return Promise.reject(new Error('Synthetic unlock failure'));}return (originalQuery as any).apply(this,args);}) as typeof originalQuery;
  try{assert.equal(await withPasswordLoginLock(unknown,async()=>true),true);}finally{pg.Client.prototype.query=originalQuery;}
  assert.equal(unlockFailed,true);
  assert.equal(await withPasswordLoginLock(unknown,async()=>true),true,'An unlock failure destroys the connection and releases its server lock');
  console.log('Password admission checks passed: same-account exclusion, concurrent downgrade preservation, persistent native counters, lockout/expired-lock recovery, normal retry, old/new email mutation exclusion, missing-email lookup races, unknown-user contention and failure cleanup.');
 }finally{
  resume();if(pending)await Promise.allSettled([pending]);payload.db.findOne=originalFindOne;pg.Client.prototype.query=originalQuery;
  for(const id of extraIds)await payload.delete({collection:'users',id,overrideAccess:true});
  if(doc)await payload.delete({collection:'users',id:doc.id,overrideAccess:true});
 }
}

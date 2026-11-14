import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';

async function bounded<T>(task:Promise<T>,message:string){
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([task,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),5000);})]);}
 finally{clearTimeout(timer);}
}

export async function testLoginRevisionPool(payload:Payload,owner:User){
 const database=new URL(process.env.DATABASE_URL||'');
 if(database.pathname!=='/lvd_test'||!['127.0.0.1','localhost'].includes(database.hostname)||!['5432','55439'].includes(database.port))throw new Error('Isolated login revision checks only');
 const monitor=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:1500,query_timeout:2000}),clients:pg.PoolClient[]=[],blocked:Promise<unknown>[]=[];
 const hooks=payload.collections.users.config.hooks.beforeLogin!,password=randomUUID();
 let user:User|undefined,pending:Promise<unknown>|undefined,resume=()=>{},reached=()=>{},entered=false;
 const captured=new Promise<void>(resolve=>{reached=resolve;}),gate=new Promise<void>(resolve=>{resume=resolve;});
 const pause:NonNullable<typeof hooks>[number]=async({user:loggingIn})=>{
  if(loggingIn.id===user?.id&&!entered){entered=true;reached();await gate;}
  return loggingIn;
 };
 try{
  await monitor.connect();
  user=await payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Synthetic revision pool',email:randomUUID()+'@example.invalid',password,role:'member'}});
  hooks.unshift(pause);
  pending=payload.login({collection:'users',data:{email:user.email,password}});void pending.catch(()=>{});
  await bounded(captured,'Native login did not reach its write-locked revision guard');
  // These are the same account-row locks taken by createAppSession. Keep all
  // shared connections waiting behind native login before releasing the guard.
  const count=Number(pool.options.max);assert.equal(count,5,'Fixture must saturate the configured shared pool');
  for(let index=0;index<count;index++){
   const client=await pool.connect();clients.push(client);await client.query('BEGIN');
   const waiting=client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.id]);void waiting.catch(()=>{});blocked.push(waiting);
  }
  const pids=clients.map(client=>Number((client as pg.PoolClient&{processID:number}).processID));
  let allWaiting=false;
  for(let attempt=0;attempt<100;attempt++){
   const result=await monitor.query<{count:number}>("SELECT count(*)::int AS count FROM pg_stat_activity WHERE pid=ANY($1::int[]) AND wait_event_type='Lock'",[pids]);
   if(result.rows[0].count===count){allWaiting=true;break;}
   await new Promise(resolve=>setTimeout(resolve,25));
  }
  assert.equal(allWaiting,true,'Shared connections must actually wait on the native login row');
  resume();
  const login=await bounded(pending,'Native login deadlocked behind shared-pool account locks') as {token?:string;user?:User};
  assert.equal(login.user?.id,user.id);assert.ok(login.token,'A committed snapshot must remain available while the shared pool is saturated');
  console.log('Login revision pool checks passed: native login completes while all shared connections wait on its account row');
 }finally{
  resume();const index=hooks.indexOf(pause);if(index>=0)hooks.splice(index,1);
  // Destroy blocked fixture connections rather than queuing rollback behind
  // their lock waits; release every waiter before awaiting the pending login.
  for(const client of clients)client.release(true);
  await Promise.allSettled([...blocked,...(pending?[pending]:[])]);
  await monitor.end();
  if(user)await payload.delete({collection:'users',id:user.id,overrideAccess:true});
 }
}

import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {createLocalReq,type Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import {verifyAccountEmail,verifyEmailEndpoint} from '../src/modules/identity/verify-email';

export async function testAccountVerification(payload:Payload,owner:User){
 const database=new URL(process.env.DATABASE_URL||'');if(database.pathname!=='/lvd_test'||!['127.0.0.1','localhost'].includes(database.hostname))throw new Error('Isolated verification checks only');
 const endpoints=payload.collections.users.config.endpoints;
 assert.ok(Array.isArray(endpoints));assert.equal(endpoints.find(endpoint=>endpoint.method==='post'&&endpoint.path==='/verify/:id')?.handler,verifyEmailEndpoint.handler,'The locked handler must precede the native endpoint');
 const user=await payload.create({collection:'users',overrideAccess:true,context:{bootstrapOwner:true},data:{name:'Synthetic verification race',email:randomUUID()+'@example.invalid',password:randomUUID(),role:'support',jurisdictions:['VN']}});
 const findOne=payload.db.findOne,updateOne=payload.db.updateOne,hooks=payload.collections.users.config.hooks.afterChange;
 let unblock=()=>{};
 const invoke=async(token:string,native:boolean)=>{
  if(!native)return verifyAccountEmail(payload,token);
  const req=await createLocalReq({req:{headers:new Headers(),routeParams:{collection:'users',id:token}}},payload);
  const response=await verifyEmailEndpoint.handler(req);assert.equal(response.status,200);assert.equal(typeof (await response.json()).message,'string');return true;
 };
 const reset=async()=>{const token=randomBytes(20).toString('hex');await payload.update({collection:'users',id:user.id,user:owner,overrideAccess:false,data:{role:'support',jurisdictions:['VN'],name:'Before verification'}});await pool.query('UPDATE users SET _verified=false,_verificationtoken=$2 WHERE id=$1',[user.id,token]);return token;};
 try{
  for(const native of [false,true])for(const order of ['verification-first','update-first']){
   const token=await reset();let ready!:()=>void;const started=new Promise<void>(resolve=>{ready=resolve;}),gate=new Promise<void>(resolve=>{unblock=resolve;});
   const pauseMutation:typeof hooks[number]=({doc,req})=>{if(req.context.syntheticVerifyMutation===true){ready();return gate.then(()=>doc);}return doc;};
   let verification:Promise<unknown>,mutation:Promise<unknown>;
   try{
    if(order==='verification-first'){
     payload.db.findOne=(async(args:Parameters<typeof findOne>[0])=>{const doc=await findOne.call(payload.db,args);if(args.collection==='users'&&JSON.stringify(args.where).includes(token)){ready();await gate;}return doc;}) as typeof findOne;
     verification=invoke(token,native);await started;
     mutation=payload.update({collection:'users',id:user.id,user:owner,overrideAccess:false,data:{role:'member',jurisdictions:['DE'],name:'Administrator update retained'}});
    }else{
     hooks.push(pauseMutation);
     mutation=payload.update({collection:'users',id:user.id,user:owner,overrideAccess:false,context:{syntheticVerifyMutation:true},data:{role:'member',jurisdictions:['DE'],name:'Administrator update retained'}});await started;
     verification=invoke(token,native);
    }
    unblock();await Promise.all([verification,mutation]);
   }finally{unblock();payload.db.findOne=findOne;const index=hooks.indexOf(pauseMutation);if(index>=0)hooks.splice(index,1);}
   const final=await payload.findByID({collection:'users',id:user.id,overrideAccess:true});
   assert.equal(final.role,'member',native+' '+order);assert.equal(final.name,'Administrator update retained');assert.deepEqual(final.jurisdictions,['DE']);assert.equal(final._verified,true);
  }
  const token=await reset(),before=(await pool.query('SELECT _verified,_verificationtoken FROM users WHERE id=$1',[user.id])).rows[0];
  payload.db.updateOne=async args=>{if(args.collection==='users'&&Number(args.id)===user.id&&args.data._verified===true)throw new Error('Synthetic verification write failure');return updateOne.call(payload.db,args);};
  try{await assert.rejects(()=>invoke(token,true),/Synthetic verification write failure/);}finally{payload.db.updateOne=updateOne;}
  assert.deepEqual((await pool.query('SELECT _verified,_verificationtoken FROM users WHERE id=$1',[user.id])).rows[0],before,'Failed verification preserves the same token for retry');
  const replay=await Promise.allSettled([invoke(token,false),invoke(token,true)]);assert.equal(replay.filter(result=>result.status==='fulfilled').length,1,'Public/native parallel verification is single use');
  console.log('Verification checks passed: public/native handler precedence, concurrent administrator downgrade in both orders, failed-write rollback/retry and parallel replay denial.');
 }finally{unblock();payload.db.findOne=findOne;payload.db.updateOne=updateOne;await payload.delete({collection:'users',id:user.id,overrideAccess:true});}
}

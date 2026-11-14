import assert from 'node:assert/strict';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
export async function testQuickReplies(payload:Payload,owner:User){
 const db=new URL(process.env.DATABASE_URL||'');
 if(db.pathname!=='/lvd_test'||!['127.0.0.1','localhost'].includes(db.hostname))throw new Error('Isolated quick reply checks only');
 const ids:number[]=[],users:number[]=[],suffix=crypto.randomUUID();
 try{
  const support=await payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Synthetic specialist',email:`replies-${suffix}@example.invalid`,password:crypto.randomUUID(),role:'support',jurisdictions:['VN']}});users.push(support.id);
  const member=await payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Synthetic member',email:`member-${suffix}@example.invalid`,password:crypto.randomUUID(),role:'member'}});users.push(member.id);
  const before=await pool.query('SELECT (SELECT count(*) FROM knowledge) AS knowledge,(SELECT count(*) FROM lvd_messages) AS messages');
  const active=await payload.create({collection:'quick-replies',user:owner,overrideAccess:false,data:{title:suffix+' active',body:'A private human reply template.',enabled:true}});ids.push(active.id);
  const inactive=await payload.create({collection:'quick-replies',user:owner,overrideAccess:false,data:{title:suffix+' inactive',body:'Disabled template.',enabled:false}});ids.push(inactive.id);
  const visible=await payload.find({collection:'quick-replies',user:support,overrideAccess:false,where:{id:{in:ids}}});
  assert.deepEqual(visible.docs.map(doc=>doc.id),[active.id]);
  for(const user of [support,member,null]){
   await assert.rejects(()=>payload.create({collection:'quick-replies',user,overrideAccess:false,data:{title:'Forbidden',body:'Forbidden'}}));
   await assert.rejects(()=>payload.update({collection:'quick-replies',id:active.id,user,overrideAccess:false,data:{body:'Forbidden'}}));
   await assert.rejects(()=>payload.delete({collection:'quick-replies',id:active.id,user,overrideAccess:false}));
  }
  for(const user of [member,null])await assert.rejects(()=>payload.find({collection:'quick-replies',user,overrideAccess:false}));
  await assert.rejects(()=>payload.findByID({collection:'quick-replies',id:inactive.id,user:support,overrideAccess:false}));
  await payload.update({collection:'quick-replies',id:active.id,user:owner,overrideAccess:false,data:{body:'Edited template.',enabled:false}});
  assert.equal((await payload.find({collection:'quick-replies',user:support,overrideAccess:false,where:{id:{in:ids}}})).totalDocs,0);
  await assert.rejects(()=>payload.update({collection:'quick-replies',id:active.id,user:owner,overrideAccess:false,data:{body:'x'.repeat(10001)}}));
  const after=await pool.query('SELECT (SELECT count(*) FROM knowledge) AS knowledge,(SELECT count(*) FROM lvd_messages) AS messages');
  assert.deepEqual(after.rows,before.rows,'Template management never publishes knowledge or sends a message');
  console.log('Quick reply checks passed: admin CRUD, specialist enabled-only read, member/anonymous isolation, length validation and no knowledge/message side effects.');
 }finally{
  for(const id of ids)await payload.delete({collection:'quick-replies',id,user:owner,overrideAccess:false});
  for(const id of users)await payload.delete({collection:'users',id,user:owner,overrideAccess:false});
 }
}

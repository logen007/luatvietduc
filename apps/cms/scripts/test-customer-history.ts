import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {User} from '../src/payload-types';
import {pool,hash} from '../src/modules/shared/db';
import * as chat from '../src/modules/chat/service';
import {renameCustomerConversation} from '../src/modules/chat/rename-conversation';
import {deleteCustomerConversation,deleteInboxConversation} from '../src/modules/chat/delete-conversation';
export async function testCustomerHistory(owner:User){
 const database=new URL(process.env.DATABASE_URL||'');assert.ok(['localhost','127.0.0.1'].includes(database.hostname)&&database.pathname==='/lvd_test');
 const actor:chat.Actor={user:null,guestHash:await hash(randomUUID())},other:chat.Actor={user:null,guestHash:await hash(randomUUID())},admin:chat.Actor={user:owner,guestHash:''},ids:string[]=[];
 const make=async(a=actor)=>{const c=await chat.createConversation(a,{consent:true},{assistantEnabled:true});ids.push(c.id);return c.id;};
 const snapshot=async(id:string,a=actor)=>{const c=(await chat.transcript(a,id)).conversation;return {...c,updatedAt:new Date(c.updatedAt!).toISOString()};};
 const input=(c:Awaited<ReturnType<typeof snapshot>>,title:string)=>({title,version:c.version,updatedAt:c.updatedAt});
 try{
  const id=await make();await chat.message(actor,id,{key:randomUUID(),body:'Synthetic retained history'},2000);const before=await snapshot(id);
  await assert.rejects(()=>renameCustomerConversation(other,id,input(before,'Wrong browser')),{status:403});await assert.rejects(()=>renameCustomerConversation(admin,id,input(before,'Admin customer route is still own-only')),{status:403});
  await assert.rejects(()=>deleteCustomerConversation(other,id,before.version,before.updatedAt),{status:403});await assert.rejects(()=>deleteCustomerConversation(admin,id,before.version,before.updatedAt),{status:403});await assert.rejects(()=>deleteInboxConversation(actor,id,before.version,before.updatedAt),{status:403});
  for(const title of ['', 'x'.repeat(101),'line\nline'])await assert.rejects(()=>renameCustomerConversation(actor,id,input(before,title)),{status:400});
  const generation=randomUUID();await pool.query('UPDATE lvd_conversations SET ai_generation=$2,ai_started_at=now() WHERE id=$1',[id,generation]);
  const named=await renameCustomerConversation(actor,id,input(await snapshot(id),'A'));assert.equal(named.title,'A');assert.equal(named.version,before.version);assert.equal(named.customTitle,true);
  const retained=(await pool.query('SELECT ai_generation,ai_enabled FROM lvd_conversations WHERE id=$1',[id])).rows[0];assert.equal(retained.ai_generation,generation);assert.equal(retained.ai_enabled,true,'Metadata naming does not interrupt an in-flight answer');
  assert.equal((await chat.chatList(actor)).find(c=>c.id===id)?.customTitle,true);assert.equal((await snapshot(id)).customTitle,true);
  await assert.rejects(()=>renameCustomerConversation(actor,id,input(before,'Stale name')),{status:409});await assert.rejects(()=>deleteCustomerConversation(actor,id,before.version,before.updatedAt),{status:409});
  const current=await snapshot(id);assert.equal((await deleteCustomerConversation(actor,id,current.version,current.updatedAt)).deleted,true);assert.equal((await deleteCustomerConversation(actor,id,current.version,current.updatedAt)).deleted,true,'Deletion retries are idempotent');
  for(const table of ['lvd_messages','lvd_chat_events','lvd_answer_jobs'])assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE conversation_id=$1`,[id])).rows[0].n,0);
  const account=await make(admin),accountBefore=await snapshot(account,admin);await renameCustomerConversation(admin,account,input(accountBefore,'Saved account name'));assert.equal((await snapshot(account,admin)).title,'Saved account name');
  await assert.rejects(()=>deleteCustomerConversation(actor,account,accountBefore.version,accountBefore.updatedAt),{status:403});
  console.log('Customer history passed: own guest/account rename and delete, cross-browser and admin-route isolation, short custom names, unchanged AI lease, stale writes, cascade and deletion retry.');
 }finally{if(ids.length)await pool.query('DELETE FROM lvd_conversations WHERE id=ANY($1::uuid[])',[ids]);}
}

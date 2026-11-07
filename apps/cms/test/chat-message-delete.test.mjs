import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pool} from '../src/modules/shared/db.ts';
import {deleteInboxMessage} from '../src/modules/chat/delete-message.ts';
const actor=role=>({user:role?{id:7,role}:null,guestHash:'synthetic-guest'});
const id='11111111-2222-4333-8444-555555555555';
function fixture({files=[],backupLocked=false,failEvent=false}={}){
 let saved={version:4,body:'Synthetic private message',metadata:{kind:'ai',sources:[{title:'Synthetic'}]},generation:'in-flight',jobs:'pending',events:[]};
 let snapshot;const calls=[],original=pool.connect;
 pool.connect=async()=>({release(){},async query(sql,args=[]){
  calls.push({sql,args});
  if(sql==='BEGIN'){snapshot=structuredClone(saved);return {rows:[]};}
  if(sql==='ROLLBACK'){saved=snapshot;return {rows:[]};}
  if(sql==='COMMIT'||sql.startsWith('SELECT pg_advisory'))return {rows:[]};
  if(sql.startsWith('SELECT * FROM lvd_conversations'))return {rows:[{id,version:saved.version}]};
  if(sql.startsWith('SELECT id,metadata FROM lvd_messages'))return {rows:args[0]!==id||args[1]!=='11'?[]:[{id:11,metadata:saved.metadata}]};
  if(sql.startsWith('SELECT id,object_key'))return {rows:files};
  if(sql.startsWith('SELECT media_locked_until'))return {rows:[{locked:backupLocked}]};
  if(sql.startsWith('UPDATE lvd_messages')){saved.body='';saved.metadata=JSON.parse(args[2]);return {rows:[]};}
  if(sql.startsWith('UPDATE lvd_conversations')){saved.version++;saved.generation=null;return {rows:[{version:saved.version}]};}
  if(sql.startsWith('UPDATE lvd_answer_jobs')){saved.jobs='done';return {rows:[]};}
  if(sql.startsWith('INSERT INTO lvd_chat_events')){if(failEvent)throw Error('Synthetic database failure');saved.events.push(args);return {rows:[]};}
  throw Error('Unexpected fixture query: '+sql);
 }});
 return {get saved(){return saved;},calls,restore(){pool.connect=original;}};
}
test('guests, users and specialist preview cannot begin deletion',async()=>{
 const f=fixture();try{for(const role of [null,'member','support'])await assert.rejects(deleteInboxMessage(actor(role),id,'11',4),{status:403});assert.equal(f.calls.length,0);}finally{f.restore();}
});
test('Admin removes content and sources, cancels generation and can safely retry',async()=>{
 const f=fixture();try{
  assert.deepEqual(await deleteInboxMessage(actor('owner'),id,'11',4),{id:'11',version:5});
  assert.equal(f.saved.body,'');assert.equal(f.saved.metadata.kind,'deleted');assert.equal(f.saved.metadata.deletedBy,7);assert.equal(f.saved.metadata.sources,undefined);
  assert.equal(f.saved.generation,null);assert.equal(f.saved.jobs,'done');assert.deepEqual(f.saved.events,[[id,'delete-message:11',7,5]]);assert.equal(f.calls.at(-1).sql,'COMMIT');
  assert.equal((await deleteInboxMessage(actor('owner'),id,'11',4)).version,5);assert.equal(f.saved.events.length,1);
 }finally{f.restore();}
});
test('stale versions and IDs outside the conversation cannot delete content',async()=>{
 const f=fixture();try{
  await assert.rejects(deleteInboxMessage(actor('owner'),id,'11',3),{status:409});
  await assert.rejects(deleteInboxMessage(actor('owner'),id,'12',4),{status:404});
  await assert.rejects(deleteInboxMessage(actor('owner'),'22222222-2222-4333-8444-555555555555','11',4),{status:404});
  assert.equal(f.saved.body,'Synthetic private message');assert.equal(f.saved.version,4);
 }finally{f.restore();}
});
test('database failure rolls back content, version, job cancellation and audit',async()=>{
 const f=fixture({failEvent:true});try{
  await assert.rejects(deleteInboxMessage(actor('owner'),id,'11',4),/Synthetic database failure/);
  assert.equal(f.calls.at(-1).sql,'ROLLBACK');assert.equal(f.saved.body,'Synthetic private message');assert.equal(f.saved.version,4);assert.equal(f.saved.generation,'in-flight');assert.equal(f.saved.jobs,'pending');
 }finally{f.restore();}
});
test('an active file backup blocks removal before external storage access',async()=>{
 const f=fixture({files:[{id:'synthetic',object_key:'private-chat/synthetic'}],backupLocked:true});try{await assert.rejects(deleteInboxMessage(actor('owner'),id,'11',4),{status:409});assert.equal(f.saved.version,4);assert.equal(f.saved.body,'Synthetic private message');}finally{f.restore();}
});
test('invalid IDs and versions fail before database access',async()=>{
 const f=fixture();try{
  for(const messageId of ['0','-1','1.5','abc','9223372036854775808'])await assert.rejects(deleteInboxMessage(actor('owner'),id,messageId,4),{status:400});
  for(const version of [null,'4',4.5,NaN])await assert.rejects(deleteInboxMessage(actor('owner'),id,'11',version),{status:400});assert.equal(f.calls.length,0);
 }finally{f.restore();}
});

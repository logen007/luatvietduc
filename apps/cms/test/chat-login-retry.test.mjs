import test from 'node:test';
import assert from 'node:assert/strict';
import {pool} from '../src/modules/shared/db.ts';
import {message} from '../src/modules/chat/service.ts';
import {linkGuestConversations} from '../src/modules/chat/guest-account.ts';
import {createMessageOutbox} from '../src/modules/chat/client-operations.ts';
import {draftMatchesDelivery,handoffKey,saveDraftHandoff,takeDraftHandoff} from '../src/modules/chat/drafts.ts';
import {invalidatePublicSession} from '../src/modules/shared/session-client.ts';

const thread='11111111-2222-4333-8444-555555555555',fileId='22222222-2222-4333-8444-555555555555',guestHash='a'.repeat(64);
const attachment={id:fileId,name:'Synthetic.txt',mimeType:'text/plain',size:12,url:'/service/chat-files/'+fileId};
function storage(){const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};}

// Exercise the real send/link functions. This strict SQL fixture models only
// these branches; it opens no connection and makes no concurrency claims.
function nativeSendFixture(t,withFile){
 const conversation={id:thread,user_id:null,guest_hash:guestHash,jurisdiction:'BOTH',state:'queued',version:1,ai_enabled:false};
 const messages=Array.from({length:38},(_,index)=>({id:String(index+1),conversation_id:thread,role:index%2?'staff':'user',actor_key:index%2?'staff:7':'guest:'+guestHash,body:'Synthetic history '+index,client_key:'synthetic-history-'+index,internal:false,metadata:null}));
 const files=withFile?[{id:fileId,conversation_id:thread,actor_key:'guest:'+guestHash,message_id:null,ready:true}]:[];
 async function query(sql,args=[]){
  if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return {rows:[]};
  if(sql.startsWith('SELECT * FROM lvd_conversations'))return {rows:args[0]===thread?[conversation]:[]};
  if(sql.startsWith('SELECT * FROM lvd_messages'))return {rows:messages.filter(row=>row.conversation_id===args[0]&&row.client_key===args[1])};
  if(sql.startsWith('SELECT id FROM lvd_chat_files')){const rows=files.filter(row=>args[0].includes(row.id)&&row.conversation_id===args[1]&&row.actor_key===args[2]&&row.message_id==null&&row.ready);return {rows,rowCount:rows.length};}
  if(sql.startsWith('INSERT INTO lvd_messages')){const [conversation_id,role,body,internal,actor_key,client_key,metadata]=args;const id=String(messages.length+1);messages.push({id,conversation_id,role,body,internal,actor_key,client_key,metadata:metadata?JSON.parse(metadata):null});return {rows:[{id}]};}
  if(sql.startsWith('SELECT body FROM lvd_messages'))return {rows:messages.filter(row=>row.conversation_id===args[0]&&row.role==='user'&&!row.internal&&row.metadata?.kind!=='deleted').slice(-80).reverse().map(row=>({body:row.body}))};
  if(sql.startsWith('UPDATE lvd_conversations SET title='))return {rows:[],rowCount:1};
  if(sql.startsWith('UPDATE lvd_chat_files SET message_id=')){for(const file of files)if(args[2].includes(file.id)){file.message_id=args[0];file.internal=args[1];}return {rows:[],rowCount:files.length};}
  if(sql.startsWith('UPDATE lvd_conversations SET ai_enabled=')){conversation.ai_enabled=false;conversation.version++;return {rows:[],rowCount:1};}
  if(sql.startsWith('UPDATE lvd_conversations SET user_id=')){assert.equal(args[1],guestHash);conversation.user_id=args[0];conversation.guest_hash=null;return {rows:[{id:thread}],rowCount:1};}
  if(sql.startsWith('UPDATE lvd_messages SET actor_key=')){for(const row of messages)if(args[1].includes(row.conversation_id)&&row.role==='user'&&row.actor_key===args[2])row.actor_key=args[0];return {rows:[]};}
  if(sql.startsWith('UPDATE lvd_chat_files SET actor_key=')){for(const row of files)if(args[1].includes(row.conversation_id)&&row.actor_key===args[2])row.actor_key=args[0];return {rows:[]};}
  throw new Error('Unexpected synthetic SQL branch');
 }
 t.mock.method(pool,'connect',async()=>({query,release(){}}));
 return {messages,files};
}

for(const withFile of [false,true])test(`guest lost acknowledgment → explicit login → same-payload retry preserves delivery${withFile?' and attached file':''}`,async t=>{
 const fixture=nativeSendFixture(t,withFile),saved=storage(),draft={text:'Synthetic final guest question',attachments:withFile?[attachment]:[]},payload={body:draft.text,internal:false,fileIds:draft.attachments.map(file=>file.id)};
 let actor={user:null,guestHash},keys=0,loseResponse=true;const requests=[];
 const request=async(id,value)=>{requests.push(value);const receipt=await message(actor,id,value,2000);if(loseResponse){loseResponse=false;throw new Error('Synthetic response lost after persistence');}return receipt;};
 const guestOutbox=createMessageOutbox(request,()=>`synthetic-handoff-${++keys}`);
 await assert.rejects(guestOutbox.send(thread,payload),/response lost/);
 assert.equal(fixture.messages.length,39);
 saveDraftHandoff(saved,null,thread,draft,1000,guestOutbox.pendingKey(thread,payload));
 assert.deepEqual(await linkGuestConversations(25,guestHash),[thread]);actor={user:{id:25,role:'member'},guestHash:''};
 guestOutbox.reset();const accountOutbox=createMessageOutbox(request,()=>`synthetic-handoff-${++keys}`);
 const restored=takeDraftHandoff(saved,25,[thread],thread,2000);assert.ok(restored);
 if(restored.retry)accountOutbox.restore(thread,{body:restored.text.trim(),internal:false,fileIds:restored.attachments.map(file=>file.id)},restored.retry.key);
 const delivery=await accountOutbox.send(thread,payload);
 assert.equal(delivery.receipt.duplicate,true);assert.equal(delivery.receipt.id,'39');assert.equal(fixture.messages.length,39,'Explicit login retry must not create a second final question');
 assert.equal(requests[0].key,requests[1].key);assert.equal(keys,1);
 if(withFile){assert.equal(fixture.files[0].message_id,'39');assert.equal(fixture.files[0].actor_key,'user:25');}
});

test('handoff retry snapshots bind the exact trimmed text, reply mode and ordered attachments',()=>{
 const saved=storage(),key='synthetic-validated-retry',second={...attachment,id:'33333333-2222-4333-8444-555555555555'},draft={text:'  Synthetic pending question  ',attachments:[attachment,second]};
 saveDraftHandoff(saved,null,thread,draft,1000,key);const valid=takeDraftHandoff(saved,25,[thread],thread,2000);
 assert.deepEqual(valid.retry,{key,body:'Synthetic pending question',internal:false,fileIds:[attachment.id,second.id]});
 assert.equal(draftMatchesDelivery({...valid,text:valid.text.slice(0,10)},valid.retry.body,valid.retry.fileIds),false,'A changed message limit cannot prime a key for truncated content');
 for(const mutate of [item=>{item.draft.text+=' changed';},item=>{item.draft.attachments.reverse();},item=>{item.retry.internal=true;},item=>{item.retry.key='invalid';}]){
  saveDraftHandoff(saved,null,thread,draft,1000,key);const item=JSON.parse(saved.getItem(handoffKey));mutate(item);saved.setItem(handoffKey,JSON.stringify(item));
  const restored=takeDraftHandoff(saved,25,[thread],thread,2000);assert.ok(restored);assert.equal(restored.retry,undefined);
 }
});

test('priming an exact retry starts no request and cannot overwrite or reuse a different payload key',async()=>{
 const sent=[],key='synthetic-validated-retry',payload={body:'Synthetic retry',internal:false,fileIds:[fileId]};
 const outbox=createMessageOutbox(async(id,value)=>{sent.push({id,...value});return {id:39,role:'user',duplicate:true};});
 assert.equal(outbox.restore(thread,payload,key),true);assert.equal(sent.length,0);
 assert.equal(outbox.pendingKey(thread,payload),key);assert.equal(outbox.pendingKey(thread,{...payload,body:'Changed'}),undefined);
 assert.equal(outbox.restore(thread,payload,'synthetic-different-retry'),false);assert.equal(outbox.restore('another-thread',payload,key),false);assert.equal(outbox.restore(thread,payload,'invalid'),false);
 assert.equal((await outbox.send(thread,payload)).key,key);assert.equal(sent.length,1);assert.equal(outbox.pendingKey(thread,payload),undefined);
});

test('logout clears retry handoffs while verified login still requires actual linked ownership',()=>{
 const previous={sessionStorage:globalThis.sessionStorage,localStorage:globalThis.localStorage,document:globalThis.document};
 try{
  globalThis.localStorage={setItem(){}};globalThis.document=new EventTarget();
  for(const preserve of [false,true]){
   const saved=storage();saved.key=index=>index===0?handoffKey:null;Object.defineProperty(saved,'length',{get:()=>saved.getItem(handoffKey)?1:0});globalThis.sessionStorage=saved;
   saveDraftHandoff(saved,null,thread,{text:'Synthetic retry',attachments:[attachment]},1000,'synthetic-validated-retry');
   invalidatePublicSession(preserve?{preserveCustomerHandoffFor:thread}:undefined);
   if(!preserve)assert.equal(saved.getItem(handoffKey),null);
   else {assert.ok(saved.getItem(handoffKey));assert.equal(takeDraftHandoff(saved,25,[],thread,2000),null);}
  }
 }finally{Object.assign(globalThis,previous);}
});

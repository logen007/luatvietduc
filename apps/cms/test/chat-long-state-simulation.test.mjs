import test from 'node:test';
import assert from 'node:assert/strict';
import {createDeliveryGuard,createMessageOutbox,createOperationGate,mergeMessages,validateAttachmentBatch} from '../src/modules/chat/client-operations.ts';
import {createDraftBook,draftMatchesDelivery,saveDraftHandoff,takeDraftHandoff} from '../src/modules/chat/drafts.ts';
import {applyTransitionReceipt} from '../src/modules/chat/transition-receipt.ts';

const thread='11111111-2222-4333-8444-555555555555',other='22222222-2222-4333-8444-555555555555';
const attachment=(index)=>({id:`00000000-0000-4000-8000-${String(index).padStart(12,'0')}`,name:`Synthetic-${index}.txt`,mimeType:'text/plain',size:12,url:`/service/chat-files/00000000-0000-4000-8000-${String(index).padStart(12,'0')}`});
const row=(id,role,body,attachments=[])=>({id:String(id),role,body,attachments,created_at:'2026-11-06T00:00:00.000Z'});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function memoryStorage(){const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}

test('40-message dialogue reconciles rapid double sends, three lost acknowledgments and overlapping reads',async()=>{
 const canonical=[],savedByKey=new Map(),calls=[];let keys=0;
 const loseAckAt=new Set([5,12,19]);
 const outbox=createMessageOutbox(async(id,payload)=>{
  calls.push({id,...payload});
  const previous=savedByKey.get(payload.key);
  if(previous)return {id:previous.id,role:'staff',duplicate:true};
  const round=Number(payload.body.split(' ').at(-1));
  const message={...row(round*2,'staff',payload.body,payload.fileIds.map(id=>attachment(Number(id.slice(-12))))),client_key:payload.key};
  canonical.push(message);savedByKey.set(payload.key,message);
  if(loseAckAt.has(round))throw new Error('Synthetic response lost after persistence');
  return {id:message.id,role:'staff'};
 },()=>`synthetic-outbox-${++keys}`);
 let displayed=[];
 for(let round=1;round<=20;round++){
  const customer=row(round*2-1,'user',`Synthetic customer ${round}`);canonical.push(customer);
  displayed=mergeMessages(displayed,[customer]);
  const files=round%4===0?[attachment(round)]:[],draft={body:`Synthetic reply ${round}`,internal:false,fileIds:files.map(file=>file.id)};
  const first=outbox.send(thread,draft),rapid=outbox.send(thread,draft);
  assert.equal(first,rapid,'Two events before a render must share one request');
  let delivered;
  if(loseAckAt.has(round)){
   await assert.rejects(first,/response lost/);const key=outbox.pendingKey(thread);
   delivered=await outbox.send(thread,draft);assert.equal(delivered.key,key);assert.equal(delivered.receipt.duplicate,true);
  }else delivered=await first;
  displayed=mergeMessages(displayed,[{...row(delivered.receipt.id,'staff',draft.body,files),created_at:'2026-11-06T00:00:01.000Z'}]);
  displayed=mergeMessages(displayed,canonical.slice(-5));
  assert.equal(outbox.pendingKey(thread),undefined);assert.equal(displayed.length,round*2);
 }
 assert.equal(keys,20);assert.equal(calls.length,23);assert.equal(savedByKey.size,20);
 assert.deepEqual(displayed.map(message=>message.id),Array.from({length:40},(_,i)=>String(i+1)));
 assert.ok(displayed.every(message=>message.created_at==='2026-11-06T00:00:00.000Z'),'Canonical reads replace optimistic timestamps');
 assert.equal(displayed.filter(message=>message.attachments.length).length,5);
});

test('40 unresolved sends preserve each payload key across A/B/A draft and attachment changes',async()=>{
 const attempts=[];let keys=0,acknowledge=false;
 const outbox=createMessageOutbox(async(id,payload)=>{attempts.push({id,...payload});if(!acknowledge)throw new Error('Synthetic ambiguous result');return {id:attempts.length,role:'staff',duplicate:true};},()=>`synthetic-outbox-${++keys}`);
 const payloads=Array.from({length:40},(_,index)=>({id:index%2?thread:other,draft:{body:`Synthetic reply ${index}`,internal:false,fileIds:index%3===0?[attachment(index+1).id]:[]}}));
 for(const value of payloads)await assert.rejects(outbox.send(value.id,value.draft));
 const firstKeys=attempts.map(attempt=>attempt.key);assert.equal(new Set(firstKeys).size,40);
 acknowledge=true;
 for(let index=39;index>=0;index--){const value=payloads[index];const delivery=await outbox.send(value.id,value.draft);assert.equal(delivery.key,firstKeys[index]);}
 assert.equal(keys,40);assert.equal(outbox.pendingKey(thread),undefined);assert.equal(outbox.pendingKey(other),undefined);
});

test('close, reopen and explicit claim receipts retain a 40-message authorized history without inventing assignment',()=>{
 const staff={id:7,role:'support'},history=Array.from({length:40},(_,index)=>row(index+1,index%2?'staff':'user',`Synthetic message ${index+1}`));
 const original={id:thread,title:'Synthetic title',state:'human',version:1,assignedTo:99,assignedName:'Synthetic previous specialist',customer:{name:'Synthetic customer',email:null},aiEnabled:true,aiStartedAt:'2026-11-06T00:00:00Z',aiMessageId:'39'};
 let current=applyTransitionReceipt(original,{state:'closed',version:2},'close',staff);
 assert.equal(current.assignedTo,99);assert.equal(current.customer,original.customer);assert.equal(current.aiEnabled,false);assert.equal(current.aiMessageId,null);
 current=applyTransitionReceipt(current,{state:'queued',version:3},'reopen',staff);
 assert.equal(current.assignedTo,null);assert.equal(current.assignedName,null);assert.equal(current.restricted,undefined);
 current=applyTransitionReceipt(current,{state:'human',version:4},'claim',staff);
 assert.equal(current.assignedTo,7);assert.equal(current.version,4);assert.equal(current.customer,original.customer);
 assert.equal(mergeMessages(history,history.slice(-10)).length,40);
 const notYetAuthorized=applyTransitionReceipt({...original,restricted:true},{state:'human',version:4},'claim',staff);
 assert.equal(notYetAuthorized.restricted,true);assert.equal(notYetAuthorized.customer,undefined,'A write receipt cannot authorize a transcript that was hidden');
});

test('late acknowledgments cannot erase a newer draft or release a new session operation',async()=>{
 const gate=createOperationGate(),guard=createDeliveryGuard(),book=createDraftBook(),response=deferred(),file=attachment(1);
 const oldDraft={text:'Synthetic old reply',attachments:[file]},newDraft={text:'Synthetic newer reply',attachments:[attachment(2)]};
 book.save(thread,oldDraft);const oldOperation=gate.begin(),delivery=guard.begin(thread);
 const outbox=createMessageOutbox(()=>response.promise,()=> 'synthetic-old-session-key');
 const pending=outbox.send(thread,{body:oldDraft.text,internal:false,fileIds:[file.id]}).then(()=>{
  if(guard.isCurrent(delivery)&&draftMatchesDelivery(book.get(thread),oldDraft.text,[file.id]))book.remove(thread);
 }).finally(()=>{guard.end(delivery);gate.end(oldOperation);});
 await Promise.resolve();guard.retire(thread);outbox.reset();gate.reset();book.clear();book.save(thread,newDraft);const newOperation=gate.begin();
 response.resolve({id:40,role:'staff'});await pending;
 assert.deepEqual(book.get(thread),newDraft);assert.equal(gate.isCurrent(newOperation),true);assert.equal(gate.busy(),true);
});

test('40 thread switches keep independent cloned file drafts and guest login restores only a linked thread once',()=>{
 const book=createDraftBook();
 for(let index=1;index<=40;index++)book.save(`synthetic-thread-${index}`,{text:`Synthetic draft ${index}`,attachments:[attachment(index)]});
 for(let index=40;index>=1;index--){const saved=book.get(`synthetic-thread-${index}`);assert.equal(saved.text,`Synthetic draft ${index}`);assert.equal(saved.attachments[0].id,attachment(index).id);saved.attachments[0].name='Mutated caller value';}
 assert.equal(book.get('synthetic-thread-1').attachments[0].name,'Synthetic-1.txt');
 const storage=memoryStorage(),draft=book.get('synthetic-thread-40');saveDraftHandoff(storage,null,thread,draft,1000);
 assert.deepEqual(takeDraftHandoff(storage,7,[thread],thread,2000),draft);assert.equal(takeDraftHandoff(storage,7,[thread],thread,2000),null);
 saveDraftHandoff(storage,null,thread,draft,1000);assert.equal(takeDraftHandoff(storage,7,[other],thread,2000),null,'Login alone does not authorize another conversation');
 saveDraftHandoff(storage,7,thread,draft,1000);assert.equal(takeDraftHandoff(storage,8,[thread],thread,2000),null,'A different account cannot consume a registered user draft');
});

test('long dialogue attachment batches stay bounded and concurrent conversation files never share retry identity',async()=>{
 const calls=[];let keys=0;
 const outbox=createMessageOutbox(async(id,payload)=>{calls.push({id,...payload});throw new Error('Synthetic ambiguous save');},()=>`synthetic-file-${++keys}`);
 for(let index=1;index<=20;index++){
  const files=Array.from({length:4},(_,fileIndex)=>attachment(index*4+fileIndex));validateAttachmentBatch(files,0);
  await assert.rejects(outbox.send(index%2?thread:other,{body:'',internal:false,fileIds:files.map(file=>file.id)}));
 }
 assert.equal(new Set(calls.map(call=>call.key)).size,20);assert.equal(new Set(calls.flatMap(call=>call.fileIds)).size,80);
 assert.throws(()=>validateAttachmentBatch([attachment(99)],4),/4 tệp/);
 assert.throws(()=>validateAttachmentBatch([{name:'synthetic.txt',size:10*1024*1024+1}],0),/10 MB/);
});

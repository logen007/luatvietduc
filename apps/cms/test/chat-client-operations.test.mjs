import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperationGate,createMessageOutbox,mergeMessages,rememberCreatedConversation,normalizeInboxQuery,validateAttachmentBatch} from '../src/modules/chat/client-operations.ts';

const draft={body:'Synthetic question',internal:false,fileIds:[]};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}

test('acknowledged new conversation IDs remain navigable without inventing delivery or assignment',()=>{
 const id='11111111-2222-4333-8444-555555555555',existing={id:'22222222-2222-4333-8444-555555555555',title:'Known thread',state:'human',version:8,assignedTo:7};
 const before=[existing],rows=rememberCreatedConversation(before,id);
 assert.deepEqual(rows,[{id,title:'Cuộc trò chuyện mới',state:'queued',version:1},existing]);assert.deepEqual(before,[existing]);
 assert.equal(rememberCreatedConversation(rows,id),rows,'Repeated receipts cannot duplicate a history row');
 assert.equal(rememberCreatedConversation(rows,existing.id),rows,'A create default cannot overwrite an authoritative transcript');
 for(const invalid of ['',undefined,'unacknowledged-id'])assert.equal(rememberCreatedConversation(rows,invalid),rows);
 const full=Array.from({length:100},(_,index)=>({...existing,id:index.toString(16).padStart(8,'0')+'-2222-4333-8444-555555555555'}));
 const bounded=rememberCreatedConversation(full,id);assert.equal(bounded.length,100);assert.equal(bounded[0].id,id);assert.equal(bounded.at(-1).id,full[98].id);
});

test('inbox request normalization matches the server bound without changing editable text',()=>{
 const input='  '+'x'.repeat(130)+'  ';
 assert.equal(normalizeInboxQuery(input),'x'.repeat(120));assert.equal(input.length,134);
 assert.equal(normalizeInboxQuery('  hồ sơ  '),'hồ sơ');assert.equal(normalizeInboxQuery('   '),'');
});

test('rapid mutations share one exclusive gate and an old completion cannot unlock a new session',()=>{
 const gate=createOperationGate(),first=gate.begin();assert.ok(first);
 assert.equal(gate.begin(),null);assert.equal(gate.busy(),true);
 gate.reset();const next=gate.begin();assert.ok(next);
 assert.equal(gate.isCurrent(first),false);assert.equal(gate.end(first),false);assert.equal(gate.busy(),true);
 assert.equal(gate.end(next),true);assert.equal(gate.busy(),false);assert.ok(gate.begin());
});

test('simultaneous sends share a save request; ambiguous failure retries the same idempotency key',async()=>{
 const response=deferred(),sent=[];let first=true,keys=0;
 const outbox=createMessageOutbox(async(id,payload)=>{sent.push({id,...payload});if(first)return response.promise;return {id:'41',role:'user',duplicate:true};},()=>`synthetic-key-${++keys}`);
 const a=outbox.send('conversation-a',draft),b=outbox.send('conversation-a',draft);
 assert.equal(a,b);await Promise.resolve();assert.equal(sent.length,1);
 response.reject(new Error('connection dropped after save'));await assert.rejects(a);
 assert.equal(outbox.pendingKey(),'synthetic-key-1');first=false;
 const retried=await outbox.send('conversation-a',draft);assert.equal(retried.receipt.duplicate,true);
 assert.equal(sent[0].key,sent[1].key);assert.equal(keys,1);assert.equal(outbox.pendingKey(),undefined);
});

test('a confirmed save clears the retry state and an identical new message gets a new key',async()=>{
 let keys=0;const sent=[];
 const outbox=createMessageOutbox(async(id,payload)=>{sent.push(payload);return {id:sent.length,role:'staff'};},()=>`synthetic-key-${++keys}`);
 await outbox.send('conversation-a',draft);assert.equal(outbox.pendingKey(),undefined);
 await outbox.send('conversation-a',draft);assert.notEqual(sent[0].key,sent[1].key);
});

test('retry keys cannot cross a different conversation, body, reply mode or attachment selection',async()=>{
 let keys=0;const sent=[];
 const outbox=createMessageOutbox(async(id,payload)=>{sent.push({id,...payload});throw new Error('offline');},()=>`synthetic-key-${++keys}`);
 for(const [id,value] of [['a',draft],['b',draft],['b',{...draft,body:'Changed'}],['b',{...draft,internal:true}],['b',{...draft,internal:true,fileIds:['file-a']}],['b',{...draft,internal:true,fileIds:['file-b']}]])await assert.rejects(outbox.send(id,value));
 assert.equal(new Set(sent.map(row=>row.key)).size,6);
});

test('a late result from a reset outbox cannot clear the new account retry',async()=>{
 const old=deferred(),next=deferred();let count=0;
 const outbox=createMessageOutbox(()=>++count===1?old.promise:next.promise,()=>`synthetic-key-${count+1}`);
 const first=outbox.send('a',draft);await Promise.resolve();outbox.reset();
 const second=outbox.send('b',draft);await Promise.resolve();const key=outbox.pendingKey();
 old.resolve({id:1,role:'user'});await first;assert.equal(outbox.pendingKey(),key);
 next.reject(new Error('offline'));await assert.rejects(second);assert.equal(outbox.pendingKey(),key);
});

test('invalid save receipts keep the retry key instead of claiming successful delivery',async()=>{
 const outbox=createMessageOutbox(async()=>({id:'invalid-id',role:'user'}),()=> 'synthetic-key');
 await assert.rejects(outbox.send('a',draft),/phản hồi/);assert.equal(outbox.pendingKey(),'synthetic-key');
});

test('A/B/A retries and returning to an earlier edited draft retain their original save keys',async()=>{
 let keys=0;const sent=[];
 const outbox=createMessageOutbox(async(id,payload)=>{sent.push({id,...payload});throw new Error('Ambiguous save');},()=>`synthetic-key-${++keys}`);
 await assert.rejects(outbox.send('a',draft));const first=outbox.pendingKey('a');
 await assert.rejects(outbox.send('b',draft));assert.equal(outbox.pendingKey('a'),first);assert.notEqual(outbox.pendingKey('b'),first);
 await assert.rejects(outbox.send('a',{...draft,body:'Edited question'}));
 await assert.rejects(outbox.send('a',draft));assert.equal(sent.at(-1).key,first);assert.equal(outbox.pendingKey('a'),first);assert.equal(keys,3);
 outbox.reset('b');assert.equal(outbox.pendingKey('b'),undefined);assert.equal(outbox.pendingKey('a'),first);
 outbox.reset();assert.equal(outbox.pendingKey('a'),undefined);await assert.rejects(outbox.send('a',draft));assert.notEqual(sent.at(-1).key,first,'A changed identity cannot inherit a retry key');
});

test('the retry bound rejects new attempts without evicting an ambiguous key; acknowledgments free slots',async()=>{
 let keys=0,acknowledge=false;const sent=[];
 const outbox=createMessageOutbox(async(id,payload)=>{sent.push({id,...payload});if(acknowledge)return {id:999,role:'user'};throw new Error('Ambiguous save');},()=>`synthetic-key-${++keys}`);
 for(let index=0;index<50;index++)await assert.rejects(outbox.send(String(index),draft));
 const first=outbox.pendingKey('0');await assert.rejects(outbox.send('new',draft),/chưa xác nhận/);
 assert.equal(sent.length,50);assert.equal(keys,50);assert.equal(outbox.pendingKey('0'),first);
 acknowledge=true;await outbox.send('0',draft);assert.equal(sent.at(-1).key,first);assert.equal(outbox.pendingKey('0'),undefined);
 await outbox.send('new',draft);assert.equal(keys,51);assert.equal(outbox.pendingKey('1'),'synthetic-key-2');
});

test('attachment preflight rejects a bad later file, oversized batches and empty files before upload',()=>{
 const file=(name,size=100)=>({name,size});
 assert.doesNotThrow(()=>validateAttachmentBatch([file('A.PDF'),file('b.jpeg',10*1024*1024)],2));
 assert.throws(()=>validateAttachmentBatch([file('a.pdf'),file('b.exe')],0),/Chọn PDF/);
 assert.throws(()=>validateAttachmentBatch([file('a.pdf'),file('b.pdf',10*1024*1024+1)],0),/10 MB/);
 assert.throws(()=>validateAttachmentBatch([file('a.pdf')],4),/4 tệp/);
 assert.throws(()=>validateAttachmentBatch([file('empty.txt',0)],0),/Chọn PDF/);
});

test('overlapping transcript pages reconcile acknowledged messages without duplicates or unsafe ID ordering',()=>{
 const message=(id,body='original')=>({id,body,role:'user',created_at:'2026-11-04T00:00:00Z'});
 const initial=[message('9007199254740993'),message('9007199254740995')];
 const result=mergeMessages(initial,[message('9007199254740994'),message('9007199254740993','canonical')]);
 assert.deepEqual(result.map(row=>row.id),['9007199254740993','9007199254740994','9007199254740995']);
 assert.equal(result[0].body,'canonical');assert.equal(initial[0].body,'original');
 assert.equal(mergeMessages(initial,[]),initial);
 assert.equal(mergeMessages([message(41)],[message('41','canonical')]).length,1);
 const history=Array.from({length:10000},(_,i)=>message(String(i+1)));
 const merged=mergeMessages(history,[...history.slice(-200),message('10001')]);
 assert.equal(merged.length,10001);assert.equal(merged.at(-1).id,'10001');
});

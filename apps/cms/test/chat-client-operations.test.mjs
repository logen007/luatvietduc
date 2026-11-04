import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperationGate,createMessageOutbox,mergeMessages,validateAttachmentBatch} from '../src/modules/chat/client-operations.ts';

const draft={body:'Synthetic question',internal:false,fileIds:[]};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}

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

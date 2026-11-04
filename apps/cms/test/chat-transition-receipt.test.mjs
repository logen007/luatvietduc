import test from 'node:test';
import assert from 'node:assert/strict';
import {applyTransitionReceipt} from '../src/modules/chat/transition-receipt.ts';

const thread={id:'synthetic-thread',title:'Synthetic private title',state:'human',version:4,assignedTo:7,assignedName:'Synthetic staff',customer:{name:'Synthetic customer',email:'test@example.invalid'},aiEnabled:true,aiStartedAt:'2026-11-05T00:00:00Z',aiMessageId:'41',registered:true,createdAt:'2026-11-05T00:00:00Z'};
test('a confirmed close keeps its authoritative state without needing a follow-up read',()=>{
 const result=applyTransitionReceipt(thread,{state:'closed',version:5},'close',{id:7,role:'support'});
 assert.equal(result.state,'closed');assert.equal(result.version,5);assert.equal(result.assignedTo,7);
 assert.equal(result.customer,thread.customer);assert.equal(result.aiEnabled,false);assert.equal(result.aiMessageId,null);
 assert.equal(thread.state,'human');assert.equal(thread.version,4);
});
test('returning or reopening a staff thread immediately hides previously accessible private details',()=>{
 for(const action of ['release','reopen']){
  const result=applyTransitionReceipt(thread,{state:'queued',version:5},action,{id:7,role:'support'});
  assert.equal(result.state,'queued');assert.equal(result.version,5);assert.equal(result.assignedTo,null);assert.equal(result.restricted,true);
  assert.equal(result.customer,undefined);assert.equal(result.assignedName,undefined);assert.notEqual(result.title,thread.title);assert.equal(result.registered,true);
 }
});
test('claim acknowledgment cannot reveal data before the authorized transcript arrives',()=>{
 const restricted={id:'synthetic-thread',title:'Yêu cầu chờ tiếp nhận',state:'queued',version:4,restricted:true};
 const result=applyTransitionReceipt(restricted,{state:'human',version:5},'claim',{id:7,role:'support'});
 assert.equal(result.state,'human');assert.equal(result.assignedTo,7);assert.equal(result.restricted,true);assert.equal(result.customer,undefined);
});
test('owner and customer retain their already authorized content after a handoff',()=>{
 for(const actor of [undefined,{id:1,role:'owner'}]){
  const result=applyTransitionReceipt(thread,{state:'queued',version:5},'handoff',actor);
  assert.equal(result.customer,thread.customer);assert.equal(result.restricted,undefined);assert.equal(result.assignedTo,null);assert.equal(result.assignedName,null);
 }
});

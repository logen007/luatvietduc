import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {applyTransitionReceipt} from '../src/modules/chat/transition-receipt.ts';
import {Composer} from '../src/modules/chat/staff/Composer.tsx';
import {InboxList} from '../src/modules/chat/staff/InboxList.tsx';

const thread={id:'synthetic-thread',title:'Synthetic private title',state:'human',version:4,assignedTo:7,assignedName:'Synthetic staff',customer:{name:'Synthetic customer',email:'test@example.invalid'},aiEnabled:true,aiStartedAt:'2026-11-05T00:00:00Z',aiMessageId:'41',registered:true,createdAt:'2026-11-05T00:00:00Z'};
test('a confirmed close keeps its authoritative state without needing a follow-up read',()=>{
 const result=applyTransitionReceipt(thread,{state:'closed',version:5},'close',{id:7,role:'support'});
 assert.equal(result.state,'closed');assert.equal(result.version,5);assert.equal(result.assignedTo,7);
 assert.equal(result.customer,thread.customer);assert.equal(result.aiEnabled,false);assert.equal(result.aiMessageId,null);
 assert.equal(thread.state,'human');assert.equal(thread.version,4);
});
test('retired scoped roles still hide private details after returning or reopening a thread',()=>{
 for(const action of ['release','reopen']){
  const result=applyTransitionReceipt(thread,{state:'queued',version:5},action,{id:7,role:'reviewer'});
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
 for(const actor of [undefined,{id:1,role:'owner'},{id:7,role:'support'}]){
  const result=applyTransitionReceipt(thread,{state:'queued',version:5},'handoff',actor);
  assert.equal(result.customer,thread.customer);assert.equal(result.restricted,undefined);assert.equal(result.assignedTo,null);assert.equal(result.assignedName,null);
 }
});

const draftState=conversation=>({conversation,text:'PRIVATE-SYNTHETIC-REPLY',attachments:[{id:'synthetic-file',name:'PRIVATE-SYNTHETIC-FILE',size:12,url:'/service/chat-files/synthetic-file',mimeType:'text/plain'}],me:{user:{id:7,role:'support'}},selected:thread.id,sessionRevision:1,internal:false,busy:false,uploading:false,maxLength:2000,setText(){},setInternal(){}});
test('restricted legacy releases and not-yet-authorized claim receipts mask composer data before effects',()=>{
 for(const action of ['release','reopen','claim']){
  const base=action==='claim'?{...thread,state:'queued',restricted:true}:thread;
  const conversation=applyTransitionReceipt(base,{state:action==='claim'?'human':'queued',version:5},action,{id:7,role:action==='claim'?'support':'reviewer'});
  const html=renderToStaticMarkup(createElement(Composer,{state:draftState(conversation),canReply:false,onSent(){}}));
  assert.ok(!html.includes('PRIVATE-SYNTHETIC'),action+' cannot expose stale reply text or attachments');
 }
});
test('a completed thread or recoverable read error retains an authorized unsent draft',()=>{
 const closed=applyTransitionReceipt(thread,{state:'closed',version:5},'close',{id:7,role:'support'});
 for(const conversation of [thread,closed]){
  const html=renderToStaticMarkup(createElement(Composer,{state:{...draftState(conversation),connectionError:'Synthetic temporary read failure'},canReply:false,onSent(){}}));
  assert.ok(html.includes('PRIVATE-SYNTHETIC-REPLY'));assert.ok(html.includes('PRIVATE-SYNTHETIC-FILE'));
 }
});

test('the mobile inbox list owns one retry row for session or initialization failure',()=>{
 const inbox={rows:[],counts:{},total:0,totalPages:1,page:1,view:'queue',query:'',loading:false,error:'',refresh(){},setView(){},setQuery(){},setPage(){}};
 const html=renderToStaticMarkup(createElement(InboxList,{inbox,selected:'',onSelect(){},workspaceError:{message:'Synthetic failed session check',retry(){},busy:false}}));
 assert.match(html,/^<aside/);assert.ok(html.includes('Synthetic failed session check'));assert.ok(html.includes('class="operator-error"'));assert.equal(html.split('Thử lại').length-1,1,'The list has one shared recovery action');
});

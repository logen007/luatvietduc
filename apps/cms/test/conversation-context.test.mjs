import test from 'node:test';
import assert from 'node:assert/strict';
import {answerHistory,questionWithHistory,retrievalText,MAX_CONTEXT_BYTES,MAX_RETRIEVAL_BYTES} from '../src/modules/assistant/conversation-context.ts';
import {sourceScopes} from '../src/modules/assistant/scope.ts';
const consent='synthetic-consent';
const user=(body,approved=true)=>({role:'user',body,metadata:approved?{aiConsent:{version:consent}}:{}});
test('answers retain consented facts across assistant answers, excluding notes/staff/legacy turns',()=>{
 const rows=[user('Đầu tư tại Việt Nam'),{role:'assistant',body:'Synthetic answer',metadata:{kind:'ai'}},user('Còn chi phí?'),{role:'staff',body:'private staff text'},user('private legacy text',false),{role:'user',body:'old consent text',metadata:{aiConsent:{version:'retired'}}},{role:'assistant',body:'Synthetic answer',metadata:{kind:'ai'}},user('Sau đó tôi chuyển sang Đức')].reverse();
 const context=answerHistory(rows,consent);assert.ok(context.includes('Đầu tư tại Việt Nam'));assert.ok(context.includes('Sau đó tôi chuyển sang Đức'));assert.ok(!context.includes('private'));assert.ok(!context.includes('old consent'));
 assert.deepEqual(sourceScopes('BOTH',questionWithHistory('Còn hồ sơ?',context)),['DE','BOTH']);
 assert.deepEqual(sourceScopes('BOTH',questionWithHistory('Còn tại Việt Nam?',context)),['VN','BOTH']);
 assert.deepEqual(sourceScopes('BOTH',questionWithHistory('So sánh Việt Nam và Đức',context)),['VN','DE','BOTH']);
 assert.deepEqual(sourceScopes('VN',questionWithHistory('Đức',context)),['VN','BOTH']);
});
test('long context preserves early facts and recent corrections with bounded UTF-8 budgets',()=>{
 const rows=Array.from({length:80},(_,i)=>user(i===0?'INITIAL-FACT':i===79?'LATEST-CORRECTION':'Lượt '+i+' '+ 'dữ kiện '.repeat(200))).reverse();
 const context=answerHistory(rows,consent);assert.ok(context.includes('INITIAL-FACT'));assert.ok(context.includes('LATEST-CORRECTION'));assert.ok(Buffer.byteLength(context)<=MAX_CONTEXT_BYTES);
 const full=questionWithHistory('Câu hỏi mới '+ 'đ'.repeat(1800),context),retrieval=retrievalText(full);assert.ok(Buffer.byteLength(retrieval)<=MAX_RETRIEVAL_BYTES);assert.ok(retrieval.includes('INITIAL-FACT'));assert.ok(!retrieval.includes('\uFFFD'));assert.ok(retrieval.endsWith('đ'.repeat(100)));
});

test('explicit country corrections exclude the rejected country while comparisons stay open',()=>{
 for(const correction of ['Không phải Đức, tôi muốn hỏi về đầu tư tại Việt Nam.','Không ở Đức mà tại Việt Nam','Nicht in Deutschland, sondern in Vietnam','Not in Germany, but in Vietnam']){
  assert.deepEqual(sourceScopes('BOTH',questionWithHistory(correction,'Tôi muốn đầu tư tại Đức')),['VN','BOTH'],correction);
  assert.deepEqual(sourceScopes('BOTH',questionWithHistory('Còn chi phí?','Tôi muốn đầu tư tại Đức\n\n'+correction)),['VN','BOTH'],correction);
 }
 assert.deepEqual(sourceScopes('BOTH','So sánh Việt Nam và Đức'),['VN','DE','BOTH']);
 assert.deepEqual(sourceScopes('BOTH','Không phải Việt Nam mà tại Đức'),['DE','BOTH']);
});

test('prior answer references require current exact sources and exclude staff, rules and withdrawn revisions',async()=>{
 const {groundedPreviousAnswer}=await import('../src/modules/assistant/conversation-context.ts');
 const {faqRevision}=await import('../src/modules/assistant/faq.ts');
 const source={id:1,title:'Synthetic source',body:'Synthetic complete paragraph used for the previous answer.',question_aliases:null,jurisdiction:'BOTH',source_url:'https://example.invalid/source',updated_at:new Date(),effective_from:new Date(Date.now()-1000),review_due_at:new Date(Date.now()+86400000),expires_at:null,approved:true,_status:'published'};
 const row={role:'assistant',body:source.body,metadata:{kind:'ai',sources:[{id:1,revision:source.updated_at.toISOString()+'#'+faqRevision(source).slice(0,12)}]}};
 assert.equal(groundedPreviousAnswer(row,[source]),source.body);
 for(const sources of [[],[{...source,approved:false}],[{...source,body:source.body+' changed'}],[{...source,entry_type:'rule'}],[{...source,review_due_at:new Date(0)}]])assert.equal(groundedPreviousAnswer(row,sources),undefined);
 for(const invalid of [{...row,role:'staff'},{...row,body:'Staff or fabricated content not found in the current source.'},{...row,metadata:{...row.metadata,kind:'handoff'}},{...row,metadata:{...row.metadata,sources:[{id:1,revision:'old'}]}},{...row,body:source.body+'\n\nA private line that is not from an approved source.'}])assert.equal(groundedPreviousAnswer(invalid,[source]),undefined);
});

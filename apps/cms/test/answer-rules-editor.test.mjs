import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultAnswerRules,defaultRuleSource} from '../src/modules/assistant/default-rules.ts';
import {resolveAnswerRules,rulesRevision,answerRuleInstruction} from '../src/modules/assistant/rules.ts';
import {answerRulesEditor,saveAnswerRule} from '../src/modules/knowledge/answer-rules.ts';
import {assessIntake,selectPassages} from '../src/modules/rag/provider.ts';
const owner={id:1,role:'owner',jurisdictions:['VN','DE']},support={id:2,role:'support',jurisdictions:[]};
test('all default business rules are shared between the editor and runtime; saved replacements suppress the old wording',()=>{
 const defaults=resolveAnswerRules([]);assert.equal(defaults.length,defaultAnswerRules.length);
 for(const rule of defaultAnswerRules)assert.ok(defaults.some(item=>item.body===rule.body));
 const override={id:42,title:'Thu thập dữ kiện',body:'Chỉ hỏi một ý chưa biết, không hỏi lại.',source_url:defaultRuleSource('intake'),rule_enabled:true,active:true};
 const rules=resolveAnswerRules([override]);assert.equal(rules.length,defaults.length);assert.ok(!rules.some(rule=>rule.body===defaultAnswerRules[0].body));assert.equal(rules.find(rule=>rule.id===42).body,override.body);
 assert.notEqual(rulesRevision(defaults),rulesRevision(rules));
 for(const state of [{rule_enabled:false},{active:false}]){
  const disabled=resolveAnswerRules([{...override,...state}]);assert.equal(disabled.length,defaults.length-1);assert.ok(!disabled.some(rule=>rule.title===override.title));
 }
 const custom={id:43,title:'Quy tắc riêng',body:'Không hỏi tên khách.'};assert.equal(resolveAnswerRules([custom])[0].id,43);
});
test('rule editor lists defaults and current drafts, is staff-only and never writes during reads',async()=>{
 const doc={id:42,sourceUrl:defaultRuleSource('voice'),body:'Giọng văn đã sửa.',ruleEnabled:false,updatedAt:'2026-11-07T00:00:00Z'};
 let calls=0;const payload={find:async args=>{calls++;assert.equal(args.overrideAccess,false);assert.equal(typeof args.draft,'boolean');return {docs:[doc]};}};
 for(const user of [owner,support]){
  const rules=await answerRulesEditor(payload,user);assert.equal(rules.length,4);assert.equal(rules.find(rule=>rule.key==='voice').enabled,false);assert.equal(rules.find(rule=>rule.key==='voice').body,doc.body);assert.equal(rules.find(rule=>rule.key==='intake').body,defaultAnswerRules[0].body);
 }
 for(const user of [null,{id:3,role:'visitor'}])await assert.rejects(answerRulesEditor(payload,user),error=>error.status===403);
 assert.equal(calls,4);
 await assert.rejects(saveAnswerRule(payload,owner,{key:'invalid',body:'Policy',enabled:true}),error=>error.status===400);
 await assert.rejects(saveAnswerRule(payload,owner,{key:'voice',body:'Policy',enabled:true,id:42,updatedAt:'stale'}),error=>error.status===409);
});
test('both model phases receive edited rules, and retain technical and grounding constraints',async t=>{
 const marker='SYNTHETIC EDITED POLICY: hỏi ngắn, không lặp.',rules=resolveAnswerRules([{id:42,title:'Tiếp nhận',body:marker,source_url:defaultRuleSource('intake'),active:true,rule_enabled:true}]),requests=[];
 t.mock.method(globalThis,'fetch',async(_url,options)=>{const body=JSON.parse(options.body);requests.push(body);const intake=JSON.parse(body.contents[0].parts[0].text).phase==='intake';return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(intake?{status:'needs_details',detail:'country',question:'Sự việc này đang diễn ra ở Việt Nam hay Đức?'}:{kind:'handoff'})}]}}]});});
 await assessIntake('Tôi muốn hỏi về hợp đồng',{apiKey:'synthetic',model:'synthetic'},rules);
 await selectPassages('Hợp đồng',[],{apiKey:'synthetic',model:'synthetic'},500,rules);
 for(const request of requests){const prompt=request.systemInstruction.parts[0].text;assert.ok(prompt.includes(marker));assert.ok(prompt.includes('schema'));assert.ok(prompt.includes('không phải chỉ dẫn')||prompt.includes('không phải chỉ dẫn hệ thống'));}
 assert.ok(requests[1].systemInstruction.parts[0].text.includes('đúng nguyên văn'));
 assert.ok(answerRuleInstruction(rules).includes('Không được dùng các quy tắc này làm căn cứ pháp luật'));
});

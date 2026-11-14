import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultAnswerRules} from '../src/modules/assistant/default-rules.ts';
import {answerRuleList,answerRuleReceipt} from '../src/modules/knowledge/answer-rules-client.ts';
const rules=defaultAnswerRules.map(rule=>({...rule,id:null,updatedAt:null,reviewDueAt:null,pending:false,enabled:true,appliedEnabled:true}));
test('invalid rule lists fail before rendering; defaults and persisted drafts remain valid',()=>{
 assert.deepEqual(answerRuleList({rules}),rules);
 for(const value of [null,{},[],{rules:[]},{rules:[{}]},{rules:rules.map((row,index)=>index?row:{...row,body:null})},{rules:rules.map(()=>rules[0])},{rules:rules.map((row,index)=>index?row:{...row,key:'unknown'})}])assert.throws(()=>answerRuleList(value),/Chưa đọc được quy tắc/);
});
test('incomplete or wrong rule save receipts cannot replace a typed draft or claim application',()=>{
 const initial={...rules[0],id:12},valid={id:12,body:'Đã chỉnh sửa.',updatedAt:'2026-11-07T00:00:00Z',reviewDueAt:'2027-01-01T00:00:00Z',ruleEnabled:true};
 for(const value of [null,{},[],{...valid,id:13},{...valid,body:undefined},{...valid,updatedAt:'invalid'},{...valid,ruleEnabled:false},{...valid,ruleEnabled:'true'}])assert.throws(()=>answerRuleReceipt(value,initial,true),/Nội dung đang sửa được giữ nguyên/);
 const saved=answerRuleReceipt(valid,initial,true);assert.equal(saved.body,valid.body);assert.equal(saved.pending,false);assert.equal(saved.enabled,true);
 assert.equal(answerRuleReceipt({...valid,ruleEnabled:false},initial,false).appliedEnabled,false);
 assert.equal(initial.body,rules[0].body,'Receipt validation never mutates the original draft');
});

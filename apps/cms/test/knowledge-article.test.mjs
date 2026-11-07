import {test} from 'node:test';
import assert from 'node:assert/strict';
import {knowledgeArticleInput} from '../src/modules/knowledge/article-input.ts';
const staff={id:2,role:'support',jurisdictions:['VN']};
test('two-field article input uses shared knowledge scope and review defaults',()=>{
 const value=knowledgeArticleInput({title:'Synthetic title',body:'Synthetic article',publish:true},staff);
 assert.equal(value.jurisdiction,'BOTH');assert.equal(value._status,'published');assert.equal(value.approved,true);assert.match(value.sourceUrl,/\/admin\/knowledge#[a-f0-9-]{36}$/);assert.ok(new Date(value.reviewDueAt)>new Date());
});
test('simple authoring cannot widen permissions or accept invented external source protocols',()=>{
 for(const user of [{...staff,role:'member'},{...staff,role:'knowledge',jurisdictions:[]}])assert.throws(()=>knowledgeArticleInput({title:'Title',body:'Body',jurisdiction:'VN'},user));
 for(const change of [{body:''},{sourceUrl:'javascript:alert(1)'},{sourceUrl:'https://user:pass@example.invalid'},{reviewDueAt:'invalid'}])assert.throws(()=>knowledgeArticleInput({title:'Title',body:'Body',...change},staff));
});
test('source and policy dates of an existing article are preserved',()=>{
 const original={jurisdiction:'VN',sourceUrl:'https://example.invalid/real-source',effectiveFrom:'2026-01-01T00:00:00.000Z',reviewDueAt:'2027-01-01T00:00:00.000Z'};
 const value=knowledgeArticleInput({title:'Title',body:'Body',publish:false},staff,original);assert.equal(value.sourceUrl,original.sourceUrl);assert.equal(value.effectiveFrom,original.effectiveFrom);assert.equal(value._status,'draft');assert.equal(value.approved,false);
});

test('authoring ignores obsolete visitor country selectors',()=>assert.equal(knowledgeArticleInput({title:'Title',body:'Body',jurisdiction:'DE'},staff).jurisdiction,'BOTH'));

test('editing private knowledge preserves a real expiry date unless explicitly changed',()=>{
 const original={sourceUrl:'https://example.invalid/real-source',expiresAt:'2026-12-31T00:00:00.000Z'};
 assert.equal(knowledgeArticleInput({title:'Title',body:'Body',publish:true},staff,original).expiresAt,original.expiresAt);
});

test('specialists without assigned jurisdictions can author and publish knowledge',()=>{const value=knowledgeArticleInput({title:'Title',body:'Body',publish:true},{...staff,jurisdictions:[]});assert.equal(value.approved,true);assert.equal(value._status,'published');});

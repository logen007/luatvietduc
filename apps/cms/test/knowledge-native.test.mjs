import test from 'node:test';
import assert from 'node:assert/strict';
import {knowledgeDefaults,knowledgeBody} from '../src/modules/knowledge/content.ts';
import {knowledgeArticleInput} from '../src/modules/knowledge/article-input.ts';
import {validateKnowledgeRule,stageNativeRule} from '../src/modules/knowledge/rules-hook.ts';
import {faqBody,publicFaq} from '../src/modules/assistant/faq.ts';
import {activeAnswerRules,answerRuleInstruction} from '../src/modules/assistant/rules.ts';
import configPromise from '../src/payload.config.ts';
const rich=text=>'<div data-lvd-richtext="1"><p><strong>'+text+'</strong></p></div>',user={id:1,role:'support',jurisdictions:['VN']};

test('native knowledge create needs title/body only and preserves legacy IDs/dates/source on edit',()=>{
 const now=new Date('2026-11-06T00:00:00Z'),data=knowledgeDefaults({title:'Private title',body:rich('Private answer')},undefined,now);
 assert.equal(data.jurisdiction,'BOTH');assert.match(data.sourceUrl,/^https:\/\/[^/]+\/admin\/knowledge#/);assert.equal(data.effectiveFrom,now.toISOString());assert.equal(data.reviewDueAt,'2027-02-04T00:00:00.000Z');
 const original={id:45,sourceUrl:'https://example.invalid/source',effectiveFrom:'2026-01-01T00:00:00Z',reviewDueAt:'2027-01-01T00:00:00Z'};
 const draft=knowledgeDefaults({title:'Updated',body:'Legacy text'},original,now);assert.equal(draft.sourceUrl,original.sourceUrl);assert.equal(draft.effectiveFrom,original.effectiveFrom);assert.equal(draft.reviewDueAt,original.reviewDueAt);assert.equal(original.id,45);
 assert.equal(knowledgeDefaults({_status:'published',reviewDueAt:original.reviewDueAt},original,now).reviewDueAt,'2027-02-04T00:00:00.000Z');
});
test('native taxonomy/list fields reuse articles while mirrored entries stay outside only the admin list',async()=>{
 const knowledge=(await configPromise).collections.find(collection=>collection.slug==='knowledge');assert.ok(knowledge);
 assert.deepEqual(knowledge.admin.baseFilter(),{articleOrigin:{exists:false}});assert.deepEqual(knowledge.admin.defaultColumns,['title','categories','tags','_status','entryType','updatedAt']);
 for(const name of ['categories','tags']){const field=knowledge.fields.find(field=>field.name===name);assert.equal(field.type,'relationship');assert.equal(field.relationTo,name);assert.equal(field.hasMany,true);assert.equal(field.admin.position,'sidebar');}
 assert.equal(knowledge.access.create({req:{user}}),true);assert.equal(knowledge.access.create({req:{user:{...user,jurisdictions:['unknown']}}}),false);
 assert.equal(knowledge.access.read({req:{user:null}}),false);
});
test('custom knowledge Save Draft intent cannot become publication after native status normalization',async()=>{
 const knowledge=(await configPromise).collections.find(collection=>collection.slug==='knowledge'),workflow=knowledge.hooks.beforeChange[1];
 const data=workflow({data:{title:'Private draft',body:'Unpublished content',jurisdiction:'BOTH',approved:false,_status:'published'},originalDoc:{},req:{user,context:{knowledgeApiPublish:false}}});
 assert.equal(data._status,'draft');assert.equal(data.approved,false);
});
test('marked private bodies are sanitized and become whole plain evidence; arbitrary old HTML stays literal',()=>{
 const body=knowledgeBody('<div data-lvd-richtext="1"><p>Answer.</p><script>SECRET_SCRIPT</script><p><strong>Required condition.</strong></p><img src="javascript:alert(1)" onerror="alert(1)"></div>');
 assert.ok(!body.includes('SECRET_SCRIPT'));assert.ok(!body.includes('javascript:'));assert.ok(!body.includes('onerror'));
 assert.equal(faqBody({body}),'Answer.\n\nRequired condition.');assert.deepEqual(publicFaq({title:'Private',jurisdiction:'BOTH',body}).paragraphs,['Answer.','Required condition.']);
 assert.equal(faqBody({body:'<p>Literal legacy text</p>'}),'<p>Literal legacy text</p>');
 assert.throws(()=>knowledgeBody(rich('x'.repeat(4001)),'rule'),/4.000/);assert.throws(()=>knowledgeBody('<div data-lvd-richtext="1"><script>Only script</script></div>'),/Nhập nội dung/);
});
test('legacy knowledge service preserves taxonomy links and accepts rich content without privilege or origin overrides',()=>{
 const original={categories:[{id:2}],tags:[3],sourceUrl:'https://example.invalid/source'},value=knowledgeArticleInput({title:'Private',body:rich('Answer'),publish:true,articleOrigin:7,approved:true},user,original);
 assert.deepEqual(value.categories,[2]);assert.deepEqual(value.tags,[3]);assert.equal(value.articleOrigin,undefined);assert.equal(value.jurisdiction,'BOTH');assert.equal(value._status,'published');
 assert.deepEqual(knowledgeArticleInput({title:'Private',body:'Answer',categories:[],tags:[3,3]},user,original).tags,[3]);assert.throws(()=>knowledgeArticleInput({title:'Private',body:'Answer',categories:['wrong']},user));
});
const request=context=>({user,context,transactionID:'synthetic',payload:{db:{sessions:{synthetic:{db:{execute:async()=>({rows:[]})}}}}}});
test('native rules retain staged checkbox choices and publish the explicit checkbox/API intent',async()=>{
 const original={id:2,title:'Rule',body:rich('Old policy'),entryType:'rule',ruleEnabled:true,_status:'draft'};
 for(const [data,context,enabled] of [
  [{title:'Rule',body:rich('New policy'),entryType:'rule',ruleEnabled:true,_status:'published'},{},true],
  [{title:'Rule',body:rich('New policy'),entryType:'rule',ruleEnabled:false,_status:'published'},{},false],
  [{body:rich('New policy'),ruleEnabled:true,_status:'draft'},{},true],
  [{body:original.body,ruleEnabled:true,_status:'draft'},{},true],
  [{body:rich('New policy'),ruleEnabled:true,_status:'draft'},{knowledgeApiPublish:true},true],
  [{body:rich('New policy'),ruleEnabled:true,_status:'draft'},{knowledgeApiPublish:false},false],
 ]){const result=await validateKnowledgeRule({data,originalDoc:original,req:request(context)});assert.equal(result.ruleEnabled,enabled);assert.equal(result._status,'draft');assert.equal(result.approved,false);}
 const created=await validateKnowledgeRule({data:{entryType:'rule',body:rich('Explicit policy'),ruleEnabled:true,_status:'draft'},req:request({})});assert.equal(created.ruleEnabled,true);
 const staged=await validateKnowledgeRule({data:{entryType:'rule',body:rich('Staged policy'),ruleEnabled:true,_status:'draft'},req:request({knowledgeDraftOnly:true})});assert.equal(staged.ruleEnabled,true);
 const calls=[],req=request({knowledgeDraftOnly:true});req.payload.db.sessions.synthetic.db.execute=async query=>{calls.push(query);return {rows:[]};};
 const doc={id:22,entryType:'rule',ruleEnabled:true};assert.equal(await stageNativeRule({doc,operation:'create',req}),doc);assert.equal(calls.length,1);assert.equal(doc.ruleEnabled,true,'The draft version keeps the staged choice');
 await stageNativeRule({doc,operation:'update',req});assert.equal(calls.length,1,'Draft updates already preserve the existing main rule');
});
test('operator rule prompts receive plain paragraphs without markup or discarded scripts',async()=>{
 const body=rich('Use complete evidence.'),db={query:async()=>({rows:[{id:1,title:'Rule',body}]})},rules=await activeAnswerRules('BOTH','Question',db);
 assert.equal(rules[0].body,'Use complete evidence.');const instruction=answerRuleInstruction(rules);assert.ok(instruction.includes('Use complete evidence.'));assert.ok(!instruction.includes('<p>'));assert.ok(!instruction.includes('data-lvd-richtext'));
});

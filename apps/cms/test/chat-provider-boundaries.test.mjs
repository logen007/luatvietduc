import test from 'node:test';
import assert from 'node:assert/strict';
import {selectPassages,embed} from '../src/modules/rag/provider.ts';
import {formatFaq} from '../src/modules/assistant/format.ts';
import {pool} from '../src/modules/shared/db.ts';
import {DIMENSIONS} from '../src/modules/rag/core.ts';
import {QuickReplies} from '../src/modules/quick-replies/collection.ts';

const connection={apiKey:'synthetic-mock-only-key',model:'synthetic-model'};
const evidence=[{key:'source-1',sourceId:1,title:'Synthetic approved source',text:'Synthetic approved answer for this question.\n\nSynthetic mandatory exception must remain.',revision:'approved-revision',score:0.95,customerRecord:'PRIVATE-FIELD-MUST-NOT-LEAVE',objectKey:'PRIVATE-OBJECT-KEY'}];
const selection={kind:'answer',passages:evidence[0].text.split('\n\n').map(quote=>({key:'source-1',quote}))};
const generated=(value,finishReason='STOP')=>({candidates:[{finishReason,content:{parts:[{text:JSON.stringify(value)}]}}]});

test('mocked RAG request includes only the consented question and whitelisted evidence; rules remain instructions',async t=>{
 let calls=0;
 const rule={id:8,title:'Synthetic policy',body:'Handoff when approved sources conflict.'};
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  calls++;assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/synthetic-model:generateContent');
  assert.equal(options.redirect,'error');assert.equal(options.headers['x-goog-api-key'],connection.apiKey);assert.ok(options.signal instanceof AbortSignal);
  const body=JSON.parse(options.body),instruction=body.systemInstruction.parts[0].text,prompt=JSON.parse(body.contents[0].parts[0].text);
  assert.deepEqual(prompt,{question:'Synthetic consented question',sources:[{key:'source-1',title:evidence[0].title,text:evidence[0].text}]});
  assert.ok(instruction.includes(rule.body));assert.ok(!body.contents[0].parts[0].text.includes(rule.body));
  assert.ok(!options.body.includes('PRIVATE-'));assert.equal(body.generationConfig.maxOutputTokens,2000);
  return Response.json(generated(selection));
 });
 assert.deepEqual(await selectPassages('Synthetic consented question',evidence,connection,99999,[rule]),selection);assert.equal(calls,1);
});

test('provider quotas and outages fail once without exposing response diagnostics or automatic retry',async t=>{
 for(const status of [401,403,429,500,503]){
  let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('SYNTHETIC-PRIVATE-UPSTREAM-DIAGNOSTICS',{status});});
  await assert.rejects(selectPassages('Synthetic question',evidence,connection,700),error=>error.message===(status===429?'Provider quota':'Provider unavailable')&&!error.message.includes('PRIVATE'));
  assert.equal(calls,1);t.mock.restoreAll();
 }
});

test('malformed, truncated, invented and incomplete model answers fail closed before becoming chat text',async t=>{
 for(const response of [null,{},generated(selection,'MAX_TOKENS'),generated({kind:'answer',passages:[]}),generated({kind:'answer',passages:[{key:'source-1',quote:'Invented unsupported legal conclusion.'}]}),generated({...selection,passages:selection.passages.slice(0,1)})]){
  let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json(response);});
  await assert.rejects(selectPassages('Synthetic question',evidence,connection,700));assert.equal(calls,1);t.mock.restoreAll();
 }
});

test('explicit handoff and country clarification discard unsolicited generated answer fields',async t=>{
 for(const kind of ['handoff','clarify-country']){
  t.mock.method(globalThis,'fetch',async()=>Response.json(generated({kind,answer:'Invented legal claim must not become a response.',passages:selection.passages})));
  assert.deepEqual(await selectPassages('Synthetic question',evidence,connection,700),{kind});t.mock.restoreAll();
 }
});

test('mocked document embedding sends only explicit content and rejects malformed vectors',async t=>{
 const values=Array.from({length:DIMENSIONS},(_,index)=>index===0?1:0);let calls=0;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  calls++;assert.ok(url.endsWith(':embedContent'));assert.equal(options.redirect,'error');
  const body=JSON.parse(options.body);assert.deepEqual(body.content,{parts:[{text:'Synthetic approved document'}]});assert.equal(body.title,'Synthetic public title');assert.equal(body.taskType,'RETRIEVAL_DOCUMENT');assert.equal(body.outputDimensionality,DIMENSIONS);
  return Response.json({embedding:{values}});
 });
 assert.deepEqual(await embed('Synthetic approved document','RETRIEVAL_DOCUMENT',connection,'Synthetic public title'),values);assert.equal(calls,1);
 t.mock.restoreAll();t.mock.method(globalThis,'fetch',async()=>Response.json({embedding:{values:[1]}}));
 await assert.rejects(embed('Synthetic query','RETRIEVAL_QUERY',connection),/Invalid embedding/);
});

test('legacy FAQ formatting never transmits customer fields and rule revisions invalidate the format cache',async t=>{
 const faq={id:6110601,title:'Synthetic canonical FAQ',body:'Synthetic approved first paragraph.\n\nSynthetic mandatory second paragraph.',jurisdiction:'VN',question_aliases:'Synthetic approved alias',source_url:'https://example.invalid/source',updated_at:new Date('2026-11-01'),effective_from:new Date('2026-01-01'),review_due_at:new Date('2030-01-01'),expires_at:null,approved:true,_status:'published',customerQuestion:'PRIVATE-CUSTOMER-QUESTION',transcript:'PRIVATE-TRANSCRIPT',files:['PRIVATE-FILE']};
 let budget=0,requests=0;
 t.mock.method(pool,'query',async sql=>{assert.match(sql,/INSERT INTO lvd_ai_usage/);budget++;return {rowCount:1};});
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  requests++;const body=JSON.parse(options.body),prompt=JSON.parse(body.contents[0].parts[0].text);
  assert.deepEqual(prompt,{title:faq.title,jurisdiction:'VN',paragraphs:faq.body.split('\n\n')});assert.ok(!options.body.includes('PRIVATE-'));
  return Response.json(generated({sections:[{title:'Giải đáp',paragraphs:[0,1]}]}));
 });
 const first=await formatFaq(faq,connection,700,10),same=await formatFaq(faq,connection,700,10);
 assert.equal(first,same);assert.equal(requests,1);assert.equal(budget,1);
 const rule={id:1,title:'Policy',body:'Synthetic changed rule',updated_at:new Date('2026-11-06')};
 await formatFaq(faq,connection,700,10,[rule]);assert.equal(requests,2);assert.equal(budget,2);
});

test('quick reply catalog permits enabled templates to specialists and reserves every write for Admin',()=>{
 const request=role=>({req:{user:role?{id:1,role}:null}});
 assert.equal(QuickReplies.access.read(request('owner')),true);assert.deepEqual(QuickReplies.access.read(request('support')),{enabled:{equals:true}});
 for(const role of [undefined,'member','editor','reviewer'])assert.equal(QuickReplies.access.read(request(role)),false);
 for(const action of ['create','update','delete']){
  assert.equal(QuickReplies.access[action](request('owner')),true);
  for(const role of [undefined,'member','support'])assert.equal(QuickReplies.access[action](request(role)),false);
 }
 assert.deepEqual(QuickReplies.fields.map(field=>field.name),['title','body','enabled']);
});

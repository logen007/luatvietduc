import {test} from 'node:test';
import assert from 'node:assert/strict';
import {translatedText,translateArticleText} from '../src/modules/content/translation-provider.ts';
import {mergeValues} from '../src/modules/integrations/validation.ts';
import {translationModel} from '../src/modules/integrations/translation-policy.ts';
import {checkConnection} from '../src/modules/integrations/check.ts';
const connection={vendor:'groq',apiKey:'gsk_synthetic_translation_key',model:translationModel};
const article={title:'Synthetic title',body:'Synthetic paragraphs.\n\nSecond paragraph.'};
const translated={title:'Deutscher Titel',body:'Vollständiger Text.'};
const result=value=>({choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(value)}}]});
test('translation rejects incomplete and oversized output without accepting missing text',()=>{
 for(const value of [null,{}, {title:'',body:'text'},{title:'title',body:' '},{title:'x'.repeat(241),body:'text'},{title:'title',body:'x'.repeat(16001)}])assert.throws(()=>translatedText(value));
 assert.deepEqual(translatedText({title:' Title ',body:'First\n\nSecond'}),{title:'Title',body:'First\n\nSecond'});
});
test('translation defaults to the pinned free-eligible model and only preserves its own Groq key',()=>{
 assert.deepEqual(mergeValues('translation',connection,{apiKey:'',model:''}),connection);
 assert.deepEqual(mergeValues('translation',{}, {apiKey:connection.apiKey}),connection);
 for(const previous of [{},{vendor:'xai',apiKey:'old-xai-key'},{vendor:'gemini',apiKey:'old-google-key'},{apiKey:'vendorless-key'}])assert.throws(()=>mergeValues('translation',previous,{apiKey:'',model:''}));
 for(const vendor of ['xai','gemini'])assert.deepEqual(mergeValues('translation',{vendor,apiKey:'old-provider-key'},{apiKey:connection.apiKey,model:''}),connection);
 for(const model of ['grok-4.7','gemini-3.1-flash-lite','llama-3.3-70b-versatile','openai/gpt-oss-20b','https://attacker.invalid'])assert.throws(()=>mergeValues('translation',{}, {apiKey:connection.apiKey,model}));
 for(const apiKey of ['grok_synthetic','xai-synthetic','crsr_synthetic','AIzaSyntheticGoogleKey','gsk_','gsk_bad key'])assert.throws(()=>mergeValues('translation',{}, {apiKey}));
});
test('Groq sends only explicit article data with its separate key, strict JSON schema and bounded output',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(new Headers(options.headers).get('authorization'),'Bearer '+connection.apiKey);assert.equal(new Headers(options.headers).get('x-goog-api-key'),null);
  const body=JSON.parse(options.body);assert.equal(body.model,translationModel);assert.equal(body.response_format.type,'json_schema');assert.equal(body.response_format.json_schema.strict,true);assert.equal(body.response_format.json_schema.schema.additionalProperties,false);assert.deepEqual(body.response_format.json_schema.schema.required,['title','body']);
  assert.equal(body.reasoning_effort,'low');assert.equal(body.max_completion_tokens,4096);assert.equal(body.store,undefined);
  assert.deepEqual(JSON.parse(body.messages[1].content),article);assert.match(body.messages[0].content,/German/);assert.equal(body.tools,undefined);assert.equal(options.redirect,'error');assert.ok(!String(url).includes(connection.apiKey));
  return Response.json(result(translated));
 };
 try{assert.deepEqual(await translateArticleText({...article,privateField:'must not be sent'},'de',connection),translated);}finally{globalThis.fetch=original;}
});
test('Groq quota, auth and unavailable-model errors never retry or leak upstream diagnostics',async()=>{
 const original=globalThis.fetch;
 try{for(const status of [429,401,403,404,500]){
  let calls=0;globalThis.fetch=async()=>{calls++;return new Response('sensitive-provider-diagnostics',{status});};
  await assert.rejects(()=>translateArticleText(article,'de',connection),error=>error.status===(status===429?429:502)&&!error.message.includes('sensitive'));
  assert.equal(calls,1);
 }}finally{globalThis.fetch=original;}
});
test('legacy Gemini, xAI and vendorless credentials are rejected before any external request',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('must not call');};
 try{
  for(const values of [{vendor:'xai',apiKey:'old-xai-key',model:'grok-4.7'},{vendor:'gemini',apiKey:'old-google-key',model:'gemini-3.1-flash-lite'},{apiKey:connection.apiKey,model:translationModel},{...connection,apiKey:'grok_synthetic'},{...connection,apiKey:'xai-synthetic'},{...connection,apiKey:'AIzaSyntheticGoogleKey'},{...connection,model:'llama-3.3-70b-versatile'}]){
   await assert.rejects(()=>translateArticleText(article,'de',values));
   await assert.rejects(()=>checkConnection('translation',values,'synthetic@example.invalid'));
  }
  assert.equal(calls,0);
 }finally{globalThis.fetch=original;}
});
test('Groq rejects truncated, refused, multiple-choice, tool-call and malformed responses',async()=>{
 const original=globalThis.fetch;
 const choice=result(translated).choices[0];
 try{
  for(const response of [null,{}, {error:{message:'upstream'}}, {choices:[{...choice,finish_reason:'length'}]}, {choices:[{...choice,finish_reason:'content_filter'}]}, {choices:[choice,choice]}, {choices:[{...choice,message:{role:'user',content:choice.message.content}}]}, result({title:'Only title'}), {choices:[{...choice,message:{...choice.message,refusal:'no'}}]}, {choices:[{...choice,message:{...choice.message,tool_calls:[{id:'unexpected'}]}}]}, {choices:[{...choice,message:{...choice.message,function_call:{name:'unexpected'}}}]}, {choices:[{...choice,message:{...choice.message,content:'not JSON'}}]}, {choices:[{...choice,message:{...choice.message,content:[{text:choice.message.content}]}}]}]){
   globalThis.fetch=async()=>Response.json(response);await assert.rejects(()=>translateArticleText(article,'vi',connection),error=>error.status===502);
  }
  globalThis.fetch=async()=>new Response('x'.repeat(256001));await assert.rejects(()=>translateArticleText(article,'vi',connection),error=>error.status===502);
 }finally{globalThis.fetch=original;}
});
test('Groq reasoning cannot enter the translated article and cancellation reaches the request',async()=>{
 const original=globalThis.fetch,controller=new AbortController();let signal;
 globalThis.fetch=async(url,options)=>{signal=options.signal;return Response.json({choices:[{finish_reason:'stop',message:{role:'assistant',reasoning:'Private reasoning, never an article',content:JSON.stringify(translated)}}]});};
 try{
  assert.deepEqual(await translateArticleText(article,'de',connection,controller.signal),translated);
  controller.abort();assert.equal(signal.aborted,true);
 }finally{globalThis.fetch=original;}
});
test('Groq connection check reads bounded active-model metadata without generating or sending an article',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{
  for(const active of [true,false]){
   globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'https://api.groq.com/openai/v1/models');assert.equal(new Headers(options.headers).get('authorization'),'Bearer '+connection.apiKey);assert.equal(options.body,undefined);return Response.json({data:[{id:translationModel,active}]});};
   assert.equal((await checkConnection('translation',connection,'synthetic@example.invalid')).state,active?'passed':'failed');
  }
  globalThis.fetch=async()=>Response.json({data:[{id:'different-model',active:true}]});assert.equal((await checkConnection('translation',connection,'synthetic@example.invalid')).state,'failed');
  globalThis.fetch=async()=>new Response('x'.repeat(256001));assert.equal((await checkConnection('translation',connection,'synthetic@example.invalid')).state,'failed');
  assert.equal(calls,2);
 }finally{globalThis.fetch=original;}
});

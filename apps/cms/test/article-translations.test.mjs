import {test} from 'node:test';
import assert from 'node:assert/strict';
import {translatedText,translateArticleText} from '../src/modules/content/translation-provider.ts';
import {mergeValues} from '../src/modules/integrations/validation.ts';
import {translationModel} from '../src/modules/integrations/translation-policy.ts';
import {checkConnection} from '../src/modules/integrations/check.ts';
const connection={vendor:'gemini',apiKey:'synthetic-key',model:translationModel};
const article={title:'Synthetic title',body:'Synthetic paragraphs.\n\nSecond paragraph.'};
const translated={title:'Deutscher Titel',body:'Vollständiger Text.'};
const result=value=>({candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:JSON.stringify(value)}]}}]});
test('translation rejects incomplete and oversized output without accepting missing text',()=>{
 for(const value of [null,{}, {title:'',body:'text'},{title:'title',body:' '},{title:'x'.repeat(241),body:'text'},{title:'title',body:'x'.repeat(16001)}])assert.throws(()=>translatedText(value));
 assert.deepEqual(translatedText({title:' Title ',body:'First\n\nSecond'}),{title:'Title',body:'First\n\nSecond'});
});
test('translation defaults to the pinned free-eligible model and only preserves its own Google key',()=>{
 assert.deepEqual(mergeValues('translation',{vendor:'gemini',apiKey:'translation-key',model:translationModel},{apiKey:'',model:''}),{vendor:'gemini',apiKey:'translation-key',model:translationModel});
 assert.deepEqual(mergeValues('translation',{}, {apiKey:'new-google-key'}),{vendor:'gemini',apiKey:'new-google-key',model:translationModel});
 for(const previous of [{},{vendor:'xai',apiKey:'old-xai-key'},{apiKey:'vendorless-key'}])assert.throws(()=>mergeValues('translation',previous,{apiKey:'',model:''}));
 assert.deepEqual(mergeValues('translation',{vendor:'xai',apiKey:'old-xai-key'},{apiKey:'new-google-key',model:''}),{vendor:'gemini',apiKey:'new-google-key',model:translationModel});
 for(const model of ['grok-4.7','gemini-3.1-pro-preview','gemini-3.8-flash','https://attacker.invalid'])assert.throws(()=>mergeValues('translation',{}, {apiKey:'key',model}));
 for(const apiKey of ['grok_synthetic','xai-synthetic','crsr_synthetic'])assert.throws(()=>mergeValues('translation',{}, {apiKey}));
});
test('Gemini sends only explicit article data with the separate key and structured output',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/'+translationModel+':generateContent');
  assert.equal(new Headers(options.headers).get('x-goog-api-key'),'synthetic-key');assert.equal(new Headers(options.headers).get('authorization'),null);
  const body=JSON.parse(options.body);assert.equal(body.generationConfig.responseMimeType,'application/json');assert.deepEqual(body.generationConfig.responseSchema.required,['title','body']);assert.equal(body.generationConfig.candidateCount,1);
  assert.deepEqual(JSON.parse(body.contents[0].parts[0].text),article);assert.match(body.systemInstruction.parts[0].text,/German/);assert.equal(body.tools,undefined);assert.equal(options.redirect,'error');assert.ok(!String(url).includes('synthetic-key'));
  return Response.json(result(translated));
 };
 try{assert.deepEqual(await translateArticleText({...article,privateField:'must not be sent'},'de',connection),translated);}finally{globalThis.fetch=original;}
});
test('Gemini quota, auth and unavailable-model errors never retry or leak upstream diagnostics',async()=>{
 const original=globalThis.fetch;
 try{for(const status of [429,401,403,404,500]){
  let calls=0;globalThis.fetch=async()=>{calls++;return new Response('sensitive-provider-diagnostics',{status});};
  await assert.rejects(()=>translateArticleText(article,'de',connection),error=>error.status===(status===429?429:502)&&!error.message.includes('sensitive'));
  assert.equal(calls,1);
 }}finally{globalThis.fetch=original;}
});
test('old provider credentials and paid model overrides are rejected before any external request',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('must not call');};
 try{
  for(const values of [{vendor:'xai',apiKey:'old-xai-key',model:'grok-4.7'},{apiKey:'vendorless-key',model:translationModel},{...connection,apiKey:'grok_synthetic'},{...connection,apiKey:'xai-synthetic'},{...connection,model:'gemini-3.1-pro-preview'}]){
   await assert.rejects(()=>translateArticleText(article,'de',values));
   await assert.rejects(()=>checkConnection('translation',values,'synthetic@example.invalid'));
  }
  assert.equal(calls,0);
 }finally{globalThis.fetch=original;}
});
test('Gemini rejects truncated, blocked, multiple-candidate, non-text and malformed responses',async()=>{
 const original=globalThis.fetch;
 const candidate=result(translated).candidates[0];
 try{
  for(const response of [null,{}, {error:{message:'upstream'}}, {...result(translated),promptFeedback:{blockReason:'SAFETY'}}, {candidates:[{...candidate,finishReason:'MAX_TOKENS'}]}, {candidates:[{...candidate,finishReason:'SAFETY'}]}, {candidates:[candidate,candidate]}, {candidates:[{...candidate,content:{role:'user',parts:candidate.content.parts}}]}, result({title:'Only title'}), {candidates:[{...candidate,content:{role:'model',parts:[{functionCall:{name:'anything',args:{}}}]}}]}, {candidates:[{...candidate,content:{role:'model',parts:[{text:'not JSON'}]}}]}, {candidates:[{...candidate,content:{role:'model',parts:[{text:JSON.stringify(translated),functionCall:{name:'unexpected',args:{}}}]}}]}]){
   globalThis.fetch=async()=>Response.json(response);await assert.rejects(()=>translateArticleText(article,'vi',connection),error=>error.status===502);
  }
  globalThis.fetch=async()=>new Response('x'.repeat(256001));await assert.rejects(()=>translateArticleText(article,'vi',connection),error=>error.status===502);
 }finally{globalThis.fetch=original;}
});
test('Gemini thought parts cannot enter the translated article and cancellation reaches the request',async()=>{
 const original=globalThis.fetch,controller=new AbortController();let signal;
 globalThis.fetch=async(url,options)=>{signal=options.signal;return Response.json({candidates:[{finishReason:'STOP',content:{role:'model',parts:[{thought:true,text:'Private reasoning, never an article'}, {text:JSON.stringify(translated)}]}}]});};
 try{
  assert.deepEqual(await translateArticleText(article,'de',connection,controller.signal),translated);
  controller.abort();assert.equal(signal.aborted,true);
 }finally{globalThis.fetch=original;}
});
test('Gemini connection check reads only model metadata without generating content or sending an article',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,options)=>{
  calls++;assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/'+translationModel);assert.equal(new Headers(options.headers).get('x-goog-api-key'),'synthetic-key');assert.equal(options.body,undefined);
  return Response.json({name:'models/'+translationModel,supportedGenerationMethods:['generateContent']});
 };
 try{assert.equal((await checkConnection('translation',connection,'synthetic@example.invalid')).state,'passed');assert.equal(calls,1);}finally{globalThis.fetch=original;}
});

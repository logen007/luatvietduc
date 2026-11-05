import {test} from 'node:test';
import assert from 'node:assert/strict';
import {translatedText,translateArticleText} from '../src/modules/content/translation-provider.ts';
import {mergeValues} from '../src/modules/integrations/validation.ts';
import {chooseGrokModel,grokModels} from '../src/modules/integrations/grok.ts';
import {checkConnection} from '../src/modules/integrations/check.ts';
const connection={vendor:'xai',apiKey:'synthetic-key',model:'grok-4.7'};
const result=value=>({status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
test('translation rejects incomplete and oversized output without accepting missing text',()=>{
 for(const value of [null,{}, {title:'',body:'text'},{title:'title',body:' '},{title:'x'.repeat(241),body:'text'},{title:'title',body:'x'.repeat(16001)}])assert.throws(()=>translatedText(value));
 assert.deepEqual(translatedText({title:' Title ',body:'First\n\nSecond'}),{title:'Title',body:'First\n\nSecond'});
});
test('translation uses its own catalog validation and preserves only its own saved key',()=>{
 assert.deepEqual(mergeValues('translation',{vendor:'xai',apiKey:'translation-key',model:'old'},{apiKey:'',model:'grok-4.7'}),{vendor:'xai',apiKey:'translation-key',model:'grok-4.7'});
 assert.throws(()=>mergeValues('translation',{}, {apiKey:'',model:'grok-4.7'}));
 assert.throws(()=>mergeValues('translation',{apiKey:'old-gemini-key',model:'gemini-flash'}, {apiKey:'',model:'grok-4.7'}));
 assert.deepEqual(mergeValues('translation',{apiKey:'old-gemini-key'}, {apiKey:'new-xai-key',model:'grok-4.7'}),{vendor:'xai',apiKey:'new-xai-key',model:'grok-4.7'});
 assert.throws(()=>mergeValues('translation',{}, {apiKey:'key',model:'gemini-flash'}));
 assert.throws(()=>mergeValues('translation',{}, {apiKey:'key',model:'https://attacker.invalid'}));
});
test('Grok translation reports quota without leaking upstream details',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('sensitive-provider-diagnostics',{status:429});
 try{await assert.rejects(()=>translateArticleText({title:'Synthetic',body:'Synthetic'},'de',connection),error=>error.status===429&&!error.message.includes('sensitive'));}finally{globalThis.fetch=original;}
});
test('Grok sends only explicit article data with separate key, strict schema and storage disabled',async()=>{
 const original=globalThis.fetch,source={title:'Synthetic title',body:'Synthetic paragraphs.\n\nSecond paragraph.'},translated={title:'Deutscher Titel',body:'Vollständiger Text.'};
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://api.x.ai/v1/responses');assert.equal(new Headers(options.headers).get('authorization'),'Bearer synthetic-key');assert.equal(new Headers(options.headers).get('x-goog-api-key'),null);
  const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.model,'grok-4.7');assert.equal(body.text.format.strict,true);assert.equal(body.text.format.schema.additionalProperties,false);assert.deepEqual(JSON.parse(body.input[1].content),source);assert.match(body.input[0].content,/German/);assert.equal(body.tools,undefined);assert.equal(options.redirect,'error');
  return Response.json(result(translated));
 };
 try{assert.deepEqual(await translateArticleText(source,'de',connection),translated);}finally{globalThis.fetch=original;}
});
test('Grok rejects legacy credentials before any request and rejects partial, refused or malformed output',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({});};
 try{
  await assert.rejects(()=>translateArticleText({title:'Title',body:'Body'},'de',{apiKey:'old-google-key',model:'gemini-flash'}));assert.equal(calls,0);
  for(const response of [null,{}, {...result({title:'Title',body:'Body'}),status:'incomplete'}, {...result({title:'Title',body:'Body'}),error:{message:'upstream'}}, result({title:'Only title'}), {status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'refusal',refusal:'no'}]}]}]){
   globalThis.fetch=async()=>Response.json(response);await assert.rejects(()=>translateArticleText({title:'Title',body:'Body'},'vi',connection),error=>error.status===502);
  }
  globalThis.fetch=async()=>new Response('x'.repeat(256001));await assert.rejects(()=>translateArticleText({title:'Title',body:'Body'},'vi',connection),error=>error.status===502);
 }finally{globalThis.fetch=original;}
});
test('Grok model discovery chooses available stable general models without sending article content',async()=>{
 const original=globalThis.fetch,model=id=>({id,input_modalities:['text'],output_modalities:['text']});
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'https://api.x.ai/v1/language-models');assert.equal(new Headers(options.headers).get('authorization'),'Bearer synthetic-key');assert.equal(options.body,undefined);
  return Response.json({models:[model('grok-4.3'),model('grok-4.7'),model('grok-4.7-latest'),model('grok-code-fast-1'),model('grok-4.9-beta'),{id:'grok-4.9',input_modalities:['image'],output_modalities:['image']}]});
 };
 try{
  assert.equal(chooseGrokModel(await grokModels(connection.apiKey)),'grok-4.7');
  assert.equal((await checkConnection('translation',connection,'synthetic@example.invalid')).state,'passed');
  assert.equal((await checkConnection('translation',{...connection,model:'grok-4.6'},'synthetic@example.invalid')).state,'failed');
  assert.throws(()=>chooseGrokModel([model('grok-code-fast-1')]));
 }finally{globalThis.fetch=original;}
});

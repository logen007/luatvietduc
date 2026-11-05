import {test} from 'node:test';
import assert from 'node:assert/strict';
import {translatedText,translateArticleText} from '../src/modules/content/translation-provider.ts';
import {mergeValues} from '../src/modules/integrations/validation.ts';
test('translation rejects incomplete and oversized output without accepting missing text',()=>{
 for(const value of [null,{}, {title:'',body:'text'},{title:'title',body:' '},{title:'x'.repeat(241),body:'text'},{title:'title',body:'x'.repeat(16001)}])assert.throws(()=>translatedText(value));
 assert.deepEqual(translatedText({title:' Title ',body:'First\n\nSecond'}),{title:'Title',body:'First\n\nSecond'});
});
test('translation uses its own catalog validation and preserves only its own saved key',()=>{
 assert.deepEqual(mergeValues('translation',{apiKey:'translation-key',model:'old'},{apiKey:'',model:'test-model'}),{apiKey:'translation-key',model:'test-model'});
 assert.throws(()=>mergeValues('translation',{}, {apiKey:'',model:'test-model'}));
 assert.throws(()=>mergeValues('translation',{}, {apiKey:'key',model:'https://attacker.invalid'}));
});
test('Gemini translation reports quota without leaking upstream details',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('sensitive-provider-diagnostics',{status:429});
 try{await assert.rejects(()=>translateArticleText({title:'Synthetic',body:'Synthetic'},'de',{apiKey:'synthetic-key',model:'test-model'}),error=>error.status===429&&!error.message.includes('sensitive'));}finally{globalThis.fetch=original;}
});

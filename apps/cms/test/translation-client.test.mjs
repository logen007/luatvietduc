import test from 'node:test';
import assert from 'node:assert/strict';
import {translationList,translationTarget,translationText} from '../src/modules/content/translation-client.ts';
const text={title:'Synthetischer Titel',body:'Vollständiger Text.\n\nZweiter Absatz.'};

test('a partial or malformed successful translation never supplies replacement form values',()=>{
 const original={title:'Dirty original title',body:'Dirty original body'};
 for(const value of [null,{},[],{translation:null},{translation:[]},{translation:{}},{translation:{title:'Changed title'}},{translation:{body:'Changed body'}},{translation:{title:42,body:'Text'}},{translation:{title:'Title',body:''}},{translation:{title:'Title',body:'  '}},{translation:{title:'x'.repeat(241),body:'Text'}},{translation:{title:'Title',body:'x'.repeat(16001)}},{translation:{title:'Title',body:'bad\0body'}}]){
  let draft={...original};
  assert.throws(()=>{const translated=translationText(value);draft={title:translated.title,body:translated.body};},/giữ nguyên/);
  assert.deepEqual(draft,original);
 }
 assert.deepEqual(translationText({translation:{...text,privateField:'ignored'}}),text);
});
test('language discovery accepts only bounded distinct valid siblings and explicit readiness',()=>{
 assert.deepEqual(translationList({articles:[],translationReady:false}),{articles:[],translationReady:false});
 const articles=[{id:1,language:'vi'},{id:2,language:'de'}];assert.deepEqual(translationList({articles,translationReady:true}),{articles,translationReady:true});
 for(const value of [null,{}, {articles:{},translationReady:true},{articles:[],translationReady:'true'},{articles:[{id:1,language:'en'}],translationReady:true},{articles:[{id:0,language:'vi'}],translationReady:true},{articles:[{id:1,language:'vi'},{id:2,language:'vi'}],translationReady:true},{articles:[{id:1,language:'vi'},{id:1,language:'de'}],translationReady:true},{articles:[...articles,{id:3,language:'vi'}],translationReady:true}])assert.throws(()=>translationList(value),/giữ nguyên/);
});
test('manual language navigation requires a confirmed native article ID',()=>{
 for(const value of [null,{},[],{id:undefined},{id:0},{id:-1},{id:1.5},{id:'2'},{id:'../../other'},{id:Number.MAX_SAFE_INTEGER+1}])assert.throws(()=>translationTarget(value),/giữ nguyên/);
 assert.equal(translationTarget({id:2,existing:true}),2);
});
test('cancelled responses cannot supply content, sibling state or a navigation target',()=>{
 const controller=new AbortController();controller.abort();
 for(const read of [()=>translationText({translation:text},controller.signal),()=>translationList({articles:[],translationReady:false},controller.signal),()=>translationTarget({id:2},controller.signal)])assert.throws(read,{name:'AbortError'});
});

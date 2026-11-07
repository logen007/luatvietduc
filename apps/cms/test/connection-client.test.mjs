import test from 'node:test';
import assert from 'node:assert/strict';
import {ConnectionError,mergeConnectionDraft,requestConnection} from '../src/modules/integrations/client.ts';
test('connection client distinguishes expired sessions, forbidden actions and recoverable failures',async()=>{
 const original=globalThis.fetch;
 try{
  for(const status of [401,403,503]){
   globalThis.fetch=async()=>Response.json({error:'Synthetic server error'},{status});
   await assert.rejects(requestConnection(),error=>error instanceof ConnectionError&&error.status===status);
  }
  globalThis.fetch=async()=>{throw new TypeError('Synthetic network failure');};
  await assert.rejects(requestConnection(),error=>error.status===0&&/thử lại/.test(error.message));
  globalThis.fetch=async()=>Response.json({});await assert.rejects(requestConnection(),/đọc được cấu hình/);
  globalThis.fetch=async()=>Response.json({connections:[]});assert.deepEqual(await requestConnection(),{connections:[]});
 }finally{globalThis.fetch=original;}
});
test('conflict refresh keeps edited and cleared public fields, rebases untouched fields and accepts secrets only from the draft',()=>{
 const fields=[{key:'clientId',secret:false},{key:'clientSecret',secret:true},{key:'fromName',secret:false},{key:'contactTo',secret:false}];
 const original={clientId:'old-client',fromName:'Old name',contactTo:'old@example.invalid'},draft={...original,clientSecret:'synthetic-draft-secret',fromName:'My name',contactTo:''};
 const fresh={clientId:'new-client',fromName:'Concurrent name',contactTo:'new@example.invalid',clientSecret:'must-not-enter-draft',apiKey:'other-provider-key'};
 assert.deepEqual(mergeConnectionDraft(original,draft,fresh,fields),{clientId:'new-client',clientSecret:'synthetic-draft-secret',fromName:'My name',contactTo:''});
 assert.equal(draft.clientId,'old-client');assert.equal(original.fromName,'Old name');assert.equal(fresh.clientSecret,'must-not-enter-draft');
 assert.deepEqual(mergeConnectionDraft(original,{...original,clientSecret:''},fresh,fields),{clientId:'new-client',fromName:'Concurrent name',contactTo:'new@example.invalid'});
});
test('a committed public-field save becomes clean after refresh while a typed secret remains an explicit unsaved draft',()=>{
 const fields=[{key:'clientId',secret:false},{key:'clientSecret',secret:true}],original={clientId:'old'},draft={clientId:'committed'},fresh={clientId:'committed'};
 assert.deepEqual(mergeConnectionDraft(original,draft,fresh,fields),fresh);
 assert.deepEqual(mergeConnectionDraft(original,{...draft,clientSecret:'synthetic-memory-only'},fresh,fields),{...fresh,clientSecret:'synthetic-memory-only'});
});

test('connection writes have a bounded wait and never retry an uncertain save or email test',async()=>{
 const original=globalThis.fetch;let calls=0,signal;
 try{
  globalThis.fetch=async(_url,options)=>{calls++;signal=options.signal;throw new DOMException('Synthetic disconnected write','TimeoutError');};
  await assert.rejects(()=>requestConnection({action:'save',provider:'ai',version:1,values:{model:'synthetic'}}),error=>error instanceof ConnectionError&&/chưa xác nhận/i.test(error.message));
  assert.ok(signal instanceof AbortSignal,'Writes must not leave the connection form busy forever');
  assert.equal(calls,1,'The browser must not automatically replay a possibly committed mutation');
 }finally{globalThis.fetch=original;}
});

test('a missing save receipt keeps the outcome uncertain instead of claiming settings were not saved',async()=>{
 const previous=globalThis.fetch;
 try{globalThis.fetch=async()=>new Response('not-json');await assert.rejects(()=>requestConnection({action:'save',provider:'google',version:1,values:{}}),error=>error instanceof ConnectionError&&/Chưa xác nhận/.test(error.message));}
 finally{globalThis.fetch=previous;}
});

test('malformed nested connection responses fail before entering connection form state',async()=>{
 const previous=globalThis.fetch;
 try{
  globalThis.fetch=async()=>Response.json({connections:[{}]});
  await assert.rejects(()=>requestConnection(),error=>error instanceof ConnectionError&&/đọc được cấu hình/.test(error.message));
  globalThis.fetch=async()=>Response.json({connection:{}});
  await assert.rejects(()=>requestConnection({action:'save',provider:'ai'}),error=>error instanceof ConnectionError&&/Chưa xác nhận/.test(error.message));
 }finally{globalThis.fetch=previous;}
});

test('catalogue-shaped version-zero and configured connections remain usable without exposing secret values',async()=>{
 const {integrationCatalog}=await import('../src/modules/integrations/catalog.ts'),previous=globalThis.fetch;
 const examples=Object.entries(integrationCatalog).map(([provider,definition])=>({provider,values:Object.fromEntries(definition.fields.filter(field=>!field.secret).map(field=>[field.key,''])),stored:Object.fromEntries(definition.fields.filter(field=>field.secret).map(field=>[field.key,false])),version:0,enabled:false,checkState:'untested',checkedAt:null,source:'environment'}));
 try{
  globalThis.fetch=async()=>Response.json({connections:examples});assert.deepEqual((await requestConnection()).connections,examples);
  const configured={...examples.find(item=>item.provider==='ai'),version:1,enabled:true,checkState:'passed',checkedAt:'2026-11-07T00:00:00Z',source:'admin'};
  globalThis.fetch=async()=>Response.json({connection:configured,message:'Đã lưu.'});assert.deepEqual((await requestConnection({provider:'ai'})).connection,configured);
  for(const connection of [{...configured,provider:'unknown'},{...configured,values:null},{...configured,stored:null},{...configured,version:-1},{...configured,enabled:'false'},{...configured,checkState:'unknown'},{...configured,checkState:['passed']},{...configured,checkedAt:'not-a-date'},{...configured,values:{model:'',apiKey:'must-not-be-returned'}},{...configured,apiKey:'must-not-be-returned'},{...configured,stored:{apiKey:'true'}}]){
   globalThis.fetch=async()=>Response.json({connections:[connection]});await assert.rejects(()=>requestConnection(),ConnectionError);
   globalThis.fetch=async()=>Response.json({connection});await assert.rejects(()=>requestConnection({provider:'ai'}),ConnectionError);
  }
  globalThis.fetch=async()=>Response.json({connections:[configured,configured]});await assert.rejects(()=>requestConnection(),ConnectionError);
  globalThis.fetch=async()=>Response.json({connection:configured});await assert.rejects(()=>requestConnection({provider:'google'}),ConnectionError);
 }finally{globalThis.fetch=previous;}
});

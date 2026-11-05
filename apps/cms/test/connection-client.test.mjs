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

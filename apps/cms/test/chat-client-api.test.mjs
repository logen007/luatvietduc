import test from 'node:test';
import assert from 'node:assert/strict';
import {api,ClientApiError} from '../src/modules/shared/client-api.ts';
test('chat reads distinguish lost access from recoverable network and service failures',async()=>{
 const previous=globalThis.fetch;
 try{
  for(const status of [403,404,503]){
   globalThis.fetch=async()=>new Response(JSON.stringify({error:'Synthetic failure'}),{status});
   await assert.rejects(api('conversations/synthetic'),error=>error instanceof ClientApiError&&error.status===status&&error.message==='Synthetic failure');
  }
  globalThis.fetch=async()=>{throw Error('Synthetic network failure');};
  await assert.rejects(api('conversations/synthetic'),error=>error instanceof ClientApiError&&error.status===0);
  globalThis.fetch=async()=>new Response('not json');
  await assert.rejects(api('conversations/synthetic'),error=>error instanceof ClientApiError&&error.status===502);
 }finally{globalThis.fetch=previous;}
});
test('an expired-session response invalidates the shared account state before returning the error',async()=>{
 const previous={fetch:globalThis.fetch,document:globalThis.document,localStorage:globalThis.localStorage};
 let invalidated=false;const document=new EventTarget();document.addEventListener('lvd:sessionchange',()=>{invalidated=true;});
 globalThis.document=document;globalThis.localStorage={setItem(){}};
 globalThis.fetch=async()=>new Response(JSON.stringify({error:'Synthetic expired session'}),{status:401});
 try{await assert.rejects(api('conversations/synthetic'),error=>invalidated&&error instanceof ClientApiError&&error.status===401);}finally{Object.assign(globalThis,previous);}
});

test('mutations have a bounded wait, preserve the idempotency key and never replay an uncertain request',async()=>{
 const previous={fetch:globalThis.fetch,timeout:AbortSignal.timeout};let calls=0,signal,body;
 try{
  AbortSignal.timeout=()=>previous.timeout(5);
  globalThis.fetch=async(_url,options)=>{calls++;signal=options.signal;body=JSON.parse(options.body);return new Promise((resolve,reject)=>{options.signal?.addEventListener('abort',()=>reject(options.signal.reason),{once:true});});};
  const pending=api('conversations/synthetic/messages',{body:'Synthetic draft',key:'same-client-key'});
  const failed=assert.rejects(pending,error=>error instanceof ClientApiError&&/Chưa xác nhận/.test(error.message));
  await new Promise(resolve=>setTimeout(resolve,15));
  assert.ok(signal instanceof AbortSignal,'POST must have an abort deadline');
  await failed;assert.equal(calls,1);assert.equal(body.key,'same-client-key');
 }finally{globalThis.fetch=previous.fetch;AbortSignal.timeout=previous.timeout;}
});
test('malformed successful mutation responses are uncertain and do not claim a failed write',async()=>{
 const previous=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response('not-json');
  await assert.rejects(api('backups',{action:'backup'}),error=>error instanceof ClientApiError&&error.status===502&&/Chưa xác nhận/.test(error.message));
 }finally{globalThis.fetch=previous;}
});

test('a mutation timeout after response headers still settles without replay',async()=>{
 const previous={fetch:globalThis.fetch,timeout:AbortSignal.timeout};let calls=0;
 try{
  AbortSignal.timeout=()=>previous.timeout(5);
  globalThis.fetch=async(_url,options)=>{calls++;return {ok:true,json:()=>new Promise((resolve,reject)=>options.signal?.addEventListener('abort',()=>reject(options.signal.reason),{once:true}))};};
  const failed=assert.rejects(api('backups',{action:'backup'}),error=>error instanceof ClientApiError&&error.status===502&&/Chưa xác nhận/.test(error.message));
  await new Promise(resolve=>setTimeout(resolve,15));await failed;assert.equal(calls,1);
 }finally{globalThis.fetch=previous.fetch;AbortSignal.timeout=previous.timeout;}
});

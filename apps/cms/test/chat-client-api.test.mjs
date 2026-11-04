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

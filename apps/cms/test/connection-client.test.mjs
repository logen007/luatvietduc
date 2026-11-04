import test from 'node:test';
import assert from 'node:assert/strict';
import {ConnectionError,requestConnection} from '../src/modules/integrations/client.ts';
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

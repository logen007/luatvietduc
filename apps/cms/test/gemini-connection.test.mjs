import {test} from 'node:test';
import assert from 'node:assert/strict';
import {geminiErrorMessage,geminiMetadata,selectGeminiChatModel,chooseGeminiChatModel,checkGeminiConnection} from '../src/modules/integrations/gemini.ts';
import {checkConnection} from '../src/modules/integrations/check.ts';
const key='AQ.synthetic_auth_key_not_an_AIza_legacy_key';
const model='gemini-3.5-flash-lite';
const info=name=>({name:'models/'+name,supportedGenerationMethods:['generateContent']});
const errorBody=reason=>({error:{status:'UNAUTHENTICATED',message:'private-project-and-key-never-echo',details:[{reason,metadata:{email:'private-account@example.invalid',project:'private-project',apiKey:key}}]}});
test('Google account-state failures are distinguished without exposing provider text, key or project metadata',()=>{
 const message=geminiErrorMessage(401,errorBody('ACCOUNT_STATE_INVALID'));
 assert.match(message,/tài khoản liên kết/);assert.match(message,/vô hiệu hóa hoặc xóa/);
 assert.ok(!message.includes(key));assert.ok(!message.includes('private-'));assert.ok(!message.includes('example.invalid'));
 for(const value of [null,{},'private-body',{error:{details:'private-details'}}])assert.match(geminiErrorMessage(401,value),/Sao chép đầy đủ khóa/);
});
test('Google error classes produce distinct fixed recovery messages',()=>{
 assert.match(geminiErrorMessage(403,errorBody('SERVICE_DISABLED')),/chưa được bật/);
 assert.match(geminiErrorMessage(403,errorBody('API_KEY_SERVICE_BLOCKED')),/chưa có quyền/);
 assert.match(geminiErrorMessage(404,errorBody('NOT_FOUND')),/Để trống Model/);
 assert.match(geminiErrorMessage(429,errorBody('RATE_LIMIT_EXCEEDED')),/hạn mức/);
 assert.match(geminiErrorMessage(400,errorBody('API_KEY_INVALID')),/Sao chép đầy đủ khóa/);
 assert.match(geminiErrorMessage(503,errorBody('private-unknown-reason')),/Thử lại sau/);
});
test('chat model auto-selection prefers versioned stable Flash-Lite and excludes aliases, experimental and arbitrary models',()=>{
 const listing={models:[info('gemini-flash-lite-latest'),info('gemini-3.1-flash-lite'),info('gemini-3.5-flash-lite'),info('gemini-3.5-flash-lite-preview'),info('gemini-99-pro')]};
 assert.equal(selectGeminiChatModel(listing),model);
 assert.equal(selectGeminiChatModel({models:[info('gemini-flash-lite-latest'),info('gemini-3.1-flash-lite')]}),'gemini-3.1-flash-lite');
 for(const value of [null,{}, {models:[info('gemini-flash-lite-latest')]},{models:[info('gemini-99-pro')]},{models:[{name:'models/'+model,supportedGenerationMethods:['embedContent']}]}])assert.throws(()=>selectGeminiChatModel(value),error=>error.status===400);
});
test('Gemini metadata probes accept new key formats and never generate content, use Bearer, or put keys in URLs',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,options)=>{
  calls++;assert.equal(options.body,undefined);assert.equal(new Headers(options.headers).get('x-goog-api-key'),key);assert.equal(new Headers(options.headers).get('authorization'),null);assert.equal(options.redirect,'error');assert.ok(!String(url).includes(key));
  if(String(url).includes('?')){assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000');return Response.json({models:[info('gemini-flash-lite-latest'),info(model)]});}
  assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/'+model);return Response.json(info(model));
 };
 try{
  assert.equal(await chooseGeminiChatModel(key),model);
  assert.equal((await checkConnection('ai',{apiKey:key,model},'synthetic@example.invalid')).state,'passed');assert.equal(calls,2);
 }finally{globalThis.fetch=original;}
});
test('model checks surface sanitized auth, service, quota and model errors through the admin connection flow',async()=>{
 const original=globalThis.fetch;
 try{
  for(const [status,reason,expected] of [[401,'ACCOUNT_STATE_INVALID',/tài khoản liên kết/],[403,'SERVICE_DISABLED',/chưa được bật/],[403,'PERMISSION_DENIED',/chưa có quyền/],[404,'NOT_FOUND',/Để trống Model/],[429,'RATE_LIMIT_EXCEEDED',/hạn mức/]]){
   let calls=0;globalThis.fetch=async()=>{calls++;return Response.json(errorBody(reason),{status});};
   const result=await checkConnection('ai',{apiKey:key,model},'synthetic@example.invalid');assert.equal(result.state,'failed');assert.match(result.message,expected);assert.ok(!result.message.includes(key));assert.ok(!result.message.includes('private-'));assert.equal(calls,1);
   await assert.rejects(()=>chooseGeminiChatModel(key),error=>error.status===(status===429?429:400)&&expected.test(error.message));
  }
 }finally{globalThis.fetch=original;}
});
test('Gemini metadata reads reject malformed, oversized or mismatched responses without exposing bodies',async()=>{
 const original=globalThis.fetch;
 try{
  for(const response of [new Response('private-malformed-body'),new Response('x'.repeat(524289))]){
   globalThis.fetch=async()=>response;const result=await checkGeminiConnection(key,model);assert.equal(result.state,'failed');assert.match(result.message,/Chưa đọc/);assert.ok(!result.message.includes('private-'));
  }
  for(const value of [info('different-model'),{name:'models/'+model,supportedGenerationMethods:['embedContent']}]){
   globalThis.fetch=async()=>Response.json(value);assert.equal((await checkGeminiConnection(key,model)).state,'failed');
  }
  globalThis.fetch=async()=>new Response('private malformed auth body',{status:401});assert.match((await checkGeminiConnection(key,model)).message,/Sao chép đầy đủ khóa/);
 }finally{globalThis.fetch=original;}
});
test('Gemini network failures are recoverable and invalid request inputs are blocked before fetch',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw new Error('private network debug includes '+key);};
 try{
  const result=await checkGeminiConnection(key,model);assert.equal(result.state,'failed');assert.match(result.message,/Kiểm tra mạng/);assert.ok(!result.message.includes(key));assert.equal(calls,1);
  await assert.rejects(()=>geminiMetadata('secret\r\nheader',model),error=>error.status===400);
  await assert.rejects(()=>geminiMetadata(key,'https://attacker.invalid'),error=>error.status===400);assert.equal(calls,1);
 }finally{globalThis.fetch=original;}
});

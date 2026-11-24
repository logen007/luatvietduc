import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {accountActions,accountInput} from '../src/modules/identity/account-input.ts';
import {readJsonRequest} from '../src/modules/http/request.ts';
import {HttpError} from '../src/modules/http/errors.ts';
class NativeAPIError extends Error {constructor(message,status){super(message);this.status=status;}}

function load(file,dependencies,globals={}){
 const exports={},source=fs.readFileSync(new URL(file,import.meta.url),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(compiled,{exports,process:{env:{}},console:{error:()=>{}},...globals,require:name=>Object.hasOwn(dependencies,name)?dependencies[name]:assert.fail('Unexpected dependency '+name)});
 return exports;
}
function route(payload,verifyAccountEmail=()=>assert.fail('Unexpected verification call')){
 const prefix='../../../../modules/';
 return load('../src/app/service/auth/[action]/route.ts',{
  'next/server':{NextResponse:{json:(body,options)=>Response.json(body,options)}},
  payload:{getPayload:async()=>payload,APIError:NativeAPIError},'@payload-config':{},
  [prefix+'identity/account-input']:{accountActions,accountInput},[prefix+'identity/account-email']:{},
  [prefix+'http/request']:{readJsonRequest},[prefix+'http/errors']:{HttpError},
  [prefix+'identity/session']:{},[prefix+'chat/guest-account']:{},[prefix+'chat/service']:{rateLimit:async()=>{}},
  [prefix+'integrations/store']:{},[prefix+'shared/db']:{},[prefix+'identity/session-cookies']:{},
  [prefix+'identity/password-login']:{},[prefix+'identity/verify-email']:{verifyAccountEmail},
 }).POST;
}
function security({revoke=async()=>{}}={}){
 return load('../src/modules/identity/user-security.ts',{
  payload:{APIError:class extends Error{}},'@payloadcms/db-postgres':{sql:()=>({})},
  './app-sessions':{revokeAppUserSessions:revoke},'./session':{},
  pg:{default:{Pool:class {listenerCount(){return 1;}}}},
  '../shared/payload-transaction':{payloadTransaction:async()=>({execute:async()=>({rows:[]})})},
 },{globalThis:{}});
}
const origin=process.env.APP_URL||'http://localhost:3000';
const request=()=>new Request(origin+'/service/auth/reset',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({token:'a'.repeat(40),password:'Synthetic reset password 123!'})});

test('public reset verifies ownership inside the native reset instead of a second fallible account write',async()=>{
 let options;
 const POST=route({auth:async()=>({user:null}),resetPassword:async input=>{options=input;return {user:{id:1},token:'must-not-escape'};},update:async()=>assert.fail('A second write could fail after the password and reset token have already committed')});
 const response=await POST(request(),{params:Promise.resolve({action:'reset'})});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true,state:'password-reset'});
 assert.equal(options.context.verifiedReset,true);assert.equal(options.overrideAccess,true);
});

test('only a validated native reset with trusted email ownership updates verification and revokes in the same request',async()=>{
 for(const trusted of [false,true]){
  const calls=[],hooks=security({revoke:async(id,req)=>{calls.push({id,req});}}),req={context:{verifiedReset:trusted}};
  await hooks.trackAccountOperation({operation:'resetPassword',args:{data:{token:'a'.repeat(40)}},req});
  const data={id:1,hash:'native-generated-hash',salt:'native-generated-salt',_verified:false};
  assert.equal(await hooks.revokeResetSessions({operation:'update',data,req}),data);
  assert.equal(calls.length,1);assert.equal(calls[0].id,1);assert.equal(calls[0].req,req);assert.equal(data._verified,trusted);
 }
 const hooks=security({revoke:async()=>assert.fail('Unvalidated changes cannot enter the reset lifecycle')});
 const data={id:1,_verified:false};await hooks.revokeResetSessions({operation:'update',data,req:{context:{verifiedReset:true}}});assert.equal(data._verified,false);
});

test('a reset revocation failure rejects before marking a pending signup verified',async()=>{
 const failure=new Error('synthetic revocation failure'),hooks=security({revoke:async()=>{throw failure;}}),req={context:{verifiedReset:true}};
 await hooks.trackAccountOperation({operation:'resetPassword',args:{data:{token:'a'.repeat(40)}},req});
 const data={id:1,hash:'native-generated-hash',salt:'native-generated-salt',_verified:false};
 await assert.rejects(()=>hooks.revokeResetSessions({operation:'update',data,req}),error=>error===failure);assert.equal(data._verified,false);
});

test('reset distinguishes an invalid native token from a retryable server failure without exposing internals',async()=>{
 for(const [error,status] of [[new NativeAPIError('native expired token',403),400],[new Error('synthetic private database detail'),503],[new NativeAPIError('email configuration unavailable',503),503]]){
  const POST=route({auth:async()=>({user:null}),resetPassword:async()=>{throw error;}}),response=await POST(request(),{params:Promise.resolve({action:'reset'})});
  assert.equal(response.status,status);const body=await response.json();
  assert.equal(body.error,status===400?'This link is invalid or has expired.':'Unable to complete this request. Please try again.');
 }
});

test('public email verification uses the shared guarded native operation and keeps its receipt and error contract',async()=>{
 const token='b'.repeat(40),request=()=>new Request(origin+'/service/auth/verify',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({token})}),payload={auth:async()=>({user:null}),verifyEmail:()=>assert.fail('The public route must not bypass account locking')};
 let calls=0;const POST=route(payload,async(instance,value)=>{assert.equal(instance,payload);assert.equal(value,token);calls++;});
 const response=await POST(request(),{params:Promise.resolve({action:'verify'})});assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true,state:'verified'});assert.equal(calls,1);
 for(const [error,status] of [[new NativeAPIError('native invalid token',403),400],[new Error('synthetic verification database failure'),503]]){
  const failed=await route(payload,async()=>{throw error;})(request(),{params:Promise.resolve({action:'verify'})});assert.equal(failed.status,status);
 }
});

test('guarded verification locks before the native read, shares the request, and owns only its transaction',async()=>{
 for(const inherited of [false,true]){
  const steps=[],req={transactionID:inherited?'existing':undefined},payload={verifyEmail:async input=>{steps.push('native');assert.equal(input.req,req);assert.equal(input.token,'c'.repeat(40));return true;}};
  const hooks=load('../src/modules/identity/verify-email.ts',{
   payload:{APIError:NativeAPIError,createLocalReq:async()=>req,initTransaction:async current=>{assert.equal(current,req);steps.push('begin');current.transactionID||='new';return !inherited;},commitTransaction:async current=>{assert.equal(current,req);steps.push('commit');},killTransaction:async()=>assert.fail('Successful verification must not roll back')},
   '@payloadcms/db-postgres':{sql:(strings,...values)=>{assert.match(strings.join(''),/_verificationtoken=.*FOR UPDATE/);assert.deepEqual(values,['c'.repeat(40)]);return 'lock';}},
   '../shared/payload-transaction':{payloadTransaction:async current=>{assert.equal(current,req);return {execute:async query=>{assert.equal(query,'lock');steps.push('lock');}};}},
  });
  assert.equal(await hooks.verifyAccountEmail(payload,'c'.repeat(40),inherited?req:undefined),true);assert.deepEqual(steps,inherited?['begin','lock','native']:['begin','lock','native','commit']);
 }
});

test('guarded verification rolls back a native write failure and preserves the original error',async()=>{
 const steps=[],failure=new Error('synthetic native write failure'),req={};
 const hooks=load('../src/modules/identity/verify-email.ts',{
  payload:{APIError:NativeAPIError,createLocalReq:async()=>req,initTransaction:async()=>true,commitTransaction:async()=>assert.fail('Failed verification cannot commit'),killTransaction:async current=>{assert.equal(current,req);steps.push('rollback');}},
  '@payloadcms/db-postgres':{sql:()=>({})},'../shared/payload-transaction':{payloadTransaction:async()=>({execute:async()=>{}})},
 });
 await assert.rejects(()=>hooks.verifyAccountEmail({verifyEmail:async()=>{throw failure;}},'d'.repeat(40)),error=>error===failure);assert.deepEqual(steps,['rollback']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readNativeLoginRequest} from '../src/modules/identity/native-login-request.ts';

const origin=process.env.APP_URL||'http://localhost:3000',url=origin+'/api/users/login';
const request=(body,headers={},options={})=>new Request(url,{method:'POST',headers:{origin,...headers},body,...options});
const json=(body,headers={},options={})=>request(body,{'content-type':'application/json; charset=utf-8',...headers},options);
const rejected=(input,status)=>assert.rejects(()=>readNativeLoginRequest(input),error=>error.status===status);

test('REST JSON forwards the same credential object, other headers and signal without returning credentials separately',async()=>{
 const raw=' { "email": " Owner@example.invalid ", "password": "Synthetic-only", "rememberMe": true }\n',controller=new AbortController();
 const input=json(raw,{'x-fixture':'kept','content-length':String(raw.length)},{signal:controller.signal,credentials:'include'}),result=await readNativeLoginRequest(input);
 assert.deepEqual(Object.keys(result).sort(),['email','forwarded']);assert.equal(result.email,' Owner@example.invalid ');
 assert.equal(input.bodyUsed,true);assert.equal(result.forwarded.url,input.url);assert.equal(result.forwarded.method,'POST');
 assert.equal(result.forwarded.headers.get('x-fixture'),'kept');assert.equal(result.forwarded.headers.get('content-type'),'application/json');assert.equal(result.forwarded.headers.has('content-length'),false);assert.equal(result.forwarded.credentials,'include');
 assert.deepEqual(await result.forwarded.json(),JSON.parse(raw));
 controller.abort();assert.equal(result.forwarded.signal.aborted,true);
});

test('the Web API native multipart _payload forwards the same credentials as canonical JSON',async()=>{
 const form=new FormData(),payload=JSON.stringify({email:'native@example.invalid',password:'Synthetic-only',rememberMe:false});
 form.append('_payload',payload);form.append('locale','de');
 const input=request(form),contentType=input.headers.get('content-type');
 assert.match(contentType,/multipart\/form-data; boundary=/);
 const {email,forwarded}=await readNativeLoginRequest(input);
 assert.equal(email,'native@example.invalid');assert.equal(input.bodyUsed,true);assert.equal(forwarded.headers.get('content-type'),'application/json');
 assert.deepEqual(await forwarded.json(),JSON.parse(payload));
});

test('ambiguous multipart disposition headers cannot give admission and native auth different email identities',async()=>{
 const raw=[
  '--gate','Content-Disposition: form-data; name="_payload"','Content-Disposition: form-data; name="other"','',
  '{"email":"target@example.invalid","password":"synthetic-target"}',
  '--gate','Content-Disposition: form-data; name="other"','Content-Disposition: form-data; name="_payload"','',
  '{"email":"gate@example.invalid","password":"synthetic-gate"}',
  '--gate--','',
 ].join('\r\n');
 // Web parsers can reject duplicate disposition headers or accept one value.
 // Both are safe only when native auth cannot parse a different identity.
 await readNativeLoginRequest(request(raw,{'content-type':'multipart/form-data; boundary=gate'})).then(async({email,forwarded})=>{
  assert.equal(forwarded.headers.get('content-type'),'application/json');
  assert.equal((await forwarded.json()).email,email);
 },error=>assert.equal(error.status,400));
});

test('password validation stays with the native endpoint',async()=>{
 const raw='{"email":"native@example.invalid","password":null,"extra":"kept"}';
 const {forwarded}=await readNativeLoginRequest(json(raw));assert.equal(await forwarded.text(),raw);
});

test('invalid JSON, non-object payloads and missing or non-string email are rejected',async()=>{
 for(const raw of ['{','null','[]','"text"','{}','{"email":1}'])await rejected(json(raw),400);
 await rejected(request(undefined,{'content-type':'application/json'}),400);
 await rejected(json(new Uint8Array([255])),400);
 const used=json('{"email":"used@example.invalid"}');await used.text();await rejected(used,400);
});

test('native multipart requires exactly one string _payload JSON object',async()=>{
 for(const value of [undefined,'{','null','[]','{}',new Blob(['{}'],{type:'application/json'})]){
  const form=new FormData();if(value!==undefined)form.append('_payload',value);form.append('email','ignored@example.invalid');
  await rejected(request(form),400);
 }
 const duplicate=new FormData();duplicate.append('_payload','{"email":"one@example.invalid"}');duplicate.append('_payload','{"email":"two@example.invalid"}');
 await rejected(request(duplicate),400);
 await rejected(request('not multipart',{'content-type':'multipart/form-data'}),400);
});

test('origin and unsupported media types fail before credentials are read',async()=>{
 await rejected(json('{}',{origin:'https://other.invalid'}),403);
 const missing=request('{}',{'content-type':'application/json'});missing.headers.delete('origin');await rejected(missing,403);
 for(const type of ['text/plain','application/x-www-form-urlencoded'])await rejected(request('email=synthetic',{'content-type':type}),415);
});

test('raw JSON, Unicode and multipart sizes are bounded before parsing',async()=>{
 await rejected(json(JSON.stringify({email:'bounded@example.invalid',password:'x'.repeat(8192)}),{'content-length':'1'}),413);
 await rejected(json(JSON.stringify({email:'bounded@example.invalid',password:'€'.repeat(3000)})),413);
 const form=new FormData();form.append('_payload',JSON.stringify({email:'bounded@example.invalid',password:'x'.repeat(8192)}));
 await rejected(request(form),413);
 const fileForm=new FormData();fileForm.append('_payload','{"email":"bounded@example.invalid"}');fileForm.append('file',new Blob(['x'.repeat(8192)]),'synthetic.txt');
 await rejected(request(fileForm),413);
});

test('the byte limit is inclusive and preserves a JSON request at exactly 8 KiB',async()=>{
 const shape={email:'boundary@example.invalid',password:''},fixed=JSON.stringify(shape);shape.password='x'.repeat(8192-new TextEncoder().encode(fixed).byteLength);
 const raw=JSON.stringify(shape);assert.equal(new TextEncoder().encode(raw).byteLength,8192);
 const {forwarded}=await readNativeLoginRequest(json(raw));assert.equal(await forwarded.text(),raw);
});

test('an oversized original stream rejects without cloning or awaiting a hanging cancel hook',{timeout:1500},async()=>{
 let cancelled=false;
 const stream=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(3000));},cancel(){cancelled=true;return new Promise(()=>{});}});
 const input=json(stream,{}, {duplex:'half'});Object.defineProperty(input,'clone',{value:()=>assert.fail('The original stream must not be teed')});
 await rejected(input,413);assert.equal(cancelled,true);assert.equal(input.body.locked,false);
});

test('invalid stream chunks are a controlled bad request',async()=>{
 const body=new ReadableStream({start(controller){controller.enqueue('not bytes');controller.close();}});
 await rejected(json(body,{}, {duplex:'half'}),400);
});

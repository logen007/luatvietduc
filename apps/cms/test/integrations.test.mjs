import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seal,unseal} from '../src/modules/integrations/crypto.ts';
import {requireOwner,mergeValues,validateValues} from '../src/modules/integrations/validation.ts';
const key='unit-test-only-32-character-encryption-secret';
test('connection secrets are encrypted with randomized authenticated envelopes',()=>{
 const a=seal('ai',{apiKey:'never-store-me-plain',model:'test-model'},key),b=seal('ai',{apiKey:'never-store-me-plain',model:'test-model'},key);
 assert.notEqual(a,b);assert.ok(!a.includes('never-store-me-plain'));assert.equal(unseal('ai',a,key).apiKey,'never-store-me-plain');
 assert.throws(()=>unseal('google',a,key));assert.throws(()=>unseal('ai',a,key+'different'));
 const parts=a.split('.');parts[2]=(parts[2][0]==='a'?'b':'a')+parts[2].slice(1);assert.throws(()=>unseal('ai',parts.join('.'),key));
});
test('connection configuration is restricted to owner',()=>{
 for(const role of [undefined,'member','support','operations','editor','reviewer','knowledge'])assert.throws(()=>requireOwner(role?{role}:null),e=>e.status===403);
 assert.doesNotThrow(()=>requireOwner({role:'owner'}));
});
test('blank secret keeps existing value but public fields must be supplied',()=>{
 assert.deepEqual(mergeValues('ai',{apiKey:'saved-key',model:'old'}, {apiKey:'',model:'new-model'}),{apiKey:'saved-key',model:'new-model'});
 assert.throws(()=>mergeValues('ai',{}, {apiKey:'',model:'new-model'}));
 assert.throws(()=>mergeValues('ai',{}, {apiKey:3,model:'new-model'}));
});
test('R2 rejects non-Cloudflare endpoints, credentials in URLs, redirects and private addresses',()=>{
 const v={endpoint:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',bucket:'test-bucket',accessKeyId:'test',secretAccessKey:'test'};
 assert.doesNotThrow(()=>validateValues('r2',v));
 for(const endpoint of ['http://127.0.0.1','https://127.0.0.1','https://evil.example','https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com.evil.example',v.endpoint+'/path',v.endpoint+'?url=evil',v.endpoint.replace('https://','https://user:pass@')])assert.throws(()=>validateValues('r2',{...v,endpoint}));
});
test('email and model validation prevent header and URL injection',()=>{
 assert.throws(()=>mergeValues('email',{}, {apiKey:'test',fromAddress:'user@example.com\r\nBcc:other@example.com',fromName:'name'}));
 assert.throws(()=>validateValues('ai',{apiKey:'test',model:'https://evil.example'}));
});

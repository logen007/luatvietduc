import {test} from 'node:test';
import assert from 'node:assert/strict';
import {measurableURL,measurementMode,savedConsent} from '../src/modules/measurement/policy.ts';
import {mergeValues} from '../src/modules/integrations/validation.ts';
import {checkConnection} from '../src/modules/integrations/check.ts';
test('Google settings accept only IDs, never snippets, URLs or injected attributes',()=>{
 for(const [provider,field,good] of [['gtm','containerId','GTM-ABC1234'],['analytics','measurementId','G-ABC1234567'],['searchConsole','verification','Google_token-1234567890']]){
  assert.equal(mergeValues(provider,{}, {[field]:good})[field],good);
  for(const bad of ['',good+'<script>',good+'"',`https://google.com/${good}`,'<meta name="google-site-verification" content="token">',good+'\nalert(1)'])assert.throws(()=>mergeValues(provider,{}, {[field]:bad}));
 }
});
test('format checks never call Google or send a Resend email and do not claim verification',async()=>{
 const fetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('unexpected network');};
 try{for(const [provider,values] of [['gtm',{containerId:'GTM-ABC1234'}],['analytics',{measurementId:'G-ABC1234567'}],['searchConsole',{verification:'Google_token-1234567890'}]]){
  const result=await checkConnection(provider,values,'owner@example.invalid');assert.equal(result.state,'configured');assert.match(result.message,/chưa|Chưa/);
 }}finally{globalThis.fetch=fetch;}
});
test('only public routes without query strings or hash are measured',()=>{
 for(const path of ['/','/tin-tuc','/bai-viet/test','/phap-luat/duc','/chu-de/hon-nhan','/lien-he'])assert.equal(measurableURL(new URL('https://luatvietduc.com'+path)),true,path);
 for(const path of ['/admin','/admin/collections/users','/tai-khoan','/hoi-dap','/tro-chuyen','/service/chat','/auth/google/callback','/unknown','/?q=email@example.com','/tin-tuc?nhom=gia-dinh','/#email','/bai-viet/private?preview=true'])assert.equal(measurableURL(new URL('https://luatvietduc.com'+path)),false,path);
});
test('GTM takes precedence; invalid/empty IDs do not start tracking',()=>{
 assert.equal(measurementMode({gtmId:'GTM-ABC1234',gaId:'G-ABC1234567'}),'gtm');
 assert.equal(measurementMode({gtmId:'',gaId:'G-ABC1234567'}),'ga');
 assert.equal(measurementMode({gtmId:'',gaId:''}),null);
});
test('consent is explicit, expires, and rejects malformed or indefinitely retained data',()=>{
 const now=1000000000;
 assert.equal(savedConsent(JSON.stringify({allowed:true,until:now+1000}),now),true);
 assert.equal(savedConsent(JSON.stringify({allowed:false,until:now+1000}),now),false);
 for(const value of [null,'bad','true',JSON.stringify({allowed:true,until:now-1}),JSON.stringify({allowed:true,until:now+400*86400000})])assert.equal(savedConsent(value,now),null);
});

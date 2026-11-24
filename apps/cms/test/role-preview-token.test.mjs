import test from 'node:test';
import assert from 'node:assert/strict';
import {signRolePreview,readRolePreview,readRolePreviewExpires,realIdentityHeaders,ROLE_PREVIEW_COOKIE} from '../src/modules/identity/role-preview-token.ts';
import {authenticateRolePreview} from '../src/modules/identity/role-preview-auth.ts';
import {rolePreviewMe,rolePreviewRefresh} from '../src/modules/identity/role-preview-hooks.ts';
const secret='fixture-only-role-preview-secret-000000000',now=1800000000000;
const headers=(credential='fixture-jwt')=>new Headers({cookie:'payload-token='+credential+'; other=keep'});
const signed=(role='support')=>{const h=headers();h.set('cookie',h.get('cookie')+'; '+ROLE_PREVIEW_COOKIE+'='+signRolePreview(7,role,h,secret,now));return h;};
test('preview binds only lower roles to owner and existing credential for 15 minutes',()=>{
 for(const role of ['support','member']){const h=signed(role);assert.equal(readRolePreview(7,h,secret,now),role);assert.equal(readRolePreview(8,h,secret,now),null);assert.equal(readRolePreview(7,h,secret,now+900000),null);assert.equal(readRolePreview(7,h,secret,now-1000),null);const changed=new Headers(h);changed.set('cookie',h.get('cookie').replace('fixture-jwt','new-login'));assert.equal(readRolePreview(7,changed,secret,now),null);}
 assert.throws(()=>signRolePreview(7,'owner',headers(),secret,now));assert.throws(()=>signRolePreview(7,'support',new Headers(),secret,now));
});
test('forged preview never authorizes and underlying identity headers remove only preview',()=>{
 const h=signed();h.set('cookie',h.get('cookie').replace('support','owner')+'x');assert.equal(readRolePreview(7,h,secret,now),null);
 const valid=signed();const clean=realIdentityHeaders(valid);assert.ok(!clean.get('cookie').includes(ROLE_PREVIEW_COOKIE));assert.ok(clean.get('cookie').includes('payload-token=fixture-jwt'));assert.ok(clean.get('cookie').includes('other=keep'));assert.equal(clean.get('DisableAutologin'),'true');assert.equal(readRolePreview(7,valid,'wrong-secret-00000000000000000',now),null);
});

// These unsigned fixture JWTs exercise only binding. Native Payload remains
// responsible for signature, expiry, verified user and current session checks.
const sid='11111111-2222-4333-8444-555555555555',nextSid='22222222-2222-4333-8444-555555555555';
const jwt=(session,issued=1)=>[Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify({id:7,collection:'users',sid:session,iat:issued})).toString('base64url'),'fixture-signature-'+issued].join('.');
const previewFor=h=>{h.set('cookie',h.get('cookie')+'; '+ROLE_PREVIEW_COOKIE+'='+signRolePreview(7,'support',h,secret,now));return h;};
test('native refresh keeps the same SID binding without extending preview expiry; new sessions do not inherit it',()=>{
 const first=jwt(sid),h=previewFor(headers(first));assert.equal(readRolePreviewExpires(7,h,secret,now),now+900000);
 const refreshed=new Headers(h);refreshed.set('cookie',h.get('cookie').replace(first,jwt(sid,2)));
 assert.equal(readRolePreview(7,refreshed,secret,now+1000),'support');assert.equal(readRolePreviewExpires(7,refreshed,secret,now+1000),now+900000);
 refreshed.set('cookie',h.get('cookie').replace(first,jwt(nextSid,2)));assert.equal(readRolePreview(7,refreshed,secret,now),null);
 assert.equal(readRolePreviewExpires(7,h,secret,now+900000),null);assert.equal(readRolePreviewExpires(8,h,secret,now),null);
});
test('missing or malformed native SIDs retain full-token binding and Google sessions stay bound independently',()=>{
 for(const session of [undefined,null,7,{},'', 'x'.repeat(129),'invalid/session']){
  const first=jwt(session),h=previewFor(headers(first));assert.equal(readRolePreview(7,h,secret,now),'support');
  h.set('cookie',h.get('cookie').replace(first,jwt(session,2)));assert.equal(readRolePreview(7,h,secret,now),null,'Invalid SIDs cannot collapse distinct JWTs into one binding');
 }
 const first=jwt(sid),h=headers(first);h.set('cookie',h.get('cookie')+'; lvd-session=fixture-google-session');previewFor(h);
 h.set('cookie',h.get('cookie').replace(first,jwt(sid,2)));assert.equal(readRolePreview(7,h,secret,now),'support');
 h.set('cookie',h.get('cookie').replace('fixture-google-session','another-google-session'));assert.equal(readRolePreview(7,h,secret,now),null);
 const google=previewFor(new Headers({cookie:'lvd-session=fixture-google-session'}));assert.equal(readRolePreview(7,google,secret,now),'support');
 google.set('cookie',google.get('cookie').replace('fixture-google-session','another-google-session'));assert.equal(readRolePreview(7,google,secret,now),null);
});
test('SID decoding cannot authorize a forged JWT and preview payload tampering still fails authentication',async()=>{
 const h=previewFor(headers(jwt(sid))),preview=h.get('cookie').split(ROLE_PREVIEW_COOKIE+'=')[1],[body,mac]=preview.split('.');
 const changed=JSON.parse(Buffer.from(body,'base64url').toString('utf8'));changed.role='owner';const forged=new Headers(h);forged.set('cookie',h.get('cookie').replace(preview,Buffer.from(JSON.stringify(changed)).toString('base64url')+'.'+mac));assert.equal(readRolePreview(7,forged,secret,now),null);
 let calls=0;const payload={auth:async({headers:input})=>{calls++;assert.ok(!input.get('cookie').includes(ROLE_PREVIEW_COOKIE));return {user:null};}};
 assert.equal(await authenticateRolePreview(payload,h),null,'A matching unverified SID never substitutes for native credential validation');assert.equal(calls,1);
});
test('native me and refresh responses keep effective preview roles without mutating real user or signed token',()=>{
 for(const role of ['support','member']){
  const actual={id:7,collection:'users',role:'owner',jurisdictions:['VN'],name:'Synthetic owner'},effective={...actual,role,jurisdictions:role==='support'?['VN','DE']:[],rolePreview:role,_strategy:'role-preview'},req={user:effective};
  const response={user:actual,token:'unchanged-native-token',exp:99},me=rolePreviewMe({req,response});assert.equal(me.user.role,role);assert.equal(me.user.rolePreview,role);assert.deepEqual(me.user.jurisdictions,effective.jurisdictions);assert.equal(me.token,response.token);assert.equal(actual.role,'owner');assert.equal(response.user,actual);
  const result={user:actual,refreshedToken:'unchanged-refreshed-token',exp:199,setCookie:true},refreshed=rolePreviewRefresh({operation:'refresh',req,result});assert.equal(refreshed.user.role,role);assert.equal(refreshed.refreshedToken,result.refreshedToken);assert.equal(refreshed.setCookie,true);assert.equal(result.user.role,'owner');assert.equal(effective.role,role);
  assert.equal(rolePreviewRefresh({operation:'read',req,result}),result);
 }
 for(const user of [{id:7,collection:'users',role:'owner'}, {id:7,collection:'users',role:'owner',rolePreview:'support',_strategy:'local-jwt'}, {id:7,collection:'users',role:'member',rolePreview:'support',_strategy:'role-preview'}]){
  const response={user:{id:7,role:'owner'}};assert.equal(rolePreviewMe({req:{user},response}),response,'Only a validated effective preview principal can lower native response metadata');
 }
});

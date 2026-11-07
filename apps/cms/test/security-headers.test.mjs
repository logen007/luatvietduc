import test from 'node:test';
import assert from 'node:assert/strict';
import {securityHeaders} from '../src/modules/http/security-headers.mjs';
test('private pages, OAuth and APIs prohibit caching and referrer disclosure',()=>{
 const rules=securityHeaders();
 for(const source of ['/admin/:path*','/api/:path*','/service/:path*','/auth/:path*','/tai-khoan','/hoi-dap','/tro-chuyen']){
  const rule=rules.find(rule=>rule.source===source);assert.ok(rule,source);
  const headers=Object.fromEntries(rule.headers.map(({key,value})=>[key.toLowerCase(),value]));
  assert.match(headers['cache-control'],/private/);assert.match(headers['cache-control'],/no-store/);assert.equal(headers['referrer-policy'],'no-referrer');
 }
 const common=Object.fromEntries(rules.find(rule=>rule.source==='/:path*').headers.map(({key,value})=>[key.toLowerCase(),value]));
 assert.equal(common['x-content-type-options'],'nosniff');assert.equal(common['x-frame-options'],'SAMEORIGIN');assert.equal(common['content-security-policy'],"frame-ancestors 'self'");
 assert.equal(common['cache-control'],undefined,'Public/immutable asset caching remains controlled by Next and its routes');
});

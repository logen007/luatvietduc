import test from 'node:test';
import assert from 'node:assert/strict';
import {accountInput} from '../src/modules/identity/account-input.ts';
import {accountEmail} from '../src/modules/identity/account-email.ts';
import configPromise from '../src/payload.config.ts';
const users=(await configPromise).collections.find(item=>item.slug==='users');
test('public registration normalizes email and ignores client-supplied privilege fields',()=>{
 const input=accountInput('register',{email:' User@Example.COM ',password:'synthetic-password-123',role:'owner',_verified:true,conversation:'https://attacker.invalid',language:'other'});
 assert.equal(input.email,'user@example.com');assert.equal(input.name,'user');assert.equal(input.conversation,'');assert.equal(input.language,'vi');assert.equal(input.role,undefined);assert.equal(input._verified,undefined);
});
test('registration requires a long password but existing password login remains compatible',()=>{
 for(const password of ['short','x'.repeat(129)])assert.throws(()=>accountInput('register',{email:'user@example.invalid',password}),/12 and 128/);
 assert.equal(accountInput('login',{email:'user@example.invalid',password:'existing'}).password,'existing');
 for(const email of ['invalid','a@example.invalid\r\nBcc: attacker@example.invalid'])assert.throws(()=>accountInput('forgot',{email}),/valid email/);
 assert.throws(()=>accountInput('verify',{token:'../invalid'}),/invalid or has expired/);
});
test('trusted public-member context cannot create Admin or mark an account verified',()=>{
 const result=users.hooks.beforeChange[0]({operation:'create',req:{user:null,context:{publicMember:true}},data:{role:'owner',_verified:true}});
 assert.equal(result.role,'member');assert.equal(result._verified,false);
 assert.equal(users.access.create({req:{user:null,context:{}}}),false);
});
test('existing provisioning and verified Google ownership retain verified access',()=>{
 const hook=users.hooks.beforeChange[0];
 assert.equal(hook({operation:'create',req:{user:null,context:{bootstrapOwner:true}},data:{role:'owner'}})._verified,true);
 assert.equal(hook({operation:'update',req:{user:null,context:{googleVerified:true}},data:{password:'synthetic-new-password'}})._verified,true);
});
test('account email links stay on this app and only retain validated conversation IDs',()=>{
 const token='a'.repeat(40),mail=accountEmail('verify',token,{conversation:'https://attacker.invalid'});
 assert.match(mail.html,/\/tai-khoan\?mode=verify&amp;token=a{40}/);assert.ok(!mail.html.includes('attacker.invalid'));
 assert.match(accountEmail('reset',token,{accountLanguage:'de'}).subject,/Passwort/);
});

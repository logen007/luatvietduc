import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseContact} from '../src/modules/contact/input.ts';
import {contactEmail,deliverContact} from '../src/modules/contact/delivery.ts';
import {mergeValues,validateValues} from '../src/modules/integrations/validation.ts';
const input={name:'Synthetic visitor',email:'Visitor@Example.invalid',subject:'Synthetic contact',message:'Synthetic message\nSecond line',key:'12345678-1234-1234-1234-123456789abc',website:''};
const connection={apiKey:'synthetic-not-a-real-key',fromName:'Synthetic site',fromAddress:'site@example.invalid'};
test('contact fields reject missing content, header injection, oversized messages and bots',()=>{
 assert.equal(parseContact(input).email,'visitor@example.invalid');
 for(const change of [{name:''},{name:'Visitor\nBcc: other@example.invalid'},{email:'a@example.invalid,b@example.invalid'},{subject:'Subject\r\nHeader: injected'},{message:'x'.repeat(3001)},{key:'bad-key'},{website:'bot.example.invalid'}])assert.throws(()=>parseContact({...input,...change}));
});
test('the contact form cannot choose recipients or impersonate the sender',()=>{
 const data=parseContact({...input,to:'attacker@example.invalid',from:'attacker@example.invalid'});
 const email=contactEmail(data,connection,'owner@example.invalid');
 assert.deepEqual(email.to,['owner@example.invalid']);assert.equal(email.from,'Synthetic site <site@example.invalid>');assert.equal(email.reply_to,'visitor@example.invalid');assert.ok(!JSON.stringify(email).includes('attacker@example.invalid'));assert.equal(email.html,undefined);
});
test('email connections remain compatible and accept one optional contact recipient',()=>{
 assert.doesNotThrow(()=>validateValues('email',connection));
 assert.equal(mergeValues('email',connection,{...connection,contactTo:'inbox@example.invalid'}).contactTo,'inbox@example.invalid');
 for(const contactTo of ['a@example.invalid,b@example.invalid','a@example.invalid\r\nBcc: x@example.invalid'])assert.throws(()=>mergeValues('email',connection,{...connection,contactTo}));
});
test('retries reuse the provider idempotency key and success requires provider acceptance',async()=>{
 const seen=[];
 const request=async(url,options)=>{seen.push({url,options});return {ok:true,json:async()=>({id:'synthetic-email-id'})};};
 const contact=parseContact(input);
 assert.deepEqual(await deliverContact(contact,connection,'owner@example.invalid',request),{ok:true});
 await deliverContact(contact,connection,'owner@example.invalid',request);
 assert.equal(seen[0].url,'https://api.resend.com/emails');assert.equal(seen[0].options.headers['Idempotency-Key'],seen[1].options.headers['Idempotency-Key']);assert.equal(seen[0].options.redirect,'error');
 await assert.rejects(()=>deliverContact(contact,connection,'owner@example.invalid',async()=>({ok:false})));
 await assert.rejects(()=>deliverContact(contact,connection,'owner@example.invalid',async()=>({ok:true,json:async()=>({})})));
});

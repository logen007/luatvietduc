import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {customerConversationInfo} from '../src/modules/chat/customer-facts.ts';
import {normalizeBrowserContext,approximateLocation} from '../src/modules/chat/browser-context.ts';
import {conversationDisplayTitle,shortConversationId} from '../src/modules/chat/display.ts';
import {Details} from '../src/modules/chat/staff/Details.tsx';
import {Transcript} from '../src/modules/chat/staff/Transcript.tsx';
const row=(id,body,extra={})=>({id,body,role:'user',...extra});
test('customer contact facts retain source messages and use explicit first-person statements',()=>{
 const {facts}=customerConversationInfo([row(1,'Tôi tên là Nguyễn Văn A'),row(2,'Email của tôi là synthetic@example.invalid'),row(3,'SĐT: +49 30 123456'),row(4,'Tôi sống ở Berlin, Đức')]);
 assert.deepEqual(facts.map(f=>[f.field,f.value,f.messageId]),[['name','Nguyễn Văn A','1'],['email','synthetic@example.invalid','2'],['phone','+49 30 123456','3'],['location','Berlin, Đức','4']]);assert.equal(facts[0].quote,'Tôi tên là Nguyễn Văn A');
});
test('third parties, identification numbers, model text, private notes and deleted messages cannot fill a customer profile',()=>{
 const {facts}=customerConversationInfo([row(1,'Mẹ tôi tên là Nguyễn Thị B'),row(2,'Số điện thoại của mẹ tôi: 0901234567'),row(3,'012345678901'),row(4,'Tôi tên là Không Đúng',{role:'assistant'}),row(5,'Email: internal@example.invalid',{internal:true}),row(6,'Email: deleted@example.invalid',{metadata:{kind:'deleted'}})]);assert.deepEqual(facts,[]);
});
test('new contact details replace earlier statements and withdrawn phone/location facts disappear',()=>{
 let rows=[row(1,'SĐT: 0901234567'),row(2,'SĐT mới: 0912345678'),row(3,'Tôi sống ở Berlin')];assert.equal(customerConversationInfo(rows).facts.find(f=>f.field==='phone').value,'0912345678');
 rows.push(row(4,'Tôi không còn dùng số cũ'),row(5,'Tôi không còn ở Berlin'));assert.deepEqual(customerConversationInfo(rows).facts,[]);
});
test('browser hints are bounded and do not conflate estimated location with the legal matter location',()=>{
 assert.equal(normalizeBrowserContext({country:'DE',timeZone:'invalid',language:'not_a_locale'},'XX'),undefined);
 const browser=normalizeBrowserContext({timeZone:'Europe/Berlin',language:'de-DE'});assert.match(approximateLocation(browser),/Đức/);
 const info=customerConversationInfo([row(1,'Việc này liên quan đến quốc gia nào?',{role:'assistant',metadata:{clarificationKey:'inheritance.country'}}),row(2,'Việt Nam',{metadata:{browserContext:browser}})]);
 assert.equal(info.facts[0].field,'caseLocation');assert.equal(info.facts[0].value,'Việt Nam');assert.ok(!info.facts.some(f=>f.field==='location'));assert.match(approximateLocation(info.browser),/Đức/);
});
test('untitled and greeting-only conversations display a short identifier while named cases retain their title',()=>{
 const id='2778e971-ec9c-4733-b7b4-78ba9c3cc875';for(const title of [null,'','Cuộc trò chuyện mới','Hey','Hi','xin chào'])assert.equal(conversationDisplayTitle(id,title),'#2778e971');assert.equal(shortConversationId(id),'#2778e971');assert.equal(conversationDisplayTitle(id,'Thừa kế tại Việt Nam'),'Thừa kế tại Việt Nam');
 assert.equal(conversationDisplayTitle(id,'Hi',undefined,true),'Hi');assert.equal(conversationDisplayTitle(id,'A','Cuộc hội thoại mới',true),'A');
});
test('operator messages omit repeated names and own-message metadata, retaining incoming avatar/time and private-note labels',()=>{
 const id='2778e971-ec9c-4733-b7b4-78ba9c3cc875',state={messages:[{id:1,role:'user',body:'Synthetic message',created_at:'2026-11-08T00:00:00Z'},{id:2,role:'assistant',body:'Synthetic reply',created_at:'2026-11-08T00:01:00Z'},{id:3,role:'staff',author_name:'Synthetic staff',body:'Own reply text',created_at:'2026-11-08T00:02:00Z'}],conversation:{id,registered:true,state:'queued',customer:{name:'Synthetic customer',email:'synthetic@example.invalid',avatarURL:'/service/profile/avatar/1?v=synthetic'},info:{facts:[{field:'phone',value:'0901234567',messageId:'1',quote:'SĐT: 0901234567'}],browser:{timeZone:'Europe/Berlin'}}},staffAllowed:true};
 const chat=renderToStaticMarkup(React.createElement(Transcript,{state,onClaim(){}})),customer=chat.match(/<article[^>]*class="operator-message from-customer"[\s\S]*?<\/article>/)?.[0];assert.ok(customer);assert.ok(customer.includes('<time'));assert.ok(!customer.includes('<strong>'));assert.ok(!chat.includes('Luật Việt Đức'));assert.ok(!chat.includes('Trợ lý AI'));const own=chat.match(/<article id="operator-message-3"[\s\S]*?<\/article>/)?.[0];assert.ok(own?.includes('Own reply text'));assert.ok(!own.includes('<header>'));assert.ok(!own.includes('<time'));assert.ok(!own.includes('Synthetic staff'));assert.ok(customer.includes('/service/profile/avatar/1?v=synthetic'));assert.ok(chat.includes('operator-answer-icon'));
 const details=renderToStaticMarkup(React.createElement(Details,{state,onAction(){},onClose(){}}));assert.ok(!details.includes('Đã đăng nhập'));assert.ok(!details.includes('Nguồn tin nhắn'));for(const text of ['synthetic@example.invalid','#2778e971','0901234567','href="#operator-message-1"','Vị trí ước tính'])assert.ok(details.includes(text),text);
});

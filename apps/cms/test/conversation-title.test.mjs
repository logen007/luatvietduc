import test from 'node:test';
import assert from 'node:assert/strict';
import {conversationTitle} from '../src/modules/chat/conversation-title.ts';
const complete='Tôi muốn sang tên đất tại Việt Nam, có sổ đỏ đứng tên mẹ tôi, đang chuẩn bị và muốn biết thủ tục';
test('title recognizes a topic before intake completes and ignores greetings',()=>{
 for(const text of ['hi','Tôi muốn','Về đất đai',complete])assert.equal(conversationTitle(text,false),null);
 for(const text of ['hi','Đức','Tài sản'])assert.equal(conversationTitle(text,true),null);
 assert.equal(conversationTitle(complete,true),'Sang tên nhà đất tại Việt Nam');
 assert.equal(conversationTitle('hi\n'+complete,true),'Sang tên nhà đất tại Việt Nam');
});
test('title excludes personal details and handles German and a new incomplete case',()=>{
 assert.equal(conversationTitle(complete+' Nguyễn Văn A 0123456789',true),'Sang tên nhà đất tại Việt Nam');
 assert.equal(conversationTitle('Ich möchte ein Grundstück in Deutschland kaufen, meine Mutter ist im Grundbuch eingetragen, in Vorbereitung und ich möchte das Verfahren wissen',true),'Immobilienkauf in Deutschland');
 assert.equal(conversationTitle(complete+'\nCòn một mảnh đất khác tại Đức, tôi muốn mua',true),'Mua nhà đất tại Đức');
});

test('a short meaningful topic gets a title immediately without collecting country or timing',()=>{
 assert.equal(conversationTitle('hi\nly hôn'),'Ly hôn');assert.equal(conversationTitle('Về đất đai'),'Nhà đất');assert.equal(conversationTitle('Ich möchte zur Scheidung fragen'),'Scheidung');
});

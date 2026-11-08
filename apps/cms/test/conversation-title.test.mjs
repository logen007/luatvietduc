import test from 'node:test';
import assert from 'node:assert/strict';
import {conversationTitle,proposedConversationTitle,recoveredConversationTitle} from '../src/modules/chat/conversation-title.ts';
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

test('AI topic names work outside the fixed intake catalogue without exposing identifiers',()=>{
 const context='về thời gian ở tù\ntôi cần đi tù 20 năm\nxin ân xá bạn ơi';
 assert.equal(conversationTitle(context,true,'Xin ân xá'),'Xin ân xá');
 assert.equal(conversationTitle('Ich möchte eine Versicherung abschließen',true,'Fragen zur Krankenversicherung'),'Fragen zur Krankenversicherung');
 assert.equal(conversationTitle('ly hôn',true,'Phân chia tài sản'),'Phân chia tài sản','A semantic title can refine an automatic category label');
 for(const value of [null,{},'', 'Cuộc hội thoại mới','Hi','x'.repeat(81),'Name me@example.invalid','ID 012345678901','<b>Xin ân xá</b>','https://example.invalid','Title\nnew line'])assert.equal(proposedConversationTitle(value),undefined,String(value));
});
test('old unnamed histories get a readable fallback, while existing and manual names stay intact',()=>{
 const context='hi\ntôi muốn\nvề thời gian ở tù\ntôi cần 20 năm\nxin ân xá bạn ơi';
 assert.equal(recoveredConversationTitle('Cuộc trò chuyện mới',context),'Thời gian ở tù');
 assert.equal(recoveredConversationTitle('Cuộc hội thoại mới','xin chào\nTôi tên là Nguyễn Văn A\nSĐT 0123456789\nvề bảo hiểm'),'Bảo hiểm');
 assert.equal(recoveredConversationTitle('Tên tôi đặt',context,true),'Tên tôi đặt');assert.equal(recoveredConversationTitle('Cuộc hội thoại mới',context,true),'Cuộc hội thoại mới');
 assert.equal(recoveredConversationTitle('Ly hôn',context),'Ly hôn');assert.equal(recoveredConversationTitle('Cuộc hội thoại mới','hi\ntôi muốn'),'Cuộc hội thoại mới');
});

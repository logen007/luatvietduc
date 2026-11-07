import test from 'node:test';
import assert from 'node:assert/strict';
import {conversationTitle} from '../src/modules/chat/conversation-title.ts';
const complete='Tôi muốn sang tên đất tại Việt Nam, có sổ đỏ đứng tên mẹ tôi, đang chuẩn bị và muốn biết thủ tục';
test('title waits for complete active context, not a greeting or fragment',()=>{
 for(const text of ['hi','Tôi muốn','Về đất đai',complete])assert.equal(conversationTitle(text,false),null);
 for(const text of ['hi','Về đất đai','Đức','Tài sản'])assert.equal(conversationTitle(text,true),null);
 assert.equal(conversationTitle(complete,true),'Sang tên nhà đất tại Việt Nam');
 assert.equal(conversationTitle('hi\n'+complete,true),'Sang tên nhà đất tại Việt Nam');
});
test('title excludes personal details and handles German and a new incomplete case',()=>{
 assert.equal(conversationTitle(complete+' Nguyễn Văn A 0123456789',true),'Sang tên nhà đất tại Việt Nam');
 assert.equal(conversationTitle('Ich möchte ein Grundstück in Deutschland kaufen, meine Mutter ist im Grundbuch eingetragen, in Vorbereitung und ich möchte das Verfahren wissen',true),'Immobilienkauf in Deutschland');
 assert.equal(conversationTitle(complete+'\nCòn một mảnh đất khác tại Đức, tôi muốn mua',true),null);
});

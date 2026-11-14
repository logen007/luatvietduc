import test from 'node:test';
import assert from 'node:assert/strict';
import {initialChatQuestion} from '../src/modules/chat/intake.ts';
test('a public topic opens a bounded editable question ahead of an older homepage draft',()=>{
 assert.equal(initialChatQuestion('?question='+encodeURIComponent('  Thừa kế theo pháp luật  '),'Older question'),'Thừa kế theo pháp luật');
 assert.equal(initialChatQuestion('?conversation=saved-id',' Homepage question '),'Homepage question');
 assert.equal(initialChatQuestion('?question=','Saved question'),'Saved question');
 assert.equal(initialChatQuestion('?',null),'');assert.equal(initialChatQuestion('?question=abcdef',null,4),'abcd');
});

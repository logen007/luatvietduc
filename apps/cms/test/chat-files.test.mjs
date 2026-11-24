import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateChatFile,MAX_CHAT_FILE} from '../src/modules/chat/files.ts';
test('chat attachments reject executable, mismatched, binary text and oversized files',()=>{
 for(const [name,body] of [['x.exe',Buffer.from('text')],['x.pdf',Buffer.from('MZbinary')],['x.txt',Buffer.from([0,1,2])],['x.png',Buffer.from('not png')],['x.txt',Buffer.alloc(MAX_CHAT_FILE+1,65)]])assert.throws(()=>validateChatFile(name,body));
 assert.equal(validateChatFile('document.pdf',Buffer.from('%PDF-1.7 synthetic')),'application/pdf');
 assert.equal(validateChatFile('notes.txt',Buffer.from('Nội dung thử nghiệm')),'text/plain');
});

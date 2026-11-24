import test from 'node:test';
import assert from 'node:assert/strict';
import {validDocumentBatch,DOCUMENT_TOTAL_BYTES} from '../src/modules/chat/document-consent.ts';
import {validateDocumentReply} from '../src/modules/assistant/documents.ts';
import {createMessageOutbox} from '../src/modules/chat/client-operations.ts';
test('document input bounds reject unsupported, empty, oversized and excessive bundles',()=>{
 for(const mimeType of ['application/pdf','image/png','image/jpeg','image/webp'])assert.equal(validDocumentBatch([{mimeType,size:50}]),true);
 for(const files of [[],[{mimeType:'text/plain',size:50}],[{mimeType:'image/svg+xml',size:50}],[{mimeType:'image/png',size:0}],[{mimeType:'image/png',size:11*1024*1024}],Array(5).fill({mimeType:'image/png',size:50}),Array(2).fill({mimeType:'application/pdf',size:DOCUMENT_TOTAL_BYTES/2+1})])assert.equal(validDocumentBatch(files),false);
});
test('document responses are bounded plain text and cannot add tool or HTML instructions',()=>{
 assert.deepEqual(validateDocumentReply({kind:'unreadable',body:'Ảnh bị mờ, vui lòng gửi bản rõ hơn.'}),{kind:'unreadable',body:'Ảnh bị mờ, vui lòng gửi bản rõ hơn.'});
 for(const result of [null,{},[],{kind:'execute',body:'run'},{kind:'answer',body:'<script>bad</script>'},{kind:'answer',body:'a'.repeat(6001)},{kind:'answer',body:'hello',tool:'delete'}])assert.throws(()=>validateDocumentReply(result));
});
test('consenting and declining document processing cannot share an idempotency key',async()=>{
 const sent=[];let id=0;const box=createMessageOutbox(async(_c,d)=>{sent.push(d);throw Error('Synthetic unknown result');},()=>String(++id).padStart(16,'0'));
 const draft={body:'Đọc giúp tôi',internal:false,fileIds:['synthetic']};
 await assert.rejects(()=>box.send('c',{...draft,documentConsentVersion:'gemini-documents-v1'}));
 await assert.rejects(()=>box.send('c',{...draft,documentConsentVersion:'gemini-documents-v1'}));
 await assert.rejects(()=>box.send('c',draft));
 assert.equal(sent[0].key,sent[1].key);assert.notEqual(sent[0].key,sent[2].key);
});

test('document retry preserves its consent identity through explicit account navigation',async()=>{
 const {saveDraftHandoff,takeDraftHandoff}=await import('../src/modules/chat/drafts.ts');
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const conversation='11111111-2222-4333-8444-555555555555',id='22222222-3333-4444-8555-666666666666';
 const draft={text:'Đọc giúp tôi',attachments:[{id,name:'synthetic.pdf',size:50,mimeType:'application/pdf',url:'/service/chat-files/'+id}]};
 saveDraftHandoff(storage,null,conversation,draft,1000,'synthetic-retry-key-123','gemini-documents-v1');
 const restored=takeDraftHandoff(storage,7,[conversation],conversation,1100);
 assert.equal(restored.retry.documentConsentVersion,'gemini-documents-v1');
 let sent;const box=createMessageOutbox(async(_id,value)=>{sent=value;return {id:1,role:'user',duplicate:true};});
 box.restore(conversation,{body:restored.retry.body,internal:false,fileIds:restored.retry.fileIds,documentConsentVersion:restored.retry.documentConsentVersion},restored.retry.key);
 await box.send(conversation,{body:draft.text,internal:false,fileIds:[id],documentConsentVersion:'gemini-documents-v1'});
 assert.equal(sent.key,'synthetic-retry-key-123');
});

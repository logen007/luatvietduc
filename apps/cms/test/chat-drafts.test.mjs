import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraftBook,saveDraftHandoff,takeDraftHandoff,handoffKey} from '../src/modules/chat/drafts.ts';
const id='11111111-2222-4333-8444-555555555555',other='22222222-2222-4333-8444-555555555555';
const file={id:other,name:'Synthetic.txt',mimeType:'text/plain',size:12,url:'/service/chat-files/'+other};
const draft={text:'Unsent synthetic question',attachments:[file]};
function storage(){const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}
test('conversation drafts remain independent, cloned and removable after acknowledged sends',()=>{
 const book=createDraftBook();book.save(id,draft);book.save(other,{text:'Other question',attachments:[]});book.save('',{text:'New question',attachments:[]});
 const read=book.get(id);read.text='modified';read.attachments[0].name='modified';
 assert.deepEqual(book.get(id),draft);assert.equal(book.get(other).text,'Other question');
 book.remove(id);assert.equal(book.get(id).text,'');assert.equal(book.get('').text,'New question');
 book.clear();assert.deepEqual(book.get(other),{text:'',attachments:[]});
});
test('account navigation restores once for the same owner or an explicitly linked guest conversation',()=>{
 for(const [before,after] of [[7,7],[null,null],[null,8]]){
  const s=storage();saveDraftHandoff(s,before,id,draft,1000);
  assert.deepEqual(takeDraftHandoff(s,after,[id],id,2000),draft);
  assert.equal(takeDraftHandoff(s,after,[id],id,2000),null);
 }
});
test('draft restoration requires current server ownership, matching identity, conversation and lifetime',()=>{
 for(const [owner,ids,requested,now] of [[8,[id],id,2000],[7,[],id,2000],[7,[id],other,2000],[7,[id],id,901000],[7,[id],id,-1000]]){
  const s=storage();saveDraftHandoff(s,7,id,draft,1000);assert.equal(takeDraftHandoff(s,owner,ids,requested,now),null);assert.equal(s.getItem(handoffKey),null);
 }
});
test('stored attachment URLs are rebuilt locally; malformed and oversized handoffs are discarded',()=>{
 const s=storage();saveDraftHandoff(s,7,id,{...draft,attachments:[{...file,url:'https://example.invalid/private'}]},1000);
 assert.equal(takeDraftHandoff(s,7,[id],id,2000).attachments[0].url,file.url);
 for(const value of ['{','x'.repeat(100001),JSON.stringify({version:1,userId:7,conversation:id,expires:5000,draft:{text:'x',attachments:[{...file,size:20*1024*1024}]}})]){s.setItem(handoffKey,value);assert.equal(takeDraftHandoff(s,7,[id],id,2000),null);}
});

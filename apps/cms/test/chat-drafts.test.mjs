import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraftBook,saveDraftHandoff,takeDraftHandoff,handoffKey} from '../src/modules/chat/drafts.ts';
import {invalidatePublicSession} from '../src/modules/shared/session-client.ts';
const id='11111111-2222-4333-8444-555555555555',other='22222222-2222-4333-8444-555555555555';
const file={id:other,name:'Synthetic.txt',mimeType:'text/plain',size:12,url:'/service/chat-files/'+other};
const draft={text:'Unsent synthetic question',attachments:[file]};
function storage(){const values=new Map();return {get length(){return values.size;},key:index=>[...values.keys()][index]??null,getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}
test('conversation drafts remain independent, cloned and removable after acknowledged sends',()=>{
 const book=createDraftBook();book.save(id,draft);book.save(other,{text:'Other question',attachments:[]});book.save('',{text:'New question',attachments:[]});
 const read=book.get(id);read.text='modified';read.attachments[0].name='modified';
 assert.deepEqual(book.get(id),draft);assert.equal(book.get(other).text,'Other question');
 book.remove(id);assert.equal(book.get(id).text,'');assert.equal(book.get('').text,'New question');
 book.clear();assert.deepEqual(book.get(other),{text:'',attachments:[]});
});
test('reply attachment drafts are bounded in workspace memory and clear with their owner',()=>{
 const book=createDraftBook();book.save(id,draft);book.save(other,{text:'Other reply',attachments:[]});
 assert.deepEqual(book.get(id).attachments,[file]);book.remove(other);assert.deepEqual(book.get(id),draft);
 for(let index=0;index<50;index++)book.save('synthetic-'+index,{text:'Reply '+index,attachments:[file]});
 assert.deepEqual(book.get(id),{text:'',attachments:[]},'The oldest inactive draft can leave the 50-entry draft book');
 assert.equal(book.get('synthetic-49').attachments[0].id,file.id);book.clear();assert.deepEqual(book.get('synthetic-49'),{text:'',attachments:[]});
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

test('successful sign-in preserves only its matching customer handoff while clearing every staff draft',()=>{
 const previous={sessionStorage:globalThis.sessionStorage,localStorage:globalThis.localStorage,document:globalThis.document};
 try{
  for(const [before,after] of [[null,8],[7,7]]){
   const s=storage();globalThis.sessionStorage=s;globalThis.localStorage={setItem(){}};globalThis.document=new EventTarget();
   saveDraftHandoff(s,before,id,draft,1000);s.setItem('lvd-staff-draft:7:private:reply','Private staff draft');
   invalidatePublicSession({preserveCustomerHandoffFor:id});
   assert.equal(s.getItem('lvd-staff-draft:7:private:reply'),null);
   assert.deepEqual(takeDraftHandoff(s,after,[id],id,2000),draft,'A verified sign-in must not erase the linked customer attachment draft before return');
   assert.equal(s.getItem(handoffKey),null,'The return still consumes its handoff only once');
  }
 }finally{Object.assign(globalThis,previous);}
});

test('logout/error invalidation and a different login return clear handoffs; preservation never bypasses ownership',()=>{
 const previous={sessionStorage:globalThis.sessionStorage,localStorage:globalThis.localStorage,document:globalThis.document};
 try{
  globalThis.localStorage={setItem(){}};globalThis.document=new EventTarget();
  for(const options of [undefined,{preserveCustomerHandoffFor:other},{preserveCustomerHandoffFor:'invalid'}]){
   const s=storage();globalThis.sessionStorage=s;saveDraftHandoff(s,null,id,draft,1000);s.setItem('lvd-staff-draft:7:private:reply','Private staff draft');
   invalidatePublicSession(options);assert.equal(s.getItem(handoffKey),null);assert.equal(s.getItem('lvd-staff-draft:7:private:reply'),null);
  }
  for(const [owner,owned] of [[8,[id]],[7,[]]]){
   const s=storage();globalThis.sessionStorage=s;saveDraftHandoff(s,7,id,draft,1000);invalidatePublicSession({preserveCustomerHandoffFor:id});
   assert.equal(takeDraftHandoff(s,owner,owned,id,2000),null,'The new identity and real owned-conversation list remain authoritative');
  }
  const malformed=storage();globalThis.sessionStorage=malformed;malformed.setItem(handoffKey,'{');malformed.setItem('lvd-staff-draft:7:private:reply','Private staff draft');
  invalidatePublicSession({preserveCustomerHandoffFor:id});assert.equal(malformed.getItem(handoffKey),null);assert.equal(malformed.getItem('lvd-staff-draft:7:private:reply'),null);
 }finally{Object.assign(globalThis,previous);}
});

test('session invalidations notify other tabs distinctly even within the same clock tick',t=>{
 const previous={sessionStorage:globalThis.sessionStorage,localStorage:globalThis.localStorage,document:globalThis.document},notifications=[];
 t.mock.method(Date,'now',()=>123456789);
 try{
  globalThis.sessionStorage=storage();globalThis.document=new EventTarget();globalThis.localStorage={setItem(key,value){assert.equal(key,'lvd-session-revision');notifications.push(value);}};
  invalidatePublicSession();invalidatePublicSession();
  assert.equal(notifications.length,2);assert.notEqual(notifications[0],notifications[1],'Browsers suppress a storage event when the value is unchanged');
 }finally{Object.assign(globalThis,previous);}
});

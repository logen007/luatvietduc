import assert from 'node:assert/strict';

// Browser-only synthetic service fixtures. No provider calls or real chat writes.
export async function testChatReview({page,base,owner}){
 const origin=new URL(base).origin;
 assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
 const viewport=page.viewportSize(),a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',fileId='33333333-3333-4333-8333-333333333333';
 const draftKey=`lvd-staff-draft:${owner.id}:${a}:reply`,previous=await page.evaluate(key=>sessionStorage.getItem(key),draftKey);
 const threads=new Map([a,b].map((id,index)=>[id,{id,title:'Synthetic review '+(index?'B':'A'),state:'human',version:1,assignedTo:owner.id,aiEnabled:false,registered:true,customer:{name:'Synthetic customer '+index,email:null}}]));
 const sent=new Map([[a,[]],[b,[]]]);
 const session=route=>route.fulfill({json:{user:{id:owner.id,name:'Synthetic specialist',role:'support',jurisdictions:['VN','DE']},connections:{}}});
 const inboxRequests=[];
 const inbox=route=>{const q=new URL(route.request().url()).searchParams;inboxRequests.push({q:q.get('q'),page:q.get('page')});return route.fulfill({json:{rows:[...threads.values()].map(thread=>({...thread,updated_at:'2026-11-05T00:00:00Z'})),counts:{all:6,active:6,queue:0},total:6,totalPages:3,page:Number(q.get('page'))||1}});};
 const matches=url=>url.origin===origin&&[a,b].some(id=>url.pathname.startsWith('/service/conversations/'+id));
 const handler=async route=>{
  const request=route.request(),url=new URL(request.url()),id=url.pathname.split('/')[3],thread=threads.get(id);assert.ok(thread);
  if(request.method()==='GET')return route.fulfill({json:{conversation:thread,messages:[]}});
  if(url.pathname.endsWith('/files'))return route.fulfill({json:{id:fileId,name:'Synthetic draft.txt',mimeType:'text/plain',size:15,url:'/service/chat-files/'+fileId}});
  if(url.pathname.endsWith('/messages')){
   const body=request.postDataJSON(),attempts=sent.get(id);attempts.push(body);
   if(id===a&&attempts.length===1)return route.fulfill({status:503,json:{error:'Synthetic send acknowledgment unavailable'}});
   return route.fulfill({json:{id:id===a?'101':'202',role:'staff',duplicate:id===a}});
  }
  assert.ok(url.pathname.endsWith('/transition'));assert.equal(request.postDataJSON().action,'release');
  threads.set(id,{id,title:'Yêu cầu chờ tiếp nhận',state:'queued',version:2,restricted:true,assignedTo:null,aiEnabled:false,registered:true});
  return route.fulfill({json:{state:'queued',version:2}});
 };
 try{
  await page.route('**/service/me',session);await page.route('**/service/inbox?*',inbox);await page.route(matches,handler);
  await page.setViewportSize({width:1280,height:900});await page.goto(origin+'/admin/inbox');
  const list=page.locator('.operator-inbox');await list.locator('.operator-thread').first().waitFor();
  for(const target of [2,3]){const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/service/inbox'&&new URL(r.url()).searchParams.get('page')===String(target));await list.getByRole('button',{name:'Trang sau',exact:true}).click();await response;await list.locator('.operator-thread').first().waitFor();}
  const beforeSearch=inboxRequests.length,search=list.getByRole('textbox',{name:'Tìm hội thoại theo tiêu đề hoặc mã',exact:true});
  const searchResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/service/inbox'&&new URL(r.url()).searchParams.get('q')==='Berlin');await search.fill('  Berlin  ');await searchResponse;
  assert.deepEqual(inboxRequests.slice(beforeSearch),[{q:'Berlin',page:'1'}],'A search from page three waits for the new query instead of requesting the old first page');assert.equal(await search.inputValue(),'  Berlin  ');
  const beforeWhitespace=inboxRequests.length;await search.fill(' Berlin   ');await page.waitForTimeout(300);assert.equal(inboxRequests.length,beforeWhitespace,'Equivalent whitespace does not trigger another query');assert.equal(await search.getAttribute('maxlength'),'120');
  const clearResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/service/inbox'&&new URL(r.url()).searchParams.get('q')==='');await search.fill('');await clearResponse;
  const select=async label=>{await page.locator('.operator-threads').getByRole('button',{name:new RegExp('Synthetic review '+label)}).click();await page.waitForFunction(()=>!document.querySelector('.operator-composer textarea')?.disabled);};
  const composer=page.locator('.operator-composer'),text=composer.getByRole('textbox',{name:'Nội dung trả lời khách',exact:true});
  await select('A');await text.fill('Synthetic unsent A');await composer.locator('input[type=file]').setInputFiles({name:'Synthetic draft.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic draft')});await composer.getByRole('button',{name:'Bỏ tệp Synthetic draft.txt',exact:true}).waitFor();
  await select('B');assert.equal(await text.inputValue(),'');await text.fill('Synthetic unsent B');
  await select('A');assert.equal(await text.inputValue(),'Synthetic unsent A');assert.ok(await composer.locator('.operator-pending-files').isVisible(),'Specialist attachments survive a conversation switch');
  await composer.getByRole('button',{name:'Gửi phản hồi',exact:false}).click();await page.locator('.operator-error').getByText('Synthetic send acknowledgment unavailable',{exact:false}).waitFor();
  await select('B');assert.equal(await text.inputValue(),'Synthetic unsent B');await composer.getByRole('button',{name:'Gửi phản hồi',exact:false}).click();await page.waitForFunction(()=>document.querySelector('.operator-composer textarea')?.value==='');
  await select('A');await composer.getByRole('button',{name:'Gửi phản hồi',exact:false}).click();await page.waitForFunction(()=>document.querySelector('.operator-composer textarea')?.value==='');
  assert.equal(sent.get(a).length,2);assert.equal(sent.get(a)[0].key,sent.get(a)[1].key,'Returning after another send preserves the ambiguous attempt key');assert.notEqual(sent.get(a)[0].key,sent.get(b)[0].key);
  await text.fill('Synthetic private draft before release');assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),draftKey),'Synthetic private draft before release');
  await page.getByRole('button',{name:'Thông tin hội thoại',exact:true}).click();await page.getByRole('button',{name:'Trả về hàng chờ',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.operator-composer textarea')?.disabled&&document.querySelector('.operator-composer textarea')?.value==='');
  assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),draftKey),null,'Explicit access withdrawal clears the tab draft');assert.equal(await composer.locator('.operator-pending-files').count(),0);
  console.log('Chat review browser checks passed: specialist text/files, cross-conversation retry keys and release privacy');
 }finally{
  await page.unroute(matches,handler);await page.unroute('**/service/inbox?*',inbox);await page.unroute('**/service/me',session);
  await page.evaluate(({key,value})=>{if(value===null)sessionStorage.removeItem(key);else sessionStorage.setItem(key,value);},{key:draftKey,value:previous});
  if(viewport)await page.setViewportSize(viewport);await page.goto(origin+'/tai-khoan');
 }
}

export async function testCustomerHistoryRecovery({page,base}){
 const origin=new URL(base).origin;assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
 const viewport=page.viewportSize(),id='44444444-4444-4444-8444-444444444444',fileId='55555555-5555-4555-8555-555555555555';let created=false,failedHistory=0,sent=null,uploads=0;
 const session=route=>route.fulfill({json:{user:null,connections:{google:false}}});
 const matches=url=>url.origin===origin&&(url.pathname==='/service/conversations'||url.pathname.startsWith('/service/conversations/'+id));
 const handler=route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(path==='/service/conversations'){
   if(request.method()==='POST'){created=true;return route.fulfill({json:{id}});}
   if(created){failedHistory++;return route.fulfill({status:503,json:{error:'Synthetic history unavailable'}});}
   return route.fulfill({json:[]});
  }
  if(path.endsWith('/messages')){sent=request.postDataJSON();return route.fulfill({json:{id:'301',role:'user'}});}
  if(path.endsWith('/files')){uploads++;return uploads===2?route.fulfill({status:503,json:{error:'Synthetic second upload unavailable'}}):route.fulfill({json:{id:fileId,name:'Synthetic retained.txt',mimeType:'text/plain',size:10,url:'/service/chat-files/'+fileId}});}
  assert.equal(request.method(),'GET');return route.fulfill({json:{conversation:{id,title:'Synthetic acknowledged chat',state:'queued',version:1,aiEnabled:false},messages:sent?[{id:'301',role:'user',body:sent.body,client_key:sent.key,created_at:'2026-11-05T00:00:00Z'}]:[]}});
 };
 try{
  await page.route('**/service/me',session);await page.route(matches,handler);await page.setViewportSize({width:1280,height:900});await page.goto(origin+'/tro-chuyen');
  const question=page.getByRole('textbox',{name:'Câu hỏi của bạn',exact:true});await page.waitForFunction(()=>!document.querySelector('.chat-compose textarea')?.disabled);await question.fill('Synthetic sent question');
  const historyFailure=page.waitForResponse(r=>new URL(r.url()).pathname==='/service/conversations'&&r.status()===503);await page.getByRole('button',{name:'Gửi câu hỏi',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.chat-compose textarea')?.value==='');await historyFailure;
  await question.fill('Synthetic retained draft');await page.locator('.chat-compose input[type=file]').setInputFiles([{name:'Synthetic retained.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic!')},{name:'Synthetic rejected.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic!')}]);await page.getByRole('button',{name:'Bỏ tệp Synthetic retained.txt',exact:true}).waitFor();await page.getByRole('alert').filter({hasText:'Synthetic second upload unavailable'}).waitFor();assert.equal(uploads,2,'Failed uploads never retry automatically');assert.equal(await question.inputValue(),'Synthetic retained draft');assert.equal(await page.getByRole('button',{name:'Gửi câu hỏi',exact:true}).isEnabled(),true,'Partial failure releases the composer while preserving the first attachment');
  const sidebar=page.locator('.chat-sidebar');await sidebar.getByRole('button',{name:'Cuộc trò chuyện mới',exact:true}).click();await sidebar.locator('.chat-history-list').getByRole('button',{name:/Synthetic acknowledged chat/}).click();
  await page.waitForFunction(()=>document.querySelector('.chat-compose textarea')?.value==='Synthetic retained draft');await page.getByRole('button',{name:'Bỏ tệp Synthetic retained.txt',exact:true}).waitFor();assert.ok(failedHistory>0);
  console.log('Customer history browser checks passed: acknowledged chat remains reachable with draft/files after history failure');
 }finally{
  await page.unroute(matches,handler);await page.unroute('**/service/me',session);if(viewport)await page.setViewportSize(viewport);await page.goto(origin+'/tai-khoan');
 }
}

// Real React navigation and password-login form, with every chat/auth request
// intercepted. The fake sign-in cannot change database rows or real cookies.
export async function testChatLoginDraftHandoff({page,base}){
 const origin=new URL(base).origin;assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
 const id='66666666-6666-4666-8666-666666666666',fileId='77777777-7777-4777-8777-777777777777',handoff='lvd-chat-handoff-v1',staffDraft='lvd-staff-draft:synthetic-login:private:reply',text='Synthetic guest draft survives password sign-in';
 const previous=await page.evaluate(keys=>keys.map(key=>[key,sessionStorage.getItem(key)]),[handoff,staffDraft]);
 let created=false,signedIn=false,uploads=0,logins=0,sends=0;
 const conversation=()=>({id,title:'Synthetic linked conversation',state:'queued',version:1,aiEnabled:false,registered:signedIn});
 const session=route=>route.fulfill({json:{user:signedIn?{id:888888,name:'Synthetic signed-in member',role:'member'}:null,connections:{google:false}}});
 const matches=url=>url.origin===origin&&(url.pathname==='/service/conversations'||url.pathname.startsWith('/service/conversations/'+id));
 const chat=route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(path==='/service/conversations'){
   if(request.method()==='POST'){created=true;return route.fulfill({json:{id}});}
   return route.fulfill({json:created?[conversation()]:[]});
  }
  if(path.endsWith('/files')){uploads++;return route.fulfill({json:{id:fileId,name:'Synthetic login draft.txt',mimeType:'text/plain',size:10,url:'/service/chat-files/'+fileId}});}
  if(request.method()!=='GET'){sends++;return route.fulfill({status:400,json:{error:'Unexpected synthetic write'}});}
  return route.fulfill({json:{conversation:conversation(),messages:[]}});
 };
 const login=route=>{
  const value=route.request().postDataJSON();assert.equal(value.conversation,id);assert.equal(value.email,'synthetic-login@example.invalid');
  logins++;signedIn=true;return route.fulfill({json:{ok:true,redirectTo:'/tro-chuyen?conversation='+id}});
 };
 try{
  await page.route('**/service/me',session);await page.route(matches,chat);await page.route('**/service/auth/login',login);await page.goto(origin+'/tro-chuyen');
  const question=page.getByRole('textbox',{name:'Câu hỏi của bạn',exact:true});await page.waitForFunction(()=>!document.querySelector('.chat-compose textarea')?.disabled);await question.fill(text);
  await page.locator('.chat-compose input[type=file]').setInputFiles({name:'Synthetic login draft.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic!')});
  await page.getByRole('button',{name:'Bỏ tệp Synthetic login draft.txt',exact:true}).waitFor();
  await page.evaluate(key=>sessionStorage.setItem(key,'Synthetic private staff draft'),staffDraft);
  if(await page.locator('.live-header-login-button').isVisible())await page.locator('.live-header-login-button').click();else{await page.getByRole('button',{name:'Mở menu',exact:true}).click();await page.locator('.live-menu-dialog').getByRole('link',{name:'Đăng nhập',exact:true}).click();}await page.waitForURL(url=>url.pathname==='/tai-khoan'&&url.searchParams.get('conversation')===id);
  assert.equal(await page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)).conversation,handoff),id);
  await page.locator('.live-auth-switch a').click();await page.getByRole('heading',{name:'Đăng nhập',exact:true}).waitFor();
  await page.getByLabel('Địa chỉ email',{exact:true}).fill('synthetic-login@example.invalid');await page.getByLabel('Mật khẩu',{exact:true}).fill('Synthetic-password-login-123');
  await page.locator('.live-credentials-form').getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL(url=>url.pathname==='/tro-chuyen'&&url.searchParams.get('conversation')===id);
  await page.waitForFunction(value=>document.querySelector('.chat-compose textarea')?.value===value,text);await page.getByRole('button',{name:'Bỏ tệp Synthetic login draft.txt',exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(keys=>keys.map(key=>sessionStorage.getItem(key)),[handoff,staffDraft]),[null,null],'Customer handoff is consumed once and staff drafts never cross sign-in');
  assert.equal(uploads,1);assert.equal(logins,1);assert.equal(sends,0,'Restoring a linked guest draft must never send it');
  console.log('Chat login draft browser checks passed: guest text/file survive password sign-in and owned return, staff drafts clear, no automatic send');
 }finally{
  await page.unroute('**/service/auth/login',login);await page.unroute(matches,chat);await page.unroute('**/service/me',session);await page.goto(origin+'/tai-khoan');
  await page.evaluate(values=>{for(const [key,value] of values){if(value===null)sessionStorage.removeItem(key);else sessionStorage.setItem(key,value);}},previous);
 }
}

// Actual mounted workspaces; all session/chat traffic is synthetic and local.
export async function testChatSessionRecovery({page,base,owner}){
 const origin=new URL(base).origin;assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
 for(const staff of [true,false]){
  const id=staff?'88888888-8888-4888-8888-888888888888':'99999999-9999-4999-8999-999999999999',initial={id:owner.id,name:'Synthetic recovery owner',role:staff?'support':'member',jurisdictions:['VN','DE']};
  const draftKey=`lvd-staff-draft:${owner.id}:${id}:reply`,previous=await page.evaluate(key=>sessionStorage.getItem(key),draftKey);
  let user={...initial},failure=0,mode='reject',uploads=0,holdRead=false,readCaptured,releaseRead,sendCaptured,releaseSend;
  const posts=[],saved=[],sessionReads=[],files=new Map(),thread=()=>({id,title:'Synthetic recovery thread',state:staff?'human':'queued',version:1,assignedTo:user.id,aiEnabled:false,registered:true,customer:{name:'Synthetic recovery customer',email:null}});
  const session=route=>{sessionReads.push(failure);return route.fulfill(failure?{status:failure,json:{error:'Synthetic session unavailable'}}:{json:{user,connections:{google:false}}});};
  const inbox=route=>route.fulfill({json:{rows:[{...thread(),updated_at:'2026-11-06T00:00:00Z'}],counts:{all:1,active:1,queue:0},total:1,totalPages:1,page:1}});
  const questions=route=>route.fulfill({json:{questions:[]}});
  const matches=url=>url.origin===origin&&(url.pathname==='/service/conversations'||url.pathname.startsWith('/service/conversations/'+id));
  const handler=async route=>{
   const request=route.request(),path=new URL(request.url()).pathname;
   if(path==='/service/conversations')return route.fulfill({json:[thread()]});
   if(path.endsWith('/files')){const fileId='abababab-abab-4bab-8bab-'+String(++uploads).padStart(12,'0'),file={id:fileId,name:'Synthetic session.txt',size:10,mimeType:'text/plain',url:'/service/chat-files/'+fileId};files.set(fileId,file);return route.fulfill({json:file});}
   if(path.endsWith('/messages')){
    const value=request.postDataJSON();posts.push(value);let message=saved.find(item=>item.client_key===value.key);
    const duplicate=Boolean(message);if(!message){message={id:String(600+saved.length),role:staff?'staff':'user',body:value.body,client_key:value.key,created_at:'2026-11-06T00:00:00Z',attachments:(value.fileIds||[]).map(key=>files.get(key))};saved.push(message);}
    const attempt=mode;if(attempt==='hold'){sendCaptured?.();await new Promise(resolve=>{releaseSend=resolve;});}
    return route.fulfill(attempt==='reject'?{status:503,json:{error:'Synthetic ambiguous save'}}:{json:{id:message.id,role:message.role,duplicate}});
   }
   assert.equal(request.method(),'GET');if(holdRead){holdRead=false;readCaptured?.();await new Promise(resolve=>{releaseRead=resolve;});}
   const after=Number(new URL(request.url()).searchParams.get('after')||0);return route.fulfill({json:{conversation:thread(),messages:saved.filter(item=>Number(item.id)>after)}});
  };
  try{
   await page.route('**/service/me',session);await page.route('**/service/inbox?*',inbox);await page.route('**/service/assistant/questions',questions);await page.route(matches,handler);
   await page.goto(origin+(staff?'/admin/inbox':'/tro-chuyen'));
   const box=page.locator(staff?'.operator-composer textarea':'.chat-compose textarea'),send=()=>page.getByRole('button',{name:staff?'Gửi phản hồi':'Gửi câu hỏi',exact:!staff}),error=page.locator(staff?'.operator-error':'.chat-error');
   const select=async()=>{if(staff){await page.locator('.operator-workspace[aria-busy=false]').waitFor();await page.locator('.operator-thread').filter({hasText:'Synthetic recovery thread'}).click();}await page.waitForFunction(selector=>{const input=document.querySelector(selector);return input&&!input.disabled;},staff?'.operator-composer textarea':'.chat-compose textarea');};
   const attach=async()=>{await page.locator(staff?'.operator-composer input[type=file]':'.chat-compose input[type=file]').setInputFiles({name:'Synthetic session.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic!')});await page.getByRole('button',{name:'Bỏ tệp Synthetic session.txt',exact:true}).waitFor();};
   const failSession=async(status=503)=>{
    failure=status;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    try{await error.getByRole('button',{name:'Thử lại',exact:true}).waitFor();}catch(problem){
     const view=await page.evaluate(()=>({workspace:Boolean(document.querySelector('.operator-workspace')),busy:document.querySelector('.operator-workspace')?.getAttribute('aria-busy'),errors:[...document.querySelectorAll('.operator-error,.chat-error')].map(node=>node.textContent),buttons:[...document.querySelectorAll('.operator-workspace button')].map(node=>node.textContent),composers:document.querySelectorAll('.operator-composer').length}));
     console.error('Synthetic session recovery diagnostics',JSON.stringify({staff,status,sessionReads,href:page.url(),view}));throw problem;
    }
    assert.equal(await page.getByRole('button',{name:'Bỏ tệp Synthetic session.txt',exact:true}).count(),0,'Private attachments stay hidden during a failed session check');
   };
   const retry=async()=>{failure=0;await error.getByRole('button',{name:'Thử lại',exact:true}).click();};
   await select();await box.fill('Synthetic retained draft with files');await attach();await send().click();await error.getByText('Synthetic ambiguous save',{exact:false}).waitFor();assert.equal(posts.length,1);
   await failSession();holdRead=true;const capturedRead=new Promise(resolve=>{readCaptured=resolve;});await retry();await capturedRead;
   assert.equal(await box.inputValue(),'','Same identity does not reveal a draft before a fresh transcript authorizes the conversation');assert.equal(await page.getByRole('button',{name:'Bỏ tệp Synthetic session.txt',exact:true}).count(),0);releaseRead();
   await page.waitForFunction(selector=>document.querySelector(selector)?.value==='Synthetic retained draft with files',staff?'.operator-composer textarea':'.chat-compose textarea');await page.getByRole('button',{name:'Bỏ tệp Synthetic session.txt',exact:true}).waitFor();assert.equal(posts.length,1,'Recovery never automatically retries a send');
   mode='ok';await send().click();await page.waitForFunction(selector=>document.querySelector(selector)?.value==='',staff?'.operator-composer textarea':'.chat-compose textarea');assert.equal(posts.length,2);assert.equal(posts[0].key,posts[1].key,'Manual retry retains the ambiguous idempotency key');assert.equal(saved.length,1);
   await box.fill('Synthetic pending acknowledgement');mode='hold';const capturedSend=new Promise(resolve=>{sendCaptured=resolve;});await send().click();await capturedSend;await failSession();releaseSend();
   await page.waitForTimeout(50);await retry();await page.waitForFunction(selector=>{const input=document.querySelector(selector);return input&&!input.disabled;},staff?'.operator-composer textarea':'.chat-compose textarea');assert.equal(await box.inputValue(),'','A late valid save receipt cannot resurrect a sent draft');assert.equal(posts.length,3);
   for(const change of staff?[{...initial,jurisdictions:['VN']},{...initial,id:owner.id+1}]:[{...initial,id:owner.id+1}]){
    await box.fill('Synthetic old identity private draft');await attach();await failSession();user=change;await retry();await select();assert.equal(await box.inputValue(),'');assert.equal(await page.getByRole('button',{name:'Bỏ tệp Synthetic session.txt',exact:true}).count(),0);
    user={...initial};await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await select();assert.equal(await box.inputValue(),'','Returning to the former identity cannot resurrect its retired draft');
   }
   for(const status of [401,403]){await box.fill('Synthetic definitively revoked draft');await attach();await failSession(status);await retry();await select();assert.equal(await box.inputValue(),'');assert.equal(await page.getByRole('button',{name:'Bỏ tệp Synthetic session.txt',exact:true}).count(),0);}
   console.log((staff?'Specialist':'Customer')+' session recovery browser checks passed: hidden same-owner draft/files, original retry key, late ACK, changed identity/scope and definitive denial');
  }finally{
   releaseRead?.();releaseSend?.();await page.unroute(matches,handler);await page.unroute('**/service/inbox?*',inbox);await page.unroute('**/service/assistant/questions',questions);await page.unroute('**/service/me',session);await page.goto(origin+'/tai-khoan');
   await page.evaluate(({key,value})=>{if(value===null)sessionStorage.removeItem(key);else sessionStorage.setItem(key,value);},{key:draftKey,value:previous});
  }
 }
}

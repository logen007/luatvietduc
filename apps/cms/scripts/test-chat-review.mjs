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

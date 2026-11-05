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
 const inbox=route=>route.fulfill({json:{rows:[...threads.values()].map(thread=>({...thread,updated_at:'2026-11-05T00:00:00Z'})),counts:{all:2,active:2,queue:0},total:2,totalPages:1,page:1}});
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

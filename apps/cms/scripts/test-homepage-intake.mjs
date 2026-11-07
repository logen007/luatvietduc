import assert from 'node:assert/strict';
// Local browser transport fixtures only; no customer records or provider calls.
export async function testHomepageIntake(browser,base){
 for(const mode of ['enter','button','retry','topic']){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  try{
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
   let creates=0,sends=0,initializationFailed=false,messages=[];
   const id='11111111-2222-4333-8444-555555555555',body='tôi muốn hỏi về thế chấp tài sản';
   const conversation={id,title:body,state:'queued',version:1,aiEnabled:true};
   await context.route('**/service/me',route=>route.fulfill({json:{user:null,connections:{}}}));
   await context.route('**/service/settings',route=>route.fulfill({json:{maxMessageLength:2000}}));
   await context.route('**/service/conversations',async route=>{if(route.request().method()==='POST'){
    creates++;
    if(mode==='enter'||mode==='button'){
     const entry=route.request().frame().page();
     await entry.waitForFunction(()=>document.querySelector('.lvd-chat')?.getAttribute('data-entry-ready')==='false');
     assert.equal(await entry.locator('.lvd-chat.is-empty').count(),0,'Homepage intake never flashes the empty welcome layout while creating its conversation');
    }
    return route.fulfill({json:{id}});
   }if(initializationFailed)return route.fulfill({status:503,json:{error:'Synthetic history unavailable'}});return route.fulfill({json:creates?[conversation]:[]});});
   await context.route(new RegExp('/service/conversations/'+id+'(?:[/?]|$)'),route=>{
    if(route.request().url().includes('/messages')&&route.request().method()==='POST'){
     sends++;const data=route.request().postDataJSON();assert.equal(data.body,body);assert.ok(data.key);
     messages=[{id:'1',role:'user',body,internal:false,created_at:new Date().toISOString(),client_key:data.key}];
     return route.fulfill({json:{id:'1',role:'user'}});
    }
    return route.fulfill({json:{conversation,messages}});
   });
   const page=await context.newPage();page.setDefaultTimeout(12000);
   if(mode==='topic'){
    await page.goto(base+'/hoi-dap?question='+encodeURIComponent(body));
    await page.locator('.chat-compose textarea:not(:disabled)').waitFor();
    assert.equal(await page.locator('.chat-compose textarea').inputValue(),body);assert.equal(sends,0);assert.equal(creates,0);
   }else{
    await page.goto(base);await page.evaluate(()=>{window.__homepageDocument='intake-navigation';});await page.locator('#home-question').fill(body);
    await page.locator('link[rel="preload"][href^="/customer-chat.css?v="]').waitFor({state:'attached'});
    assert.equal(creates,0,'Warming the workspace never creates a conversation');assert.equal(sends,0,'Warming never sends the draft');
    if(mode==='retry')initializationFailed=true;
    if(mode==='button')await page.locator('.pm-ask button[type=submit]').click();else await page.locator('#home-question').press('Enter');
    await page.waitForURL('**/hoi-dap');
    assert.equal(await page.evaluate(()=>window.__homepageDocument),'intake-navigation','Homepage submission reuses the document instead of reloading the page');
    if(mode==='retry'){await page.getByRole('button',{name:'Thử lại',exact:true}).waitFor();assert.equal(sends,0);initializationFailed=false;await page.getByRole('button',{name:'Thử lại',exact:true}).click();}
    await page.locator('.chat-message.user').filter({hasText:body}).waitFor();
    await page.locator('.lvd-chat[data-entry-ready="true"]').waitFor();
    assert.equal(await page.locator('.lvd-chat.is-empty').count(),0,'The composer keeps its conversation layout after automatic submission');
    assert.equal(sends,1,'Homepage submission sends exactly once, without a second click');assert.equal(creates,1);
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('lvd-question-submit')),null);
   }
  }finally{await context.close();}
 }
 console.log('Homepage Enter/button/recovery submit once without a welcome-layout flash; topic links remain editable drafts');
}

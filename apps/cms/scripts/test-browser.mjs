// Integration checks of the actual built CMS, never a production target.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {setTimeout as pause} from 'node:timers/promises';
if(process.argv.includes('--help')){console.log('CMS browser regression checks: localhost:3047 and lvd_test only. Starts/stops its own built server; uses synthetic users and intercepted connection/knowledge requests.');process.exit(0);}
const db=new URL(process.env.DATABASE_URL||'');
if(!['localhost','127.0.0.1'].includes(db.hostname)||db.pathname!=='/lvd_test')throw new Error('Isolated browser database only');
const base='http://127.0.0.1:3047';process.env.APP_URL=base;process.env.LVD_WORKERS_DISABLED='1';
const {getPayload}=await import('payload'),{default:config}=await import('../src/payload.config.ts'),{pool}=await import('../src/modules/shared/db.ts');
const {chromium}=await import('playwright'),payload=await getPayload({config});
let server,browser;const suffix=crypto.randomUUID(),password=crypto.randomUUID(),ids=[];
await mkdir('test-results/cms-browser',{recursive:true});
try{
 const owner=await payload.create({collection:'users',overrideAccess:true,context:{bootstrapOwner:true},data:{name:'Browser test admin',email:`browser-${suffix}@example.invalid`,password,role:'owner'}});ids.push(owner.id);
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3047'],{stdio:['ignore','ignore','pipe'],env:process.env});
 let serverLog='';server.stderr.on('data',data=>{serverLog=(serverLog+data).slice(-3000);});
 let ready=false;for(let attempt=0;attempt<80;attempt++){
  if(server.exitCode!==null)throw new Error('Test server exited: '+serverLog);
  try{if((await fetch(base+'/health/ready')).ok){ready=true;break;}}catch{}
  await pause(250);
 }
 assert.ok(ready,'Built CMS server did not become ready');browser=await chromium.launch({headless:true,...(process.env.LVD_TEST_BROWSER_EXECUTABLE?{executablePath:process.env.LVD_TEST_BROWSER_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 // Only this local server may receive test traffic. No Google, mail, Drive or R2.
 await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 const page=await context.newPage();page.setDefaultTimeout(12000);
 page.on('pageerror',error=>console.error('CMS browser page error:',error.message));
 const fits=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Page overflows horizontally');
 const visible=async selector=>{await page.locator(selector).waitFor({state:'visible'});};
 const homeResponse=await page.goto(base);await visible('#pm-title');await fits();
 assert.equal(homeResponse.headers()['x-content-type-options'],'nosniff');
 assert.equal(homeResponse.headers()['x-frame-options'],'SAMEORIGIN');
 assert.match(homeResponse.headers()['content-security-policy'],/frame-ancestors 'self'/);
 // Missing OAuth code returns locally; no provider request or real identity.
 const failedLogin=await context.request.get(base+'/auth/google/callback',{maxRedirects:0});
 assert.equal(failedLogin.status(),307);assert.match(failedLogin.headers()['cache-control'],/no-store/);assert.equal(failedLogin.headers()['referrer-policy'],'no-referrer');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{
  const fixture=document.createElement('div');fixture.id='ascii-coverage-fixture';fixture.style.cssText='position:fixed;left:16px;top:200px;width:350px;display:grid;grid-template-columns:repeat(6,1fr);gap:2px;font:8px/10px sans-serif;pointer-events:none';
  fixture.innerHTML=Array.from({length:60},(_,i)=>'<span>Label '+i+'</span>').join('')+'<button><svg width="4" height="4" aria-hidden="true"></svg>Icon label</button><table><tbody><tr><td>Table label</td></tr></tbody></table><input placeholder="Empty field" style="width:48px"><select style="width:48px"><option>Selected label</option></select>';document.body.append(fixture);
  window.__asciiSeen=false;window.__asciiHidden=true;window.__asciiCoverage=0;window.__asciiFields=0;
  const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node instanceof HTMLElement&&node.hasAttribute('data-lvd-ascii')){window.__asciiSeen=true;window.__asciiHidden=window.__asciiHidden&&node.getAttribute('aria-hidden')==='true';window.__asciiCoverage=Array.from(CSS.highlights.get('lvd-ascii')||[]).filter(range=>fixture.contains(range.startContainer)).length;window.__asciiFields=fixture.querySelectorAll('[data-lvd-ascii-field]').length;}});observer.observe(document.body,{childList:true});window.__stopAsciiObservation=()=>observer.disconnect();
 });
 const language=page.getByRole('button',{name:'Chuyển sang tiếng Đức'}).first();
 const box=await language.boundingBox();assert.ok(box&&box.width>=44&&box.height>=44,'Language hit target');
 await language.click();await page.waitForFunction(()=>window.__asciiSeen);assert.equal(await page.evaluate(()=>window.__asciiHidden),true);await page.waitForFunction(()=>!document.querySelector('[data-lvd-ascii]'));
 assert.ok(await page.evaluate(()=>window.__asciiCoverage>=62),'All 60 labels plus mixed icon/table text must animate');assert.equal(await page.evaluate(()=>window.__asciiFields),2,'Placeholder and native select label must animate');await page.locator('#ascii-coverage-fixture').evaluate(element=>element.remove());
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{window.__asciiSeen=false;});
 await page.getByRole('button',{name:'Zu Vietnamesisch wechseln'}).first().click();await page.getByRole('button',{name:'Chuyển sang tiếng Đức'}).first().waitFor();
 assert.equal(await page.evaluate(()=>window.__asciiSeen),false);await page.getByRole('button',{name:'Chuyển sang tiếng Đức'}).first().click();await page.evaluate(()=>window.__stopAsciiObservation());await page.emulateMedia({reducedMotion:'no-preference'});
 await page.getByRole('button',{name:'Zu Vietnamesisch wechseln'}).first().waitFor();
 await page.screenshot({path:'test-results/cms-browser/home-mobile-de.png'});
 await page.goto(base+'/thu-vien');await page.getByRole('heading',{name:'Bibliothek',level:1,exact:true}).waitFor();await fits();
 await page.getByRole('button',{name:'Zu Vietnamesisch wechseln'}).first().click();
 // Session is deliberately delayed to verify the loading state, not a fake guest.
 let releaseSession;const heldSession=new Promise(resolve=>{releaseSession=resolve;});
 await page.route('**/service/me',async route=>{await heldSession;await route.continue();});
 await page.goto(base+'/tro-chuyen');await page.getByText('Đang mở cuộc trò chuyện…',{exact:true}).waitFor();assert.equal(await page.locator('textarea').isDisabled(),true);
 releaseSession();await page.locator('textarea').waitFor();
 await page.waitForFunction(()=>!document.querySelector('textarea')?.disabled);await fits();
 assert.equal(await page.getByRole('button',{name:'Choose Files',exact:true}).count(),0,'Hidden file input must not duplicate the accessible attachment action');
 await page.screenshot({path:'test-results/cms-browser/chat-mobile.png'});
 const logged=await context.request.post(base+'/api/users/login',{data:{email:owner.email,password}});assert.equal(logged.status(),200);
 const accountResponse=await page.goto(base+'/tai-khoan');await page.getByText('Browser test admin',{exact:false}).first().waitFor();
 assert.match(accountResponse.headers()['cache-control'],/no-store/);assert.equal(accountResponse.headers()['referrer-policy'],'no-referrer');
 const nav=page.locator('.live-menu-dialog');await page.getByRole('button',{name:'Mở menu',exact:true}).click();await nav.waitFor({state:'visible'});
 assert.equal(await nav.getByRole('link',{name:'Đăng nhập',exact:true}).count(),0);await page.getByRole('button',{name:'Đóng menu',exact:true}).click();
 await page.setViewportSize({width:1280,height:900});
 await page.goto(base+'/tin-tuc');assert.ok((await page.locator('#news-query').boundingBox()).width>240,'Desktop news search must remain usable beside its filters');
 // Test recoverable connection errors independently of real credentials.
 let connectionAttempt=0;
 const connection={provider:'google',values:{clientId:'synthetic.apps.googleusercontent.com'},stored:{clientSecret:false},version:1,enabled:false,checkState:'untested',checkedAt:null};
 await page.route('**/service/integrations',route=>route.fulfill({status:++connectionAttempt===1?503:200,json:connectionAttempt===1?{error:'Synthetic network error'}:{connections:[connection]}}));
 await page.goto(base+'/admin/settings/connections');await page.getByRole('button',{name:'Thử lại',exact:true}).waitFor();
 assert.equal(await page.getByRole('link',{name:'Đăng nhập quản trị',exact:true}).count(),0);await page.getByRole('button',{name:'Thử lại',exact:true}).click();await page.getByRole('heading',{name:'Đăng nhập Google',exact:true}).waitFor();
 await page.getByLabel('Client ID',{exact:true}).fill('unsaved synthetic edit');
 // Cancel a navigation and ensure both the route and edited value survive.
 if(await page.getByRole('button',{name:'Mở Menu',exact:true}).count())await page.getByRole('button',{name:'Mở Menu',exact:true}).click();
 page.once('dialog',dialog=>dialog.dismiss());
 await page.locator('.lvd-admin-navigation').getByRole('link',{name:'Bài viết',exact:true}).click();
 assert.equal(new URL(page.url()).pathname,'/admin/settings/connections');assert.equal(await page.getByLabel('Client ID',{exact:true}).inputValue(),'unsaved synthetic edit');
 page.once('dialog',dialog=>dialog.accept());await page.reload();await page.getByLabel('Client ID',{exact:true}).waitFor();
 // Losing the owner role removes unsaved secrets immediately; an old result
 // must not leave a credentials form mounted for the next identity.
 await page.getByLabel('Client Secret',{exact:true}).fill('synthetic-unsaved-secret');
 await page.route('**/service/me',route=>route.fulfill({json:{user:{id:owner.id,role:'member',name:'Synthetic member'},connections:{}}}));
 await page.evaluate(()=>document.dispatchEvent(new Event('lvd:sessionchange')));
 await page.getByText('Chỉ quản trị viên được quản lý kết nối.',{exact:false}).waitFor();
 assert.equal(await page.getByLabel('Client Secret',{exact:true}).count(),0);
 await page.unroute('**/service/me');await page.evaluate(()=>document.dispatchEvent(new Event('lvd:sessionchange')));
 await page.getByLabel('Client Secret',{exact:true}).waitFor();assert.equal(await page.getByLabel('Client Secret',{exact:true}).inputValue(),'');
 let failSourceList=false;
 const sources=[{id:901,title:'Synthetic source A',body:'Synthetic body A',_status:'draft',approved:false,reviewDueAt:'2030-01-01T00:00:00Z'},{id:902,title:'Synthetic source B',body:'Synthetic body B',_status:'draft',approved:false,reviewDueAt:'2030-01-01T00:00:00Z'}];
 await page.route('**/service/knowledge-articles?*',route=>{const id=new URL(route.request().url()).searchParams.get('id');if(!id&&failSourceList){return route.fulfill({status:503,json:{error:'Synthetic list unavailable'}});}return route.fulfill({json:id?sources.find(source=>source.id===Number(id)):{articles:sources,total:2,totalPages:1,indexWorker:{online:true,state:'ready'}}});});
 await page.route('**/service/knowledge-gaps',route=>route.fulfill({json:{conversations:[]}}));
 await page.goto(base+'/admin/knowledge');await page.getByRole('button',{name:/Synthetic source A/}).click();
 await page.getByLabel('Nội dung bài viết',{exact:true}).fill('Unsaved source content');page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:/Synthetic source B/}).click();assert.equal(await page.getByLabel('Nội dung bài viết',{exact:true}).inputValue(),'Unsaved source content');
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:/Synthetic source B/}).click();await page.waitForFunction(()=>document.querySelector('#knowledge-title')?.value==='Synthetic source B');
 // A saved draft remains successful even if the follow-up list request fails.
 await page.route('**/service/knowledge-articles',async route=>{assert.equal(route.request().method(),'POST');const data=route.request().postDataJSON(),index=sources.findIndex(source=>source.id===data.id);assert.ok(index>=0);sources[index]={...sources[index],...data,updatedAt:new Date().toISOString(),_status:'draft',approved:false};failSourceList=true;await route.fulfill({json:sources[index]});});
 await page.getByLabel('Nội dung bài viết',{exact:true}).fill('Synthetic saved draft');
 await page.getByRole('button',{name:'Lưu nháp / thu hồi',exact:true}).click();
 await page.getByText('Đã lưu bản nháp và ngừng dùng bài cho AI.',{exact:true}).waitFor();
 await page.locator('.lvd-knowledge-list').getByText('Synthetic list unavailable',{exact:false}).waitFor();
 assert.equal(await page.locator('.lvd-knowledge-editor .live-error').count(),0);
 failSourceList=false;await page.locator('.lvd-knowledge-list').getByRole('button',{name:'Thử lại',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('.lvd-knowledge-list [role="alert"]'));
 await page.setViewportSize({width:390,height:844});await fits();await page.screenshot({path:'test-results/cms-browser/knowledge-mobile.png'});
 // Native CMS pages, not the old prototype, at desktop and phone widths.
 for(const viewport of [{width:390,height:844},{width:1280,height:900}]){
  await page.setViewportSize(viewport);
  if(viewport.width===390){
   await page.goto(base+'/admin');
   if(await page.getByRole('button',{name:'Mở Menu',exact:true}).count())await page.getByRole('button',{name:'Mở Menu',exact:true}).click();
   await page.waitForFunction(()=>{const box=document.querySelector('.nav.nav--nav-open')?.getBoundingClientRect();return box&&box.left>=0&&box.width<=innerWidth-40;});
   await page.screenshot({path:'test-results/cms-browser/admin-drawer-mobile.png'});
   await page.locator('.nav.nav--nav-open').getByRole('button',{name:'Đóng Menu',exact:true}).click();
  }
  for(const path of ['/admin','/admin/collections/articles','/admin/collections/media','/admin/inbox','/admin/settings','/admin/account']){console.log('CMS page check:',viewport.width,path);await page.goto(base+path);await visible('.template-default');await fits();}
 }
 // A transition acknowledged by the server survives a failed follow-up read.
 const threadId=crypto.randomUUID();
 let thread={id:threadId,title:'Synthetic conversation',state:'human',version:1,assignedTo:owner.id,customer:{name:'Synthetic customer',email:'customer@example.invalid'},aiEnabled:false},failTranscript=false;
 await page.route('**/service/inbox?*',route=>route.fulfill({json:{rows:[],counts:{},total:0,totalPages:1,page:1}}));
 await page.route(new RegExp('/service/conversations/'+threadId+'(?:[/?]|$)'),async route=>{
  if(route.request().method()==='POST'){
   const data=route.request().postDataJSON();assert.equal(data.action,'close');assert.equal(data.version,1);
   thread={...thread,state:'closed',version:2};failTranscript=true;
   return route.fulfill({json:{state:thread.state,version:thread.version}});
  }
  return route.fulfill(failTranscript?{status:503,json:{error:'Synthetic transcript unavailable'}}:{json:{conversation:thread,messages:[]}});
 });
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/admin/inbox?conversation='+threadId);
 await page.getByRole('heading',{name:'Synthetic customer',exact:true}).waitFor();
 await page.getByRole('button',{name:'✓ Hoàn tất',exact:true}).click();
 await page.locator('.operator-error').waitFor();assert.match(await page.locator('.operator-error').innerText(),/Synthetic transcript unavailable/);
 await page.locator('.operator-conversation-header').getByText('Đã hoàn tất',{exact:false}).waitFor();
 assert.equal(await page.getByRole('button',{name:/Gửi phản hồi/}).isDisabled(),true);
 failTranscript=false;await page.locator('.operator-error').getByRole('button',{name:'Thử lại',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('.operator-error'));
 await page.locator('.operator-conversation-header').getByText('Đã hoàn tất',{exact:false}).waitFor();
 // Drafts follow the selected customer conversation and survive explicit account
 // navigation. All endpoints below are synthetic and cannot call a provider.
 const draftA=crypto.randomUUID(),draftB=crypto.randomUUID();
 const draftRows=[{id:draftA,title:'Draft conversation A',state:'human',version:1,aiEnabled:false},{id:draftB,title:'Draft conversation B',state:'human',version:1,aiEnabled:false}];
 await page.route('**/service/conversations',route=>route.fulfill({json:draftRows}));
 for(const item of draftRows)await page.route(new RegExp('/service/conversations/'+item.id+'(?:[?]|$)'),route=>route.fulfill({json:{conversation:item,messages:[]}}));
 await page.goto(base+'/tro-chuyen?conversation='+draftA);const question=page.getByRole('textbox',{name:'Câu hỏi của bạn',exact:true});
 await question.waitFor();await page.waitForFunction(()=>!document.querySelector('textarea')?.disabled);
 await page.getByRole('heading',{name:'Đang trao đổi với chuyên viên',exact:true}).waitFor();assert.equal(await page.locator('.chat-provider-label').count(),0,'Human conversations must not claim to send questions to Gemini');
 await question.fill('Synthetic draft A');await page.locator('.chat-sidebar').getByRole('button',{name:/Draft conversation B/}).click();await question.fill('Synthetic draft B');
 await page.locator('.chat-sidebar').getByRole('button',{name:/Draft conversation A/}).click();assert.equal(await question.inputValue(),'Synthetic draft A');
 await page.locator('.chat-sidebar .chat-account').click();await page.waitForURL('**/tai-khoan?conversation='+draftA);
 await page.getByRole('link',{name:'Hội thoại của tôi',exact:false}).click();await page.waitForURL('**/tro-chuyen?conversation='+draftA);await page.waitForFunction(()=>document.querySelector('textarea')?.value==='Synthetic draft A');
 // Backup loading is not shown as empty history. An accepted job remains
 // accepted when its following status read fails, with duplicate clicks gated.
 let releaseBackups;const pendingBackups=new Promise(resolve=>{releaseBackups=resolve;});let backupWrites=0,backupReadsFail=false;
 await page.route('**/service/backups',async route=>{
  if(route.request().method()==='POST'){backupWrites++;backupReadsFail=true;return route.fulfill({status:202,json:{id:crypto.randomUUID(),message:'Synthetic backup accepted'}});}
  await pendingBackups;
  return route.fulfill(backupReadsFail?{status:503,json:{error:'Synthetic backup status unavailable'}}:{json:{authorized:true,drive:{enabled:true},runtime:{ready:true},jobs:[],snapshots:[]}});
 });
 await page.goto(base+'/admin/settings/backups');await page.getByText('Đang tải trạng thái sao lưu…',{exact:true}).waitFor();assert.equal(await page.getByText('Chưa có tác vụ.',{exact:true}).count(),0);
 releaseBackups();await page.getByText('Chưa có tác vụ.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Tạo bản sao lưu',exact:true}).evaluate(button=>{button.click();button.click();});
 await page.getByText('Synthetic backup accepted',{exact:true}).waitFor();await page.getByText('Synthetic backup status unavailable',{exact:false}).waitFor();
 assert.equal(backupWrites,1);assert.equal(await page.getByRole('button',{name:'Đã có tác vụ đang xử lý',exact:true}).isDisabled(),true);
 // A German keyword search with no approved content has a real empty state.
 await page.goto(base+'/phap-luat/duc?q=synthetic-no-results-'+suffix);await page.locator('.native-empty').waitFor();await fits();
 await page.goto(base+'/review-missing-'+suffix);await page.getByRole('heading',{name:'Không tìm thấy trang.',exact:true}).waitFor();await page.getByRole('link',{name:'Mở thư viện',exact:false}).waitFor();await fits();
 console.log('CMS browser checks passed: public VI/DE, mobile fit, session loading, signed-in menu, retry, unsaved changes and native admin pages.');
}catch(error){console.error('CMS browser check failed:',error);throw error;}finally{
 await browser?.close();
 if(server&&server.exitCode===null)await new Promise(resolve=>{const timeout=setTimeout(()=>server.kill('SIGKILL'),5000);server.once('exit',()=>{clearTimeout(timeout);resolve();});server.kill('SIGTERM');});
 for(const id of ids)await payload.delete({collection:'users',id,overrideAccess:true});
 await payload.destroy();await pool.end();
}
// Payload keeps a reconnect sentinel socket after destroy(). All assertions and
// cleanup have completed here; failures throw before reaching this CLI exit.
await new Promise(resolve=>process.stdout.write('',resolve));
process.exit(0);

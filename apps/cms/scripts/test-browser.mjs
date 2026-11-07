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
const {seal}=await import('../src/modules/integrations/crypto.ts');
const {chromium}=await import('playwright'),payload=await getPayload({config});
let server,browser,serverLog='',mediaStorageFixture=false;const suffix=crypto.randomUUID(),password=crypto.randomUUID(),ids=[],translationArticleIds=[],mediaFixtureIds=[];
await mkdir('test-results/cms-browser',{recursive:true});
try{
 const owner=await payload.create({collection:'users',overrideAccess:true,context:{bootstrapOwner:true},data:{name:'Browser test admin',email:`browser-${suffix}@example.invalid`,password,role:'owner'}});ids.push(owner.id);
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3047'],{stdio:['ignore','pipe','pipe'],env:process.env});
 const captureServer=data=>{serverLog=(serverLog+data).slice(-8000);};server.stdout.on('data',captureServer);server.stderr.on('data',captureServer);
 let ready=false;for(let attempt=0;attempt<80;attempt++){
  if(server.exitCode!==null)throw new Error('Test server exited: '+serverLog);
  try{if((await fetch(base+'/health/ready')).ok){ready=true;break;}}catch{}
  await pause(250);
 }
 assert.ok(ready,'Built CMS server did not become ready');browser=await chromium.launch({headless:true,...(process.env.LVD_TEST_BROWSER_EXECUTABLE?{executablePath:process.env.LVD_TEST_BROWSER_EXECUTABLE}:{})});
 await (await import('./test-loading-stability.mjs')).testLoadingStability(browser,base,payload,pool,owner);
 await (await import('./test-homepage-intake.mjs')).testHomepageIntake(browser,base);
 await (await import('./test-client-navigation.mjs')).testClientNavigation(browser,base);
 await (await import('./test-home-services.mjs')).testHomeServices(browser,base);
 await (await import('./test-chat-login-retry.mjs')).testChatLoginRetry(browser,base,payload,pool,owner);
 const context=await browser.newContext({viewport:{width:390,height:844}});
 // Only this local server may receive test traffic. No Google, mail, Drive or R2.
 await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 const page=await context.newPage();page.setDefaultTimeout(12000);
 page.on('pageerror',error=>console.error('CMS browser page error:',error.message));
 const fits=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Page overflows horizontally');
 const menuGeometry=async()=>{
  const toggle=page.locator('.template-default__nav-toggler');await toggle.waitFor({state:'visible'});
  const geometry=await toggle.evaluate(button=>{const frame=button.getBoundingClientRect(),icon=button.querySelector('.hamburger svg').getBoundingClientRect(),surface=getComputedStyle(button.querySelector('.hamburger'));return {width:frame.width,height:frame.height,dx:Math.abs(icon.x+icon.width/2-frame.x-frame.width/2),dy:Math.abs(icon.y+icon.height/2-frame.y-frame.height/2),shadow:surface.boxShadow};});
  assert.equal(geometry.width,44);assert.equal(geometry.height,44);assert.ok(geometry.dx<=1&&geometry.dy<=1,'Menu icon remains centered inside its only button frame');assert.equal(geometry.shadow,'none','No second frame around the icon');
 };
 const visible=async selector=>{await page.locator(selector).waitFor({state:'visible'});};
 const legacyChat=await context.request.get(base+'/tro-chuyen?conversation=synthetic&q=x%20y',{maxRedirects:0});assert.equal(legacyChat.status(),307);assert.equal(new URL(legacyChat.headers().location,base).pathname,'/hoi-dap');assert.equal(new URL(legacyChat.headers().location,base).searchParams.get('conversation'),'synthetic');assert.equal(new URL(legacyChat.headers().location,base).searchParams.get('q'),'x y');
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
  fixture.innerHTML=Array.from({length:60},(_,i)=>'<span>Label '+i+'</span>').join('')+'<button><svg width="4" height="4" aria-hidden="true"></svg>Icon label</button><table><tbody><tr><td>Table label</td></tr></tbody></table><input placeholder="Empty field" style="width:48px"><select style="width:48px"><option value="stable">Selected label</option></select>';document.body.append(fixture);
  window.__asciiSeen=false;window.__asciiHidden=true;window.__asciiCoverage=0;window.__asciiFields=0;window.__asciiUnchanged=true;
  const labels=Array.from(fixture.querySelectorAll('span')),unchanged=new Map(labels.slice(30).map(element=>[element,element.textContent]));
  const localize=event=>{const de=event.detail.lang==='de';labels.slice(0,30).forEach((element,i)=>{element.firstChild.data=(de?'Bezeichnung ':'Label ')+i;});fixture.querySelector('button').lastChild.data=de?'Symboltext':'Icon label';fixture.querySelector('td').firstChild.data=de?'Tabellentext':'Table label';fixture.querySelector('input').placeholder=de?'Leeres Feld':'Empty field';fixture.querySelector('option').firstChild.data=de?'Ausgewähltes Label':'Selected label';};document.addEventListener('lvd:languagechange',localize);
  const observer=new MutationObserver(()=>{const changed=fixture.querySelectorAll('[data-lvd-ascii-text]').length;if(changed){window.__asciiSeen=true;window.__asciiHidden=window.__asciiHidden&&!document.querySelector('[data-lvd-ascii]');window.__asciiCoverage=Math.max(window.__asciiCoverage,changed);window.__asciiFields=Math.max(window.__asciiFields,fixture.querySelectorAll('[data-lvd-ascii-field]').length);}window.__asciiUnchanged=window.__asciiUnchanged&&Array.from(unchanged).every(([element,text])=>element.textContent===text&&!element.hasAttribute('data-lvd-ascii-text'));});observer.observe(fixture,{characterData:true,subtree:true,attributes:true});window.__stopAsciiObservation=()=>{observer.disconnect();document.removeEventListener('lvd:languagechange',localize);};
 });
 const language=page.getByRole('button',{name:'Chuyển sang tiếng Đức'}).first();
 const box=await language.boundingBox();assert.ok(box&&box.width>=44&&box.height>=44,'Language hit target');
 await language.click();await page.waitForFunction(()=>window.__asciiSeen);assert.equal(await page.evaluate(()=>window.__asciiHidden),true);await page.waitForFunction(()=>!document.querySelector('[data-lvd-ascii-text]'));
 assert.equal(await page.evaluate(()=>window.__asciiCoverage),32,'Only the 30 translated labels plus changed icon/table text animate');assert.equal(await page.evaluate(()=>window.__asciiUnchanged),true,'Unchanged labels never animate');assert.equal(await page.evaluate(()=>window.__asciiFields),2,'Placeholder and native select label must animate');assert.equal(await page.locator('#ascii-coverage-fixture select').inputValue(),'stable','Native option value must survive scrambling');await page.evaluate(()=>window.__stopAsciiObservation());await page.locator('#ascii-coverage-fixture').evaluate(element=>element.remove());
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{window.__asciiSeen=false;});
 await page.getByRole('button',{name:'Zu Vietnamesisch wechseln'}).first().click();await page.getByRole('button',{name:'Chuyển sang tiếng Đức'}).first().waitFor();
 assert.equal(await page.evaluate(()=>window.__asciiSeen),false);await page.getByRole('button',{name:'Chuyển sang tiếng Đức'}).first().click();await page.evaluate(()=>window.__stopAsciiObservation());await page.emulateMedia({reducedMotion:'no-preference'});
 await page.getByRole('button',{name:'Zu Vietnamesisch wechseln'}).first().waitFor();
 await page.screenshot({path:'test-results/cms-browser/home-mobile-de.png'});
 await page.goto(base+'/thu-vien');await page.getByRole('heading',{name:'Vietnamesisches Recht',level:1,exact:true}).waitFor();await fits();
 assert.equal(await page.locator('.lvd-country-tabs [aria-current="page"]').getAttribute('href'),'/phap-luat/viet-nam','Library defaults to Vietnam');
 assert.equal(await page.locator('.catalog-page .breadcrumb').count(),0,'Country root does not repeat a home breadcrumb');
 await page.locator('.lvd-country-tabs a[href="/phap-luat/duc"]').click();await page.getByRole('heading',{name:'Deutsches Recht',level:1,exact:true}).waitFor();
 assert.equal(await page.locator('.lvd-country-tabs [aria-current="page"]').getAttribute('href'),'/phap-luat/duc');
 await page.getByRole('button',{name:'Zu Vietnamesisch wechseln'}).first().click();await page.getByRole('heading',{name:'Pháp luật Đức',level:1,exact:true}).waitFor();
 await page.goto(base+'/thu-vien');await page.getByRole('heading',{name:'Pháp luật Việt Nam',level:1,exact:true}).waitFor();
 // Session is deliberately delayed to verify the loading state, not a fake guest.
 let releaseSession;const heldSession=new Promise(resolve=>{releaseSession=resolve;});
 await page.route('**/service/me',async route=>{await heldSession;await route.continue();});
 await page.goto(base+'/hoi-dap');await page.getByText('Đang mở cuộc trò chuyện…',{exact:true}).waitFor();assert.equal(await page.locator('textarea').isDisabled(),true);
 releaseSession();await page.locator('textarea').waitFor();
 await page.waitForFunction(()=>!document.querySelector('textarea')?.disabled);await fits();
 assert.equal(await page.getByRole('button',{name:'Choose Files',exact:true}).count(),0,'Hidden file input must not duplicate the accessible attachment action');
 await page.screenshot({path:'test-results/cms-browser/chat-mobile.png'});
 await page.goto(base+'/tai-khoan');await page.getByRole('heading',{name:'Tạo tài khoản',exact:true}).waitFor();await page.getByLabel('Địa chỉ email',{exact:true}).waitFor();await fits();
 assert.equal(await page.locator('.live-auth-panel').evaluate(element=>getComputedStyle(element).backgroundColor),'rgb(11, 11, 11)');
 assert.equal(await page.locator('.live-staff-link,.live-auth-privacy').count(),0);
 await page.screenshot({path:'test-results/cms-browser/account-registration-mobile.png'});
 await page.getByLabel('Địa chỉ email',{exact:true}).fill(owner.email);await page.locator('.live-auth-switch a').click();
 await page.getByRole('heading',{name:'Đăng nhập',exact:true}).waitFor();assert.equal(await page.getByLabel('Địa chỉ email',{exact:true}).inputValue(),owner.email);
 await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
 await page.getByText('Browser test admin',{exact:false}).first().waitFor();
 const accountResponse=await page.goto(base+'/tai-khoan');await page.getByText('Browser test admin',{exact:false}).first().waitFor();
 assert.match(accountResponse.headers()['cache-control'],/no-store/);assert.equal(accountResponse.headers()['referrer-policy'],'no-referrer');
 const nav=page.locator('.live-menu-dialog');await page.getByRole('button',{name:'Mở menu',exact:true}).click();await nav.waitFor({state:'visible'});
 assert.equal(await nav.getByRole('link',{name:'Đăng nhập',exact:true}).count(),0);await page.getByRole('button',{name:'Đóng menu',exact:true}).click();
 const {testPublicReview,testHeroLoading,testContactAndSettings}=await import('./test-public-review.mjs');await testPublicReview({page,context,base,owner});await testHeroLoading({context,base});await testContactAndSettings({page,base});
 const {testAccountRecovery}=await import('./test-account-recovery.mjs');await testAccountRecovery({page,base});
 const {testChatReview,testCustomerHistoryRecovery,testChatLoginDraftHandoff,testChatSessionRecovery,testChatRevokedLateAck}=await import('./test-chat-review.mjs');await testCustomerHistoryRecovery({page,base});await testChatLoginDraftHandoff({page,base});await testChatReview({page,base,owner});await testChatSessionRecovery({page,base,owner});await testChatRevokedLateAck({page,base,owner});
 // Drive callback failures remain bound to the original owner, nonce and
 // configuration revision. These synthetic failures never contact Google.
 const callback=code=>context.request.get(base+'/service/backups/google/callback?'+code,{maxRedirects:0,headers:{'sec-fetch-site':'cross-site'}});
 const missingDriveFlow=await callback('code=synthetic-private-code&state=synthetic');assert.equal(missingDriveFlow.status(),307);assert.match(missingDriveFlow.headers().location,/drive=failed&reason=state$/);assert.ok(!missingDriveFlow.headers().location.includes('synthetic-private-code'));assert.match(missingDriveFlow.headers()['cache-control'],/no-store/);
 const {SignJWT}=await import('jose');
 const setDriveFlow=async fields=>{const flow=await new SignJWT({state:'synthetic-nonce',verifier:'synthetic-verifier',userId:owner.id,version:99999,...fields}).setProtectedHeader({alg:'HS256'}).setExpirationTime('10m').sign(new TextEncoder().encode(process.env.PAYLOAD_SECRET));await context.addCookies([{name:'lvd-drive-oauth',value:flow,domain:'127.0.0.1',path:'/service/backups/google',httpOnly:true,sameSite:'Lax'}]);};
 await setDriveFlow({});assert.match((await callback('code=synthetic&state=wrong-nonce')).headers().location,/reason=state$/);
 await setDriveFlow({userId:owner.id+99999});assert.match((await callback('code=synthetic&state=synthetic-nonce')).headers().location,/reason=state$/);
 await setDriveFlow({});assert.match((await callback('code=synthetic&state=synthetic-nonce')).headers().location,/reason=changed$/);
 const originalOwnerCookie=(await context.cookies()).find(cookie=>cookie.name==='payload-token');assert.ok(originalOwnerCookie);await context.addCookies([{...originalOwnerCookie,value:'synthetic-invalid-jwt'}]);await setDriveFlow({});assert.match((await callback('code=synthetic&state=synthetic-nonce')).headers().location,/reason=session$/,'Valid OAuth state cannot authorize an invalid account credential');await context.addCookies([originalOwnerCookie]);
 assert.equal((await context.cookies()).filter(cookie=>cookie.name==='lvd-drive-oauth').length,0,'Failed callbacks clear their own flow cookie');
 await page.setViewportSize({width:1280,height:900});
 await page.goto(base+'/tin-tuc');assert.ok((await page.locator('#news-query').boundingBox()).width>240,'Desktop news search must remain usable beside its filters');
 // Test recoverable connection errors independently of real credentials.
 let connectionAttempt=0,failConnectionRefresh=false;const connectionWrites=[];
 const connection={provider:'google',values:{clientId:'synthetic.apps.googleusercontent.com'},stored:{clientSecret:false},version:1,enabled:false,checkState:'untested',checkedAt:null};
 await page.route('**/service/integrations',route=>{
  if(route.request().method()==='POST'){
   const body=route.request().postDataJSON();connectionWrites.push(body);assert.equal(body.action,'save','Recovery never tests or enables a provider automatically');
   if(body.version!==connection.version)return route.fulfill({status:409,json:{error:'Synthetic connection conflict'}});
   connection.version++;connection.values={clientId:body.values.clientId};connection.stored={clientSecret:true};
   if(connectionWrites.length===1)return route.abort('failed');
   return route.fulfill({json:{connection}});
  }
  if(failConnectionRefresh)return route.fulfill({status:503,json:{error:'Synthetic connection refresh unavailable'}});
  return route.fulfill({status:++connectionAttempt===1?503:200,json:connectionAttempt===1?{error:'Synthetic network error'}:{connections:[connection]}});
 });
 await page.goto(base+'/admin/settings/connections');await page.getByRole('button',{name:'Thử lại',exact:true}).waitFor();
 assert.equal(await page.getByRole('link',{name:'Đăng nhập quản trị',exact:true}).count(),0);await page.getByRole('button',{name:'Thử lại',exact:true}).click();await page.getByRole('heading',{name:'Đăng nhập Google',exact:true}).waitFor();
 await page.getByLabel('Client ID',{exact:true}).fill('committed.apps.googleusercontent.com');await page.getByLabel('Client Secret',{exact:true}).fill('synthetic-typed-secret');
 await page.getByRole('button',{name:'Lưu cấu hình',exact:true}).click();await page.getByRole('alert').filter({hasText:'Chưa xác nhận được kết quả.'}).waitFor();
 await page.getByRole('button',{name:'Lưu cấu hình',exact:true}).click();await page.getByRole('alert').filter({hasText:'Synthetic connection conflict'}).waitFor();assert.equal(await page.getByRole('button',{name:'Lưu cấu hình',exact:true}).isDisabled(),true);
 await page.getByLabel('Client ID',{exact:true}).fill('retained.apps.googleusercontent.com');failConnectionRefresh=true;await page.getByRole('button',{name:'Tải lại cấu hình',exact:true}).click();await page.getByRole('alert').filter({hasText:'Synthetic connection refresh unavailable'}).waitFor();assert.equal(await page.getByLabel('Client Secret',{exact:true}).inputValue(),'synthetic-typed-secret');
 failConnectionRefresh=false;await page.getByRole('button',{name:'Tải lại cấu hình',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã tải cấu hình mới.'}).waitFor();assert.equal(connectionWrites.length,2);assert.equal(await page.getByLabel('Client ID',{exact:true}).inputValue(),'retained.apps.googleusercontent.com');assert.equal(await page.getByLabel('Client Secret',{exact:true}).inputValue(),'synthetic-typed-secret');
 await page.getByRole('button',{name:'Lưu cấu hình',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã lưu. Kiểm tra rồi bật để sử dụng.'}).waitFor();assert.equal(connectionWrites[2].version,2);assert.equal(connectionWrites[2].values.clientSecret,'synthetic-typed-secret');assert.equal(await page.getByLabel('Client Secret',{exact:true}).inputValue(),'');
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
 const {testKnowledgeNative}=await import('./test-knowledge-native.mjs');await testKnowledgeNative({page,base,owner,payload,pool});
 // Native article language controls: preserve edits and show real pending state.
 const publishDraft=await payload.create({collection:'articles',user:owner,overrideAccess:false,data:{title:'Synthetic native publish '+suffix,body:'Synthetic publication check.',slug:'',language:'vi',jurisdiction:'BOTH',reviewState:'draft',_status:'draft'}});translationArticleIds.push(publishDraft.id);
 await page.goto(base+'/admin/collections/articles/'+publishDraft.id);
 const richEditor=page.getByRole('textbox',{name:'Nội dung bài viết',exact:true});await richEditor.waitFor();assert.equal(await page.locator('#field-body').inputValue(),'Synthetic publication check.','Opening a legacy article does not rewrite its body');
 await richEditor.fill('Synthetic formatted publication.');await richEditor.press('ControlOrMeta+A');await page.getByRole('button',{name:'Đậm',exact:true}).click();assert.equal(await richEditor.locator('strong').innerText(),'Synthetic formatted publication.');
 await page.getByRole('button',{name:'HTML',exact:true}).click();const richHTML=page.getByRole('textbox',{name:'Mã HTML nội dung bài viết',exact:true});
 await richHTML.fill('<h2>Article heading</h2><p><strong>Synthetic formatted publication.</strong></p><p>Mandatory complete condition stays visible.</p><table><tbody><tr><th><p>Column</p></th><td><p>Value</p></td></tr></tbody></table>');
 await page.getByRole('button',{name:'Trực quan',exact:true}).click();await richEditor.locator('table').waitFor();assert.equal(await richEditor.locator('h2').innerText(),'Article heading');
 await page.getByRole('checkbox',{name:'AI',exact:true}).check();
 const publishResult=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/articles/'+publishDraft.id&&response.request().method()==='PATCH');await page.getByRole('button',{name:'Xuất bản',exact:true}).click();assert.equal((await publishResult).status(),200,'Native Publish must not fail because its review selector still says Draft');
 const publishedDraft=await payload.findByID({collection:'articles',id:publishDraft.id,user:owner,overrideAccess:false});assert.equal(publishedDraft._status,'published');assert.equal(publishedDraft.reviewState,'approved');assert.equal(publishedDraft.aiAllowed,true);
 assert.match(publishedDraft.body,/<strong>Synthetic formatted publication.<\/strong>/);assert.match(publishedDraft.body,/<table>/);
 await page.reload();await richEditor.locator('table').waitFor();assert.equal(await richEditor.locator('strong').innerText(),'Synthetic formatted publication.');
 await page.goto(base+'/bai-viet/'+publishedDraft.slug);await page.locator('#noi-dung table').waitFor();assert.equal(await page.locator('#noi-dung strong').innerText(),'Synthetic formatted publication.');assert.equal(await page.locator('.live-toc').count(),0);await fits();
 // A blank table is structural content even before the specialist types into
 // its cells. Exercise the real toolbar, Payload field, persistence and history.
 const tableDraft=await payload.create({collection:'articles',user:owner,overrideAccess:false,data:{title:'Synthetic table persistence '+suffix,body:'Synthetic table starting content.',slug:'',language:'vi',jurisdiction:'BOTH',_status:'draft'}});translationArticleIds.push(tableDraft.id);
 await page.goto(base+'/admin/collections/articles/'+tableDraft.id);await richEditor.waitFor();
 // fill('') sends Delete before ProseMirror necessarily observes its DOM-only
 // selection. Select through the editor's real keyboard command instead.
 await richEditor.click();await richEditor.press('ControlOrMeta+A');
 await page.waitForFunction(()=>{const editor=document.querySelector('.lvd-article-editor [contenteditable]')?.editor;if(!editor)return false;const selection=editor.state.selection;return !selection.empty&&editor.state.doc.textBetween(selection.from,selection.to)===editor.state.doc.textContent;});
 await richEditor.press('Backspace');await page.waitForFunction(()=>document.querySelector('#field-body')?.value==='');
 await page.getByRole('button',{name:'Bảng',exact:true}).click();await page.getByRole('button',{name:'Chèn bảng 3 × 3',exact:true}).click();
 await richEditor.locator('table').waitFor();await page.waitForFunction(()=>document.querySelector('#field-body')?.value.includes('<table>'));
 assert.equal(await richEditor.locator('tr').count(),3);assert.equal((await richEditor.locator('table').textContent()).trim(),'','The table starts with empty cells');
 const emptyTableSave=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/articles/'+tableDraft.id&&response.request().method()==='PATCH');await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();assert.equal((await emptyTableSave).status(),200,'An empty table can be saved as a draft');
 await page.reload();await richEditor.locator('table').waitFor();assert.match(await page.locator('#field-body').inputValue(),/<table>/,'Reload retains the empty table in the canonical field');
 await richEditor.locator('tr').first().locator('th,td').first().click();await page.getByRole('button',{name:'Bảng',exact:true}).click();await page.getByRole('button',{name:'Xóa bảng',exact:true}).click();
 await richEditor.locator('table').waitFor({state:'detached'});await page.waitForFunction(()=>document.querySelector('#field-body')?.value==='');
 await page.getByRole('button',{name:'Hoàn tác',exact:true}).click();await richEditor.locator('table').waitFor();await page.waitForFunction(()=>document.querySelector('#field-body')?.value.includes('<table>'));
 await page.getByRole('button',{name:'Làm lại',exact:true}).click();await richEditor.locator('table').waitFor({state:'detached'});await page.waitForFunction(()=>document.querySelector('#field-body')?.value==='');
 await page.getByRole('button',{name:'Hoàn tác',exact:true}).click();await richEditor.locator('table').waitFor();await page.waitForFunction(()=>document.querySelector('#field-body')?.value.includes('<table>'));
 await richEditor.locator('tr').first().locator('th,td').first().click();await page.keyboard.type('Synthetic table cell for publication.');await page.waitForFunction(()=>document.querySelector('#field-body')?.value.includes('Synthetic table cell for publication.'));
 const tablePublish=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/articles/'+tableDraft.id&&response.request().method()==='PATCH');await page.getByRole('button',{name:'Xuất bản',exact:true}).click();const tablePublishResponse=await tablePublish;assert.equal(tablePublishResponse.status(),200,await tablePublishResponse.text());
 const tablePublished=await payload.findByID({collection:'articles',id:tableDraft.id,user:owner,overrideAccess:false});assert.equal(tablePublished._status,'published');assert.match(tablePublished.body,/<table>/);assert.match(tablePublished.body,/Synthetic table cell for publication\./);
 await page.goto(base+'/bai-viet/'+tablePublished.slug);await page.locator('#noi-dung table').getByText('Synthetic table cell for publication.',{exact:true}).waitFor();
 // Verify the actual ProseMirror selection, rather than trusting a DOM caret
 // left behind by a blurred link popover or platform-specific End shortcuts.
 await page.goto(base+'/admin/collections/articles/'+tableDraft.id);await richEditor.waitFor();await page.getByRole('button',{name:'HTML',exact:true}).click();
 await richHTML.fill('<p><a href="/thu-vien">Synthetic preserved article link</a></p><p></p>');await page.getByRole('button',{name:'Trực quan',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#field-body')?.value.includes('Synthetic preserved article link'));await richEditor.locator(':scope > p').last().click();
 const beforeTableSelection=await richEditor.evaluate(element=>{const state=element.editor.state,selection=state.selection;return {empty:selection.empty,parent:selection.$from.parent.type.name,text:selection.$from.parent.textContent,linked:selection.$from.marks().some(mark=>mark.type.name==='link')};});
 assert.deepEqual(beforeTableSelection,{empty:true,parent:'paragraph',text:'',linked:false},'Table insertion starts at a verified collapsed selection outside the link');
 await page.getByRole('button',{name:'Bảng',exact:true}).click();await page.getByRole('button',{name:'Chèn bảng 3 × 3',exact:true}).click();await richEditor.locator('table').waitFor();
 await page.waitForFunction(()=>{const body=document.querySelector('#field-body')?.value||'';return body.includes('<table>')&&body.includes('Synthetic preserved article link');});
 assert.equal(await richEditor.locator('a[href="/thu-vien"]').innerText(),'Synthetic preserved article link','Toolbar insertion preserves the preceding linked paragraph');
 console.log('Article structural-content checks passed: empty table save/reload, delete, undo/redo, typed-cell publication and linked-paragraph preservation');
 await (await import('./test-article-media-race.mjs')).testArticleMediaRace({page,base,pool,suffix,mediaFixtureIds});
 page.once('dialog',dialog=>dialog.accept());
 const {articleTranslation}=await import('../src/modules/content/translations.ts');
 const translationSource=await payload.create({collection:'articles',user:owner,overrideAccess:false,data:{title:'Synthetic bilingual '+suffix,body:'Synthetic source body.',slug:'',language:'vi',jurisdiction:'BOTH'}});translationArticleIds.push(translationSource.id);
 const translationCopy=await articleTranslation(payload,owner,{id:translationSource.id,language:'de',updatedAt:translationSource.updatedAt,mode:'copy'});translationArticleIds.push(translationCopy.id);
 let releaseTranslation;const translationPending=new Promise(resolve=>{releaseTranslation=resolve;});let translationsRequested=0,notifyTranslation;const translationStarted=new Promise(resolve=>{notifyTranslation=resolve;});
 let malformedTranslationList=true,malformedTranslationText=true;
 await page.route('**/service/articles/translations?*',route=>route.fulfill({json:malformedTranslationList?{articles:{},translationReady:true}:{articles:[{id:translationSource.id,language:'vi'},{id:translationCopy.id,language:'de'}],translationReady:true}}));
 await page.route('**/service/articles/translations',async route=>{translationsRequested++;if(malformedTranslationText)return route.fulfill({json:{translation:{title:'Must not replace draft title'}}});notifyTranslation();await translationPending;await route.fulfill({json:{translation:{title:'Synthetischer Titel',body:'Vollständiger synthetischer Text.'}}});});
 await page.goto(base+'/admin/collections/articles/'+translationSource.id);await page.locator('.lvd-article-language-actions').waitFor();
 const languageListError=page.locator('.lvd-translation-error').filter({hasText:'Chưa đọc được bản ngôn ngữ.'});await languageListError.waitFor();assert.equal(await page.locator('#field-title').inputValue(),translationSource.title);malformedTranslationList=false;await languageListError.getByRole('button',{name:'Thử lại',exact:true}).click();await languageListError.waitFor({state:'hidden'});
 assert.equal(await page.getByText('Thông tin bổ sung',{exact:true}).count(),0);
 await page.evaluate(()=>{window.__articleLanguageDocument='retained';});
 await page.getByRole('button',{name:'Chuyển bài viết sang Tiếng Đức',exact:true}).click();assert.equal(translationsRequested,0,'Switching to an existing language never invokes AI');await page.waitForURL('**/admin/collections/articles/'+translationCopy.id);assert.equal(await page.evaluate(()=>window.__articleLanguageDocument),'retained','Manual language switching keeps the native admin document');
 // A stalled source read must time out, retain the editor and unlock actions.
 const sourceRead=url=>url.origin===base&&url.pathname==='/api/articles/'+translationSource.id&&url.searchParams.get('draft')==='true'&&url.searchParams.get('depth')==='0';let heldSourceRead;
 const holdSourceRead=route=>{heldSourceRead=route;};await page.route(sourceRead,holdSourceRead);
 const titleBeforeTimeout=await page.locator('#field-title').inputValue(),bodyBeforeTimeout=await page.locator('#field-body').inputValue();
 await page.getByRole('button',{name:'Dịch bằng AI',exact:true}).click();await page.getByRole('progressbar',{name:'Đang dịch bài viết'}).waitFor();
 await page.locator('.lvd-translation-error').filter({hasText:'Chưa hoàn tất bản dịch. Thử lại sau.'}).waitFor({timeout:20000});
 assert.ok(heldSourceRead,'The source read was actually intercepted');assert.equal(translationsRequested,0,'A timed-out source read never starts provider generation');assert.equal(await page.getByRole('button',{name:'Dịch bằng AI',exact:true}).isEnabled(),true);assert.equal(await page.locator('#field-title').inputValue(),titleBeforeTimeout);assert.equal(await page.locator('#field-body').inputValue(),bodyBeforeTimeout);
 await heldSourceRead.abort().catch(()=>{});await page.unroute(sourceRead,holdSourceRead);
 await page.getByRole('button',{name:'Dịch bằng AI',exact:true}).click();await page.locator('.lvd-translation-error').filter({hasText:'Chưa đọc được bản ngôn ngữ.'}).waitFor();assert.equal(await page.locator('#field-title').inputValue(),titleBeforeTimeout,'Partial translation leaves title intact');assert.equal(await page.locator('#field-body').inputValue(),bodyBeforeTimeout,'Partial translation leaves content intact');malformedTranslationText=false;
 await page.getByRole('button',{name:'Dịch bằng AI',exact:true}).click();await page.getByRole('progressbar',{name:'Đang dịch bài viết'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Dịch bằng AI',exact:true}).isDisabled(),true);await Promise.race([translationStarted,pause(12000).then(()=>{throw new Error('Translation request did not start');})]);assert.equal(translationsRequested,2);
 await page.setViewportSize({width:390,height:844});await fits();await page.screenshot({path:'test-results/cms-browser/article-translation-loading-mobile.png'});
 releaseTranslation();await page.getByText('Đã dịch. Lưu bản nháp sau khi đọc lại.',{exact:true}).waitFor();
 assert.equal(await page.locator('#field-title').inputValue(),'Synthetischer Titel');assert.equal(await page.locator('#field-body').inputValue(),'Vollständiger synthetischer Text.');
 await page.getByRole('button',{name:'Chuyển bài viết sang Tiếng Việt',exact:true}).click();await page.waitForURL('**/admin/collections/articles/'+translationSource.id);assert.equal(translationsRequested,2,'Manual switching never starts another translation');
 const savedTranslation=await payload.findByID({collection:'articles',id:translationCopy.id,draft:true});assert.equal(savedTranslation.title,'Synthetischer Titel','Switching preserves edited text as a draft');await page.goto(base+'/admin');
 await page.unroute('**/service/articles/translations');await page.unroute('**/service/articles/translations?*');
 await page.goto(base+'/admin/collections/articles/create');
 await page.getByPlaceholder('Tiêu đề bài viết',{exact:true}).fill('Bài thử permalink');
 await page.getByRole('textbox',{name:'Nội dung bài viết',exact:true}).fill('Nội dung nhập tay');
 await page.waitForFunction(()=>document.querySelector('.lvd-post-permalink__url')?.textContent.includes('bai-thu-permalink'));
 await page.getByRole('button',{name:'Chuyển bài viết sang Tiếng Đức',exact:true}).click();assert.equal(await page.locator('#field-title').inputValue(),'Bài thử permalink','Switching the language does not translate or discard unsaved text');
 await page.locator('.lvd-post-permalink').getByRole('button',{name:'Sửa',exact:true}).click();await page.getByRole('textbox',{name:'Permalink',exact:true}).fill('duong-dan-rieng');await page.getByRole('button',{name:'Xong',exact:true}).click();
 await page.getByPlaceholder('Tiêu đề bài viết',{exact:true}).fill('Tiêu đề mới');assert.ok((await page.locator('.lvd-post-permalink__url').innerText()).endsWith('duong-dan-rieng'));
 page.once('dialog',dialog=>dialog.accept());await page.goto(base+'/admin');
 await pool.query("INSERT INTO lvd_integrations(provider,encrypted_values,enabled,check_state) VALUES('r2',$1,true,'passed')",[seal('r2',{endpoint:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',bucket:'synthetic-media',accessKeyId:'synthetic-only',secretAccessKey:'synthetic-only'})]);mediaStorageFixture=true;
 // Native storage cleanup/ACLs run separately with an in-process S3 mock. The
 // browser deletes only exact synthetic rows and never calls server-side S3.
 for(const index of [1,2,3]){const mime=index===3?'application/pdf':'image/svg+xml',filename='synthetic-media-'+suffix+'-'+index+(index===3?'.pdf':'.svg');const row=(await pool.query("INSERT INTO media(alt,filename,mime_type,filesize,visibility) VALUES($1,$2,$3,120,'private') RETURNING id",['Synthetic media '+index,filename,mime])).rows[0];mediaFixtureIds.push(row.id);}
 let mediaDeleteRequests=0,failMediaDeleteId=null,mediaDeleteFailed=false,deleteNotFoundId=null;
 const mediaDeleteURL=url=>url.origin===base&&/^\/api\/media\/\d+$/.test(url.pathname);
 const mediaDeleteHandler=async route=>{if(route.request().method()!=='DELETE')return route.fallback();const id=Number(new URL(route.request().url()).pathname.split('/').pop());assert.ok(mediaFixtureIds.includes(id),'Browser deletes only its own synthetic media');mediaDeleteRequests++;if(id===failMediaDeleteId&&!mediaDeleteFailed){mediaDeleteFailed=true;return route.fulfill({status:503,json:{errors:[{message:'Synthetic delete failure'}]}});}await pool.query('DELETE FROM media WHERE id=$1',[id]);return id===deleteNotFoundId?route.fulfill({status:404,json:{errors:[{message:'Synthetic already deleted'}]}}):route.fulfill({json:{id}});};
 await page.route(mediaDeleteURL,mediaDeleteHandler);
 const confirmMediaDelete=(trigger,accept)=>Promise.all([page.waitForEvent('dialog').then(async prompt=>{assert.equal(prompt.type(),'confirm');await (accept?prompt.accept():prompt.dismiss());}),trigger()]);
 await page.route('**/api/media/file/synthetic-media-*',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="white"/></svg>'}));
 await page.route('**/api/media/file/browser-upload-*',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>'}));
 const bundledMedia=(await pool.query("SELECT id FROM media WHERE filename='lvd-bundled-assets__berlin-tv-tower.svg' AND legacy_parent_id IS NULL LIMIT 1")).rows[0];assert.ok(bundledMedia);
 await page.goto(base+'/admin/collections/media?where[id][equals]='+bundledMedia.id);await page.locator('.lvd-media-grid').waitFor();
 await page.getByRole('button',{name:'Chọn nhiều',exact:true}).click();
 assert.equal(await page.locator('.lvd-media-grid input[type=checkbox]:disabled').count(),0,'Packaged entries remain selectable');assert.equal(await page.locator('.lvd-media-readonly').count(),0,'The grid has no interface-asset badge');
 const beforeProtectedSelection=mediaDeleteRequests;await page.getByRole('checkbox',{name:'Chọn berlin-tv-tower.svg',exact:true}).check();
 await page.locator('.lvd-media-status').getByText('1 đã chọn',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Xóa tệp đã chọn',exact:true}).isEnabled(),true);
 await page.getByRole('button',{name:'Xem dạng danh sách',exact:true}).click();await page.locator('.lvd-media-table').waitFor();assert.equal(await page.locator('.lvd-media-table tbody input:checked').count(),1,'Selection survives changing view');
 await page.getByRole('checkbox',{name:'Chọn cả trang',exact:true}).uncheck();await page.getByRole('checkbox',{name:'Chọn cả trang',exact:true}).check();await page.getByRole('combobox',{name:'Thao tác hàng loạt',exact:true}).selectOption('delete');assert.equal(await page.getByRole('button',{name:'Áp dụng',exact:true}).isEnabled(),true,'Admin may remove packaged entries');await confirmMediaDelete(()=>page.getByRole('button',{name:'Áp dụng',exact:true}).click(),false);assert.equal(mediaDeleteRequests,beforeProtectedSelection,'Cancel retains every existing file');
 await page.getByRole('button',{name:'Xem dạng lưới',exact:true}).click();assert.equal(await page.locator('.lvd-media-grid input:checked').count(),1);
 await page.getByRole('button',{name:'Hủy chọn',exact:true}).click();
 await page.locator('.lvd-media-grid a[href="/admin/collections/media/'+bundledMedia.id+'"]').click();await page.getByRole('dialog',{name:'Chi tiết tệp',exact:true}).waitFor();
 await page.getByRole('button',{name:'Gỡ khỏi thư viện',exact:true}).click();await page.locator('.lvd-media-delete-confirm').waitFor();assert.equal(await page.locator('.lvd-media-protected').count(),0);await page.locator('.lvd-media-delete-confirm').getByRole('button',{name:'Hủy',exact:true}).click();assert.equal(mediaDeleteRequests,beforeProtectedSelection,'Opening/canceling entry removal never deletes data');
 const detailTitle=page.getByRole('textbox',{name:'Tiêu đề tệp',exact:true});await detailTitle.waitFor();const oldMediaTitle=await detailTitle.inputValue();await fits();await page.screenshot({path:'test-results/cms-browser/media-details-mobile.png'});await page.setViewportSize({width:1280,height:900});await fits();await page.screenshot({path:'test-results/cms-browser/media-details-desktop.png'});await page.setViewportSize({width:390,height:844});
 const malformedMetadataURL=base+'/api/media/'+bundledMedia.id;
 const malformedMetadata=route=>route.request().method()==='PATCH'?route.fulfill({json:{}}):route.fallback();await page.route(malformedMetadataURL,malformedMetadata);
 await detailTitle.fill('Browser metadata '+suffix);const uncertainMetadata=page.getByRole('dialog',{name:'Chi tiết tệp',exact:true}).getByRole('alert').filter({hasText:'Chưa xác nhận được tệp đã lưu.'});await uncertainMetadata.waitFor();
 assert.equal(await detailTitle.inputValue(),'Browser metadata '+suffix,'A malformed save acknowledgement preserves the metadata draft');assert.notEqual(await page.locator('.lvd-media-detail-state').textContent(),'Đã lưu');
 await page.unroute(malformedMetadataURL,malformedMetadata);await uncertainMetadata.getByRole('button',{name:'Thử lại',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.lvd-media-detail-state')?.textContent==='Đã lưu');
 assert.ok((await page.getByRole('textbox',{name:'URL tệp',exact:true}).inputValue()).startsWith(base+'/assets/'),'Original interface URL is preserved');
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__mediaCopied=text;}}}));await page.getByRole('button',{name:'Sao chép URL',exact:true}).click();assert.ok((await page.evaluate(()=>window.__mediaCopied)).startsWith(base+'/assets/'));
 await detailTitle.fill(oldMediaTitle);await page.waitForFunction(()=>document.querySelector('.lvd-media-detail-state')?.textContent==='Đã lưu');
 await page.getByRole('button',{name:'Đóng chi tiết tệp',exact:true}).click();await page.locator('.lvd-media-details').waitFor({state:'detached'});
 await page.goto(base+'/admin/collections/media');await page.locator('.lvd-media-grid').waitFor();
 await page.getByRole('button',{name:'Tải tệp',exact:true}).click();await page.locator('.lvd-media-upload').waitFor();
 const malformedUpload=route=>route.request().method()==='POST'?route.fulfill({status:201,json:{}}):route.fallback();await page.route('**/api/media',malformedUpload);
 await page.locator('.lvd-media-upload input[type=file]').setInputFiles({name:'malformed-ack-'+suffix+'.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')});await page.locator('.lvd-media-upload').getByRole('alert').filter({hasText:'Chưa xác nhận được tệp đã lưu.'}).waitFor();assert.equal(await page.locator('.lvd-media-upload').getByText('Đã tải',{exact:true}).count(),0,'Malformed upload acknowledgement cannot claim a saved file');await page.unroute('**/api/media',malformedUpload);
 let releaseMediaUpload;const mediaUploadPending=new Promise(resolve=>{releaseMediaUpload=resolve;});
 let syntheticUploadId;
 await page.route('**/api/media',async route=>{if(route.request().method()!=='POST')return route.continue();await mediaUploadPending;const filename='browser-upload-'+suffix+'.svg';syntheticUploadId=(await pool.query("INSERT INTO media(title,alt,filename,mime_type,filesize,visibility,uploaded_by_id) VALUES($1,'',$2,'image/svg+xml',100,'private',$3) RETURNING id",['Browser uploaded SVG',filename,owner.id])).rows[0].id;mediaFixtureIds.push(syntheticUploadId);return route.fulfill({status:201,json:{doc:{id:syntheticUploadId,filename}}});});
 await page.locator('.lvd-media-upload input[type=file]').setInputFiles({name:'browser-upload-'+suffix+'.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10H0Z"/></svg>')});
 assert.equal(await page.getByRole('button',{name:'Tải tệp',exact:true}).isDisabled(),true,'An active upload cannot be unmounted by its toolbar toggle');
 await page.getByRole('searchbox',{name:'Tìm tệp',exact:true}).fill('pending-hidden-'+suffix);releaseMediaUpload();
 await page.locator('.lvd-media-upload').getByText('Đã tải',{exact:true}).waitFor();assert.ok(syntheticUploadId);await page.unroute('**/api/media');
 await page.waitForTimeout(450);assert.equal(await page.getByRole('searchbox',{name:'Tìm tệp',exact:true}).inputValue(),'','Upload completion cancels a pending search');assert.ok(!new URL(page.url()).searchParams.get('search'),'A stale search cannot hide the new upload');
 await page.getByRole('button',{name:'Tải tệp',exact:true}).click();
 await page.locator('.lvd-media-grid a[href="/admin/collections/media/'+syntheticUploadId+'"]').click();await page.getByRole('button',{name:'Xóa vĩnh viễn',exact:true}).waitFor();
 failMediaDeleteId=syntheticUploadId;mediaDeleteFailed=false;
 await page.getByRole('button',{name:'Xóa vĩnh viễn',exact:true}).click();await page.getByRole('button',{name:'Xóa tệp',exact:true}).click();
 const deletionError=page.getByRole('dialog',{name:'Chi tiết tệp',exact:true}).getByRole('alert').filter({hasText:'Chưa xóa được tệp.'});await deletionError.waitFor();
 // A successful metadata save cannot replace the failed action's retry intent.
 await page.getByRole('textbox',{name:'Tiêu đề tệp',exact:true}).fill('Browser retry metadata '+suffix);await page.waitForFunction(()=>document.querySelector('.lvd-media-detail-state')?.textContent==='Đã lưu');
 await deletionError.waitFor();await page.locator('.lvd-media-delete-confirm').getByRole('button',{name:'Hủy',exact:true}).click();
 const beforeDetailRetry=mediaDeleteRequests;await deletionError.getByRole('button',{name:'Thử lại',exact:true}).click();await page.locator('.lvd-media-delete-confirm').waitFor();assert.equal(mediaDeleteRequests,beforeDetailRetry,'Retry after cancellation first reopens confirmation');
 deleteNotFoundId=syntheticUploadId;await deletionError.getByRole('button',{name:'Thử lại',exact:true}).click();await page.locator('.lvd-media-details').waitFor({state:'detached'});assert.equal(mediaDeleteRequests,beforeDetailRetry+1,'Failed deletion retries DELETE, not metadata save');assert.equal((await pool.query('SELECT id FROM media WHERE id=$1',[syntheticUploadId])).rowCount,0);mediaFixtureIds.splice(mediaFixtureIds.indexOf(syntheticUploadId),1);deleteNotFoundId=null;
 await page.reload();await page.locator('.lvd-media-grid').waitFor();
 const {testMediaReview}=await import('./test-media-review.mjs');await testMediaReview({page,base,pool,owner,ids:mediaFixtureIds,suffix});

 assert.equal(await page.getByText('Quản lý ảnh, logo, video và tài liệu. Kết nối R2 trong Cài đặt để tải thêm tệp.',{exact:true}).count(),0);
 await page.getByRole('searchbox',{name:'Tìm tệp',exact:true}).fill(suffix);
 await page.waitForFunction(()=>document.querySelectorAll('.lvd-media-grid .lvd-media-tile').length===3);
 await page.getByRole('button',{name:'Xem dạng danh sách',exact:true}).click();await page.locator('.lvd-media-table').waitFor();
 assert.equal(await page.locator('.lvd-media-table tbody input[type=checkbox]').count(),3,'List checkboxes are persistent without a selection mode');assert.equal(await page.getByRole('button',{name:'Chọn nhiều',exact:true}).count(),0);
 const mediaPageSelection=page.getByRole('checkbox',{name:'Chọn cả trang',exact:true}),mediaBulkAction=page.getByRole('combobox',{name:'Thao tác hàng loạt',exact:true});
 assert.deepEqual(await mediaBulkAction.locator('option').evaluateAll(options=>options.map(option=>option.value)),['','delete'],'The compact dropdown contains only the supported bulk action');
 await mediaPageSelection.check();assert.equal(await page.locator('.lvd-media-table tbody input:checked').count(),3);await mediaBulkAction.selectOption('delete');
 const beforeCancelledDelete=mediaDeleteRequests;await confirmMediaDelete(()=>page.getByRole('button',{name:'Áp dụng',exact:true}).click(),false);
 assert.equal(mediaDeleteRequests,beforeCancelledDelete,'Cancelling a list delete sends no request');assert.equal((await pool.query('SELECT count(*)::int AS n FROM media WHERE id=ANY($1::integer[])',[mediaFixtureIds])).rows[0].n,3);
 assert.equal(await page.locator('.edit-many__main,.lvd-media-bulk-actions').count(),0,'Generic EditMany controls are absent');
 await page.getByRole('button',{name:'Xem dạng lưới',exact:true}).click();await page.locator('.lvd-media-grid').waitFor();assert.equal(await page.locator('.lvd-media-grid input:checked').count(),3,'Selections survive a view change');
 await page.getByRole('button',{name:'Hủy chọn',exact:true}).click();assert.equal(await page.locator('.lvd-media-grid input[type=checkbox]').count(),0);assert.equal(mediaDeleteRequests,beforeCancelledDelete,'Leaving grid selection mode does not delete files');

 const mediaBulkIds=[];for(const index of [1,2]){const row=(await pool.query("INSERT INTO media(alt,filename,mime_type,filesize,visibility,uploaded_by_id) VALUES($1,$2,'image/svg+xml',120,'private',$3) RETURNING id",['Synthetic bulk '+suffix,'synthetic-media-bulk-'+suffix+'-'+index+'.svg',owner.id])).rows[0];mediaBulkIds.push(row.id);mediaFixtureIds.push(row.id);}
 failMediaDeleteId=mediaBulkIds[1];mediaDeleteFailed=false;await page.getByRole('searchbox',{name:'Tìm tệp',exact:true}).fill('bulk-'+suffix);await page.waitForFunction(()=>document.querySelectorAll('.lvd-media-grid .lvd-media-tile').length===2);
 await page.getByRole('button',{name:'Chọn nhiều',exact:true}).click();for(const box of await page.locator('.lvd-media-grid input[type=checkbox]').all())await box.check();
 await confirmMediaDelete(()=>page.getByRole('button',{name:'Xóa tệp đã chọn',exact:true}).click(),true);await page.locator('.lvd-media-delete-error').waitFor();
 await page.waitForFunction(()=>document.querySelectorAll('.lvd-media-grid .lvd-media-tile').length===1&&document.querySelectorAll('.lvd-media-grid input:checked').length===1);
 assert.deepEqual((await pool.query('SELECT id FROM media WHERE id=ANY($1::integer[])',[mediaBulkIds])).rows.map(row=>row.id),[failMediaDeleteId],'A partial delete preserves only the failed fixture');
 await confirmMediaDelete(()=>page.locator('.lvd-media-delete-error').getByRole('button',{name:'Thử lại',exact:true}).click(),true);await page.waitForFunction(()=>document.querySelectorAll('.lvd-media-grid .lvd-media-tile').length===0);
 assert.equal((await pool.query('SELECT count(*)::int AS n FROM media WHERE id=ANY($1::integer[])',[mediaBulkIds])).rows[0].n,0,'Retry deletes the remaining selected fixture');for(const id of mediaBulkIds)mediaFixtureIds.splice(mediaFixtureIds.indexOf(id),1);
 await page.goto(base+'/admin/collections/media');await page.locator('.lvd-media-grid').waitFor();await page.getByRole('searchbox',{name:'Tìm tệp',exact:true}).fill(suffix);await page.waitForFunction(()=>document.querySelectorAll('.lvd-media-grid .lvd-media-tile').length===3);
 await page.getByRole('button',{name:'Xem dạng danh sách',exact:true}).click();await page.locator('.lvd-media-table').waitFor();await page.getByRole('combobox',{name:'Loại tệp',exact:true}).selectOption('svg');
 await page.waitForFunction(()=>document.querySelectorAll('.lvd-media-table tbody tr').length===2);
 await page.setViewportSize({width:390,height:844});await fits();await page.screenshot({path:'test-results/cms-browser/media-list-mobile.png'});
 await page.getByRole('button',{name:'Xem dạng lưới',exact:true}).click();await page.locator('.lvd-media-grid').waitFor();await fits();await page.screenshot({path:'test-results/cms-browser/media-grid-mobile.png'});
 await page.reload();await page.locator('.lvd-media-grid').waitFor();assert.equal(await page.getByRole('button',{name:'Xem dạng lưới',exact:true}).getAttribute('aria-pressed'),'true');
 await page.setViewportSize({width:1280,height:900});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await fits();console.log('Media viewport geometry:',await page.evaluate(()=>({templates:[...document.querySelectorAll('.template-default')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).length,headers:[...document.querySelectorAll('.collection-list--media h1')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>({text:e.textContent,top:e.getBoundingClientRect().top})),toggles:[...document.querySelectorAll('.template-default__nav-toggler')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>e.getBoundingClientRect().top)})));await page.screenshot({path:'test-results/cms-browser/media-grid-desktop.png'});
 await page.unroute(mediaDeleteURL,mediaDeleteHandler);
 const imageFixture=(await pool.query("INSERT INTO media(title,filename,mime_type,filesize,width,height,visibility,uploaded_by_id) VALUES('Synthetic image editor',$1,'image/png',100,240,160,'private',$2) RETURNING id,filename,updated_at AS \"updatedAt\",uploaded_by_id AS \"uploadedBy\"",['image-editor-'+crypto.randomUUID()+'.png',owner.id])).rows[0];mediaFixtureIds.push(imageFixture.id);
 imageFixture.updatedAt=new Date(imageFixture.updatedAt).toISOString();
 const {testMediaImageEditor}=await import('./test-media-image-editor.mjs');await testMediaImageEditor({page,base,image:imageFixture});
 // Native CMS pages, not the old prototype, at desktop and phone widths.
 for(const viewport of [{width:390,height:844},{width:1280,height:900}]){
  await page.setViewportSize(viewport);
  await page.goto(base+'/admin');await visible('.template-default--nav-hydrated');assert.equal(await page.locator('.app-header:visible').count(),0);
  if(viewport.width===390){
   if(await page.locator('.nav.nav--nav-open').count())await page.locator('.nav.nav--nav-open').getByRole('button',{name:'Đóng Menu',exact:true}).click();
   await menuGeometry();
   if(await page.getByRole('button',{name:'Mở Menu',exact:true}).count())await page.getByRole('button',{name:'Mở Menu',exact:true}).click();
   await page.waitForFunction(()=>{const box=document.querySelector('.nav.nav--nav-open')?.getBoundingClientRect();return box&&box.left>=0&&box.width<=innerWidth-40;});
   await page.screenshot({path:'test-results/cms-browser/admin-drawer-mobile.png'});
   await page.locator('.nav.nav--nav-open').getByRole('button',{name:'Đóng Menu',exact:true}).click();
   await menuGeometry();
  }else{
   await menuGeometry();await page.locator('.template-default__nav-toggler').click();await menuGeometry();await page.locator('.template-default__nav-toggler').click();await menuGeometry();
  }
  for(const path of ['/admin','/admin/collections/articles','/admin/collections/media','/admin/collections/quick-replies','/admin/inbox','/admin/settings','/admin/account']){console.log('CMS page check:',viewport.width,path);await page.goto(base+path);await visible('.template-default');await fits();}
 }
 const templatesResponse=await page.evaluate(async()=>{const r=await fetch('/api/quick-replies?limit=1',{cache:'no-store'});return {status:r.status,data:await r.json()};});
 assert.equal(templatesResponse.status,200);assert.ok(templatesResponse.data.docs.length);
 assert.equal((await fetch(base+'/api/quick-replies?limit=1')).status,403,'Anonymous API access must be denied');
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
 // Templates are loaded from the private collection and only edit the draft.
 assert.equal(await page.locator('.operator-compose-tabs').count(),0);
 assert.equal(await page.getByText('KHÔNG GIAN LÀM VIỆC',{exact:true}).count(),0);
 const replyBox=page.getByRole('textbox',{name:'Nội dung trả lời khách',exact:true});
 await replyBox.fill('Bản nháp');
 let replyRequests=0,templateFailure=true;
 await page.route('**/api/quick-replies?*',route=>route.fulfill(templateFailure?{status:503,json:{errors:[]}}:{json:{docs:[{id:1,title:'Mẫu kiểm tra',body:'Nội dung mẫu.'},{id:2,title:'Mẫu dài',body:'x'.repeat(10000)}],totalPages:1,page:1}}));
 page.on('request',request=>{if(request.url().includes('/service/conversations/'+threadId)&&request.method()==='POST')replyRequests++;});
 await page.getByRole('button',{name:'Chèn câu mẫu',exact:true}).click();
 await page.locator('.operator-quick-panel').getByRole('alert').waitFor();
 templateFailure=false;await page.locator('.operator-quick-panel').getByRole('button',{name:'Thử lại',exact:true}).click();
 const snippetSearch=page.getByRole('searchbox',{name:'Tìm câu trả lời nhanh',exact:true});await snippetSearch.fill('Mẫu');await snippetSearch.press('Enter');await page.waitForTimeout(100);assert.equal(replyRequests,0,'Searching quick replies must never send the existing draft');assert.equal(await replyBox.inputValue(),'Bản nháp');
 await page.locator('.operator-quick-list').getByRole('button',{name:'Mẫu kiểm tra Nội dung mẫu.'}).click();
 assert.equal(await replyBox.inputValue(),'Bản nháp\nNội dung mẫu.');assert.equal(replyRequests,0,'Inserting a template never sends it');
 await page.getByRole('button',{name:'Chèn câu mẫu',exact:true}).click();
 await page.locator('.operator-quick-list').getByRole('button',{name:/^Mẫu dài/}).click();
 await page.locator('.operator-template-error').waitFor();
 assert.equal(await replyBox.inputValue(),'Bản nháp\nNội dung mẫu.','Oversized template leaves the draft intact');
 await page.getByRole('button',{name:'Đóng câu trả lời nhanh',exact:true}).click();await fits();
 await page.unroute('**/api/quick-replies?*');
 await page.getByRole('button',{name:'✓ Hoàn tất',exact:true}).click();
 await page.locator('.operator-error').waitFor();assert.match(await page.locator('.operator-error').innerText(),/Synthetic transcript unavailable/);
 await page.locator('.operator-conversation-header').getByText('Đã hoàn tất',{exact:false}).waitFor();
 assert.equal(await page.getByRole('button',{name:/Gửi phản hồi/}).isDisabled(),true);
 failTranscript=false;await page.locator('.operator-error').getByRole('button',{name:'Thử lại',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('.operator-error'));
 await page.locator('.operator-conversation-header').getByText('Đã hoàn tất',{exact:false}).waitFor();
 // Drafts follow the selected customer conversation and survive explicit account
 // navigation. All endpoints below are synthetic and cannot call a provider.
 await page.setViewportSize({width:1280,height:900});
 const draftA=crypto.randomUUID(),draftB=crypto.randomUUID();
 const draftRows=[{id:draftA,title:'Draft conversation A',state:'human',version:1,aiEnabled:false},{id:draftB,title:'Draft conversation B',state:'human',version:1,aiEnabled:false}];
 await page.route('**/service/conversations',route=>route.fulfill({json:draftRows}));
 for(const item of draftRows)await page.route(new RegExp('/service/conversations/'+item.id+'(?:[?]|$)'),route=>route.fulfill({json:{conversation:item,messages:[]}}));
 await page.goto(base+'/hoi-dap?conversation='+draftA);const question=page.getByRole('textbox',{name:'Câu hỏi của bạn',exact:true});
 await question.waitFor();await page.waitForFunction(()=>!document.querySelector('textarea')?.disabled);
 await page.locator('.chat-log[aria-busy="false"]').waitFor();await page.locator('.chat-transcript').waitFor({state:'attached'});
 assert.equal(await page.locator('.chat-sidebar').getByRole('button',{name:/Draft conversation A/}).getAttribute('aria-current'),'page','The requested human conversation is selected');
 assert.equal(await page.locator('.chat-error').count(),0,'The human transcript loads without a connection error');assert.equal(await question.isEnabled(),true,'The human conversation composer is ready');
 assert.equal(await page.locator('.chat-provider-label').count(),0,'Human conversations must not claim to send questions to Gemini');
 await question.fill('Synthetic draft A');await page.locator('.chat-sidebar').getByRole('button',{name:/Draft conversation B/}).click();await question.fill('Synthetic draft B');
 await page.locator('.chat-sidebar').getByRole('button',{name:/Draft conversation A/}).click();assert.equal(await question.inputValue(),'Synthetic draft A');
 await page.locator('.chat-sidebar .chat-account').click();await page.waitForURL('**/tai-khoan?conversation='+draftA);
 await page.getByRole('link',{name:'Hội thoại của tôi',exact:false}).click();await page.waitForURL('**/hoi-dap?conversation='+draftA);await page.waitForFunction(()=>document.querySelector('textarea')?.value==='Synthetic draft A');
 // Backup loading is not shown as empty history. An accepted job remains
 // accepted when its following status read fails, with duplicate clicks gated.
 let releaseBackups;const pendingBackups=new Promise(resolve=>{releaseBackups=resolve;});let backupWrites=0,backupReadsFail=false,malformedBackupStatus=true,malformedBackupReceipt=true;let releaseBackupReconcile;const pendingBackupReconcile=new Promise(resolve=>{releaseBackupReconcile=resolve;});
 await page.route('**/service/backups',async route=>{
  if(route.request().method()==='POST'){backupWrites++;if(malformedBackupReceipt)return route.fulfill({status:202,json:{}});backupReadsFail=true;return route.fulfill({status:202,json:{id:crypto.randomUUID(),message:'Synthetic backup accepted'}});}
  if(malformedBackupStatus)return route.fulfill({json:{}});
  await pendingBackups;if(backupWrites===1&&malformedBackupReceipt)await pendingBackupReconcile;
  return route.fulfill(backupReadsFail?{status:503,json:{error:'Synthetic backup status unavailable'}}:{json:{authorized:true,drive:{enabled:true},runtime:{ready:true},jobs:[],snapshots:[]}});
 });
 await page.goto(base+'/admin/settings/backups?drive=failed&reason=api');await page.getByRole('alert').filter({hasText:'Google Drive API chưa được bật'}).waitFor();const malformedBackupError=page.getByRole('alert').filter({hasText:'Chưa tải được trạng thái sao lưu.'});await malformedBackupError.waitFor();assert.equal(await page.getByRole('button',{name:'Tạo bản sao lưu',exact:true}).isDisabled(),true);malformedBackupStatus=false;await malformedBackupError.getByRole('button',{name:'Thử lại',exact:true}).click();assert.equal(await malformedBackupError.isVisible(),true,'Retry retains the last load failure until a valid status arrives');assert.equal(await page.getByRole('button',{name:'Tạo bản sao lưu',exact:true}).isDisabled(),true);assert.equal(await page.getByText('Chưa có tác vụ.',{exact:true}).count(),0);
 releaseBackups();await page.getByText('Chưa có tác vụ.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Tạo bản sao lưu',exact:true}).click();await page.getByRole('alert').filter({hasText:'Chưa xác nhận tác vụ.'}).waitFor();assert.equal(await page.getByRole('button',{name:'Đang gửi yêu cầu…',exact:true}).isDisabled(),true,'Unknown POST outcome stays gated until reconciliation finishes');assert.equal(backupWrites,1);releaseBackupReconcile();await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='Tạo bản sao lưu')?.disabled);assert.equal(backupWrites,1,'Unknown receipt is never replayed');malformedBackupReceipt=false;
 await page.getByRole('button',{name:'Tạo bản sao lưu',exact:true}).evaluate(button=>{button.click();button.click();});
 await page.getByText('Synthetic backup accepted',{exact:true}).waitFor();await page.getByText('Synthetic backup status unavailable',{exact:false}).waitFor();
 assert.equal(backupWrites,2);assert.equal(await page.getByRole('button',{name:'Đã có tác vụ đang xử lý',exact:true}).isDisabled(),true);
 // A German keyword search with no approved content has a real empty state.
 await page.goto(base+'/phap-luat/duc?q=synthetic-no-results-'+suffix);await page.locator('.native-empty').waitFor();await fits();
 await page.goto(base+'/review-missing-'+suffix);await page.getByRole('heading',{name:'Không tìm thấy trang.',exact:true}).waitFor();await page.getByRole('link',{name:'Mở thư viện',exact:false}).waitFor();await fits();
 // Native admin logout must revoke the Google cookie as well as the password
 // cookie. Re-entering admin and replaying either old credential must be denied.
 await page.unroute('**/service/me');
 const {hash}=await import('../src/modules/shared/db.ts');
 const googleSession=crypto.randomUUID();await pool.query("INSERT INTO lvd_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",[await hash(googleSession),owner.id]);
 await context.addCookies([{name:'lvd-session',value:googleSession,url:base,httpOnly:true,sameSite:'Lax'}]);
 const oldCookies=(await context.cookies()).filter(cookie=>['lvd-session','payload-token'].includes(cookie.name));assert.equal(oldCookies.length,2);
 await context.addCookies([{name:'lvd-oauth',value:'synthetic-oauth-flow',domain:'127.0.0.1',path:'/auth/google',httpOnly:true,sameSite:'Lax'}]);
 let logoutAttempts=0;
 await page.route('**/service/logout',route=>++logoutAttempts===1?route.fulfill({status:503,json:{error:'Synthetic logout unavailable'}}):route.continue());
 await page.goto(base+'/admin');await page.locator('.lvd-admin-navigation').waitFor();
 if(!await page.locator('.nav').evaluate(nav=>nav.classList.contains('nav--nav-open')))await page.getByRole('button',{name:'Mở Menu',exact:true}).click();
 await page.locator('.nav__log-out').click();await page.getByRole('alert').filter({hasText:'Synthetic logout unavailable'}).waitFor();
 assert.equal(new URL(page.url()).pathname,'/admin/logout','Failed revocation must not report logout success or navigate to login');
 const stillSignedIn=await context.request.get(base+'/service/me');assert.equal((await stillSignedIn.json()).user?.id,owner.id);
 await page.getByRole('button',{name:'Thử lại',exact:true}).click();await page.waitForURL(base+'/admin/login');
 for(const path of ['/admin','/admin/settings','/admin/inbox','/admin/collections/users']){
  await page.goto(base+path);await page.waitForURL(url=>url.pathname==='/admin/login');assert.equal(await page.locator('.lvd-admin-navigation').count(),0);
 }
 assert.equal((await context.cookies()).filter(cookie=>['lvd-session','payload-token','lvd-oauth'].includes(cookie.name)).length,0);
 for(const cookie of oldCookies){
  const replay=await fetch(base+'/service/me',{headers:{cookie:cookie.name+'='+cookie.value}});assert.equal((await replay.json()).user,null,'Old credentials cannot restore a logged-out user');
  assert.equal((await fetch(base+'/api/users',{headers:{cookie:cookie.name+'='+cookie.value}})).status,403);
 }
 // The native CMS form sends multipart _payload; REST clients send JSON.
 // Both entry points share password admission without replacing native auth.
 await page.goto(base+'/admin/login');
 await page.locator('#field-email').fill(owner.email);await page.locator('#field-password').fill(password);
 const nativeLogin=page.waitForRequest(request=>new URL(request.url()).pathname==='/api/users/login'&&request.method()==='POST');
 const nativeLoginResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/users/login'&&response.request().method()==='POST');
 await page.locator('form').getByRole('button',{name:'Đăng nhập',exact:true}).click();
 assert.match((await nativeLogin).headers()['content-type'],/^multipart\/form-data;/);
 assert.equal((await nativeLoginResponse).status(),200,'Native CMS multipart login must succeed');
 await page.waitForURL(base+'/admin');await page.locator('.lvd-admin-navigation').waitFor();
 await (await import('./test-loading-stability.mjs')).testAdminLoadingStability(context,base);
 await (await import('./test-chat-qualification-browser.mjs')).testChatQualificationBrowser(context,base);
 await (await import('./test-role-preview-browser.mjs')).testRolePreviewBrowser(context,base,payload,pool,owner);
 await (await import('./test-article-import-browser.mjs')).testArticleImportBrowser(context,base,payload,owner);
 const nativeJSON=await context.request.post(base+'/api/users/login',{headers:{origin:base},data:{email:owner.email,password}});
 assert.equal(nativeJSON.status(),200,'Native REST JSON login remains available');
 const crossOriginLogin=await context.request.post(base+'/api/users/LoGiN',{headers:{origin:'https://cross-origin.example.invalid'},data:{email:owner.email,password}});
 assert.equal(crossOriginLogin.status(),403,'Mixed-case native login cannot bypass the same-origin admission wrapper');
 const mixedLogin=await context.request.post(base+'/api/users/LoGiN',{headers:{origin:base},data:{email:owner.email,password}});assert.equal(mixedLogin.status(),200);
 const mixedLogout=await context.request.post(base+'/api/users/LoGoUt',{headers:{origin:base},data:{}});assert.equal(mixedLogout.status(),200);
 assert.equal((await(await context.request.get(base+'/service/me')).json()).user,null,'Mixed-case native logout uses shared revocation');
 console.log('CMS browser checks passed: public VI/DE, mobile fit, session loading, signed-in menu, retry, unsaved changes and native admin pages.');
}catch(error){console.error('CMS browser check failed:',error,'Server diagnostics:',serverLog);throw error;}finally{
 await browser?.close();
 if(server&&server.exitCode===null)await new Promise(resolve=>{const timeout=setTimeout(()=>server.kill('SIGKILL'),5000);server.once('exit',()=>{clearTimeout(timeout);resolve();});server.kill('SIGTERM');});
 if(mediaStorageFixture)await pool.query("DELETE FROM lvd_integrations WHERE provider='r2'");
 if(mediaFixtureIds.length)await pool.query('DELETE FROM media WHERE id=ANY($1::int[])',[mediaFixtureIds]);
 for(const id of translationArticleIds.reverse())await payload.delete({collection:'articles',id,user:await payload.findByID({collection:'users',id:ids[0],overrideAccess:true}),overrideAccess:false});
 for(const id of ids)await payload.delete({collection:'users',id,overrideAccess:true});
 await payload.destroy();await pool.end();
}
// Payload keeps a reconnect sentinel socket after destroy(). All assertions and
// cleanup have completed here; failures throw before reaching this CLI exit.
await new Promise(resolve=>process.stdout.write('',resolve));
process.exit(0);

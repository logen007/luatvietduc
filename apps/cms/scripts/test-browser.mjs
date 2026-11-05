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
let server,browser,mediaStorageFixture=false;const suffix=crypto.randomUUID(),password=crypto.randomUUID(),ids=[],translationArticleIds=[],mediaFixtureIds=[];
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
 await page.goto(base+'/tai-khoan');await page.getByRole('heading',{name:'Create your account',exact:true}).waitFor();await page.getByLabel('Email address',{exact:true}).waitFor();await fits();
 assert.equal(await page.locator('.live-auth-panel').evaluate(element=>getComputedStyle(element).backgroundColor),'rgb(11, 11, 11)');
 assert.equal(await page.locator('.live-staff-link,.live-auth-privacy').count(),0);
 await page.screenshot({path:'test-results/cms-browser/account-registration-mobile.png'});
 await page.getByLabel('Email address',{exact:true}).fill(owner.email);await page.locator('.live-auth-switch a').click();
 await page.getByRole('heading',{name:'Sign in',exact:true}).waitFor();assert.equal(await page.getByLabel('Email address',{exact:true}).inputValue(),owner.email);
 await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByText('Browser test admin',{exact:false}).first().waitFor();
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
 assert.equal(await page.getByText('Bài viết cho AI ↗',{exact:true}).count(),0);assert.equal(await page.getByText(/Nguồn nhập trực tiếp/).count(),0);assert.equal(await page.getByText('Bật kết nối Gemini trong Cài đặt để AI nhận bài mới.',{exact:true}).count(),0);
 await page.getByRole('button',{name:'Thêm bài viết',exact:true}).click();await page.getByRole('combobox',{name:'Loại nội dung',exact:true}).selectOption('rule');await page.getByLabel('Tiêu đề',{exact:true}).fill('Synthetic operator rule');await page.getByLabel('Quy tắc trả lời',{exact:true}).fill('Synthetic operator policy');
 assert.equal(await page.getByRole('button',{name:'Dùng cho AI',exact:true}).isEnabled(),true);
 page.once('dialog',dialog=>dialog.accept());
 await page.setViewportSize({width:390,height:844});await fits();await page.screenshot({path:'test-results/cms-browser/knowledge-mobile.png'});
 // Native article language controls: preserve edits and show real pending state.
 const {articleTranslation}=await import('../src/modules/content/translations.ts');
 const translationSource=await payload.create({collection:'articles',user:owner,overrideAccess:false,data:{title:'Synthetic bilingual '+suffix,body:'Synthetic source body.',slug:'',language:'vi',jurisdiction:'BOTH'}});translationArticleIds.push(translationSource.id);
 const translationCopy=await articleTranslation(payload,owner,{id:translationSource.id,language:'de',updatedAt:translationSource.updatedAt,mode:'copy'});translationArticleIds.push(translationCopy.id);
 let releaseTranslation;const translationPending=new Promise(resolve=>{releaseTranslation=resolve;});let translationsRequested=0,notifyTranslation;const translationStarted=new Promise(resolve=>{notifyTranslation=resolve;});
 await page.route('**/service/articles/translations?*',route=>route.fulfill({json:{articles:[{id:translationSource.id,language:'vi'},{id:translationCopy.id,language:'de'}],translationReady:true}}));
 await page.route('**/service/articles/translations',async route=>{translationsRequested++;notifyTranslation();await translationPending;await route.fulfill({json:{translation:{title:'Synthetischer Titel',body:'Vollständiger synthetischer Text.'}}});});
 await page.goto(base+'/admin/collections/articles/'+translationSource.id);await page.locator('.lvd-article-language-actions').waitFor();
 assert.equal(await page.getByText('Thông tin bổ sung',{exact:true}).count(),0);
 await page.getByRole('button',{name:'Chuyển bài viết sang Tiếng Đức',exact:true}).click();assert.equal(translationsRequested,0,'Switching to an existing language never invokes AI');await page.waitForURL('**/admin/collections/articles/'+translationCopy.id);
 await page.getByRole('button',{name:'Dịch bằng AI',exact:true}).click();await page.getByRole('progressbar',{name:'Đang dịch bài viết'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Dịch bằng AI',exact:true}).isDisabled(),true);await Promise.race([translationStarted,pause(12000).then(()=>{throw new Error('Translation request did not start');})]);assert.equal(translationsRequested,1);
 await page.setViewportSize({width:390,height:844});await fits();await page.screenshot({path:'test-results/cms-browser/article-translation-loading-mobile.png'});
 releaseTranslation();await page.getByText('Đã dịch. Lưu bản nháp sau khi đọc lại.',{exact:true}).waitFor();
 assert.equal(await page.locator('#field-title').inputValue(),'Synthetischer Titel');assert.equal(await page.locator('#field-body').inputValue(),'Vollständiger synthetischer Text.');
 await page.getByRole('button',{name:'Chuyển bài viết sang Tiếng Việt',exact:true}).click();await page.waitForURL('**/admin/collections/articles/'+translationSource.id);assert.equal(translationsRequested,1,'Manual switching never starts another translation');
 const savedTranslation=await payload.findByID({collection:'articles',id:translationCopy.id,draft:true});assert.equal(savedTranslation.title,'Synthetischer Titel','Switching preserves edited text as a draft');await page.goto(base+'/admin');
 await page.unroute('**/service/articles/translations');await page.unroute('**/service/articles/translations?*');
 await page.goto(base+'/admin/collections/articles/create');
 await page.getByPlaceholder('Tiêu đề bài viết',{exact:true}).fill('Bài thử permalink');
 await page.getByPlaceholder('Viết nội dung bài viết…',{exact:true}).fill('Nội dung nhập tay');
 await page.waitForFunction(()=>document.querySelector('.lvd-post-permalink__url')?.textContent.includes('bai-thu-permalink'));
 await page.getByRole('button',{name:'Chuyển bài viết sang Tiếng Đức',exact:true}).click();assert.equal(await page.locator('#field-title').inputValue(),'Bài thử permalink','Switching the language does not translate or discard unsaved text');
 await page.locator('.lvd-post-permalink').getByRole('button',{name:'Sửa',exact:true}).click();await page.getByRole('textbox',{name:'Permalink',exact:true}).fill('duong-dan-rieng');await page.getByRole('button',{name:'Xong',exact:true}).click();
 await page.getByPlaceholder('Tiêu đề bài viết',{exact:true}).fill('Tiêu đề mới');assert.ok((await page.locator('.lvd-post-permalink__url').innerText()).endsWith('duong-dan-rieng'));
 page.once('dialog',dialog=>dialog.accept());await page.goto(base+'/admin');
 await pool.query("INSERT INTO lvd_integrations(provider,encrypted_values,enabled,check_state) VALUES('r2',$1,true,'passed')",[seal('r2',{endpoint:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',bucket:'synthetic-media',accessKeyId:'synthetic-only',secretAccessKey:'synthetic-only'})]);mediaStorageFixture=true;
 // Media library uses native permissions/bulk controls in both presentation modes.
 for(const index of [1,2,3]){const mime=index===3?'application/pdf':'image/svg+xml',filename='synthetic-media-'+suffix+'-'+index+(index===3?'.pdf':'.svg');const row=(await pool.query("INSERT INTO media(alt,filename,mime_type,filesize,visibility) VALUES($1,$2,$3,120,'private') RETURNING id",['Synthetic media '+index,filename,mime])).rows[0];mediaFixtureIds.push(row.id);}
 await page.route('**/api/media/file/synthetic-media-*',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="white"/></svg>'}));
 await page.goto(base+'/admin/collections/media');await page.locator('.lvd-media-grid').waitFor();
 await page.getByRole('button',{name:'Chọn nhiều',exact:true}).click();
 assert.equal(await page.locator('.lvd-media-grid input[type=checkbox]:disabled').count(),0,'Interface assets can be selected for metadata edits');
 await page.getByRole('button',{name:'Hủy chọn',exact:true}).click();
 await page.locator('.lvd-media-grid .lvd-media-tile:has(.lvd-media-readonly) .lvd-media-tile-link').first().click();await page.getByRole('dialog',{name:'Chi tiết tệp',exact:true}).waitFor();
 const detailTitle=page.getByRole('textbox',{name:'Tiêu đề tệp',exact:true});await detailTitle.waitFor();const oldMediaTitle=await detailTitle.inputValue();await fits();await page.screenshot({path:'test-results/cms-browser/media-details-mobile.png'});await page.setViewportSize({width:1280,height:900});await fits();await page.screenshot({path:'test-results/cms-browser/media-details-desktop.png'});await page.setViewportSize({width:390,height:844});
 await detailTitle.fill('Browser metadata '+suffix);await page.waitForFunction(()=>document.querySelector('.lvd-media-detail-state')?.textContent==='Đã lưu');
 assert.ok((await page.getByRole('textbox',{name:'URL tệp',exact:true}).inputValue()).startsWith(base+'/assets/'),'Original interface URL is preserved');
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__mediaCopied=text;}}}));await page.getByRole('button',{name:'Sao chép URL',exact:true}).click();assert.ok((await page.evaluate(()=>window.__mediaCopied)).startsWith(base+'/assets/'));
 await detailTitle.fill(oldMediaTitle);await page.waitForFunction(()=>document.querySelector('.lvd-media-detail-state')?.textContent==='Đã lưu');
 await page.getByRole('button',{name:'Đóng chi tiết tệp',exact:true}).click();await page.locator('.lvd-media-details').waitFor({state:'detached'});
 await page.getByRole('button',{name:'Tải tệp',exact:true}).click();await page.locator('.lvd-media-upload').waitFor();
 let syntheticUploadId;
 await page.route('**/api/media',async route=>{if(route.request().method()!=='POST')return route.continue();const filename='browser-upload-'+suffix+'.svg';syntheticUploadId=(await pool.query("INSERT INTO media(title,alt,filename,mime_type,filesize,visibility,uploaded_by_id) VALUES($1,'',$2,'image/svg+xml',100,'private',$3) RETURNING id",['Browser uploaded SVG',filename,owner.id])).rows[0].id;mediaFixtureIds.push(syntheticUploadId);return route.fulfill({status:201,json:{doc:{id:syntheticUploadId,filename}}});});
 await page.locator('.lvd-media-upload input[type=file]').setInputFiles({name:'browser-upload-'+suffix+'.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10H0Z"/></svg>')});
 await page.locator('.lvd-media-upload').getByText('Đã tải',{exact:true}).waitFor();assert.ok(syntheticUploadId);await page.unroute('**/api/media');
 await page.getByRole('button',{name:'Tải tệp',exact:true}).click();
 await page.route('**/api/media/file/browser-upload-*',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>'}));
 await page.locator('.lvd-media-grid a[href="/admin/collections/media/'+syntheticUploadId+'"]').click();await page.getByRole('button',{name:'Xóa vĩnh viễn',exact:true}).waitFor();
 await page.route('**/api/media/'+syntheticUploadId,async route=>{if(route.request().method()!=='DELETE')return route.continue();await pool.query('DELETE FROM media WHERE id=$1',[syntheticUploadId]);return route.fulfill({json:{id:syntheticUploadId}});});
 await page.getByRole('button',{name:'Xóa vĩnh viễn',exact:true}).click();await page.getByRole('button',{name:'Xóa tệp',exact:true}).click();await page.locator('.lvd-media-details').waitFor({state:'detached'});assert.equal((await pool.query('SELECT id FROM media WHERE id=$1',[syntheticUploadId])).rowCount,0);mediaFixtureIds.splice(mediaFixtureIds.indexOf(syntheticUploadId),1);
 await page.reload();await page.locator('.lvd-media-grid').waitFor();

 assert.equal(await page.getByText('Quản lý ảnh, logo, video và tài liệu. Kết nối R2 trong Cài đặt để tải thêm tệp.',{exact:true}).count(),0);
 await page.getByRole('button',{name:'Chọn nhiều',exact:true}).click();assert.equal(await page.locator('.lvd-media-grid input[type=checkbox]:disabled').count(),0,'Interface assets support metadata selection');
 await page.getByRole('button',{name:'Hủy chọn',exact:true}).click();await page.getByRole('searchbox',{name:'Tìm tệp',exact:true}).fill(suffix);
 await page.waitForFunction(()=>document.querySelectorAll('.lvd-media-grid .lvd-media-tile').length===3);
 await page.getByRole('button',{name:'Chọn nhiều',exact:true}).click();await page.getByRole('button',{name:'Chọn cả trang',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.lvd-media-grid input:checked').length===3);
 await page.getByRole('button',{name:'Xem dạng danh sách',exact:true}).click();await page.locator('.lvd-media-table').waitFor();assert.equal(await page.locator('.lvd-media-table input:checked').count(),3);
 await page.locator('.lvd-media-bulk-actions').getByRole('button',{name:'Chỉnh sửa',exact:true}).click();await page.locator('.edit-many__main').waitFor();await page.locator('.edit-many__header__close').click();
 await page.getByRole('button',{name:'Hủy chọn',exact:true}).click();await page.getByRole('combobox',{name:'Loại tệp',exact:true}).selectOption('svg');
 await page.waitForFunction(()=>document.querySelectorAll('.lvd-media-table tbody tr').length===2);
 await page.setViewportSize({width:390,height:844});await fits();await page.screenshot({path:'test-results/cms-browser/media-list-mobile.png'});
 await page.getByRole('button',{name:'Xem dạng lưới',exact:true}).click();await page.locator('.lvd-media-grid').waitFor();await fits();await page.screenshot({path:'test-results/cms-browser/media-grid-mobile.png'});
 await page.reload();await page.locator('.lvd-media-grid').waitFor();assert.equal(await page.getByRole('button',{name:'Xem dạng lưới',exact:true}).getAttribute('aria-pressed'),'true');
 await page.setViewportSize({width:1280,height:900});await fits();await page.screenshot({path:'test-results/cms-browser/media-grid-desktop.png'});
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

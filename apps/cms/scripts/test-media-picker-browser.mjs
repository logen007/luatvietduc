// Focused UI checks against the real CMS build and isolated synthetic records.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {setTimeout as pause} from 'node:timers/promises';
const db=new URL(process.env.DATABASE_URL||'');
if(!['127.0.0.1','localhost'].includes(db.hostname)||db.pathname!=='/lvd_test')throw Error('Isolated lvd_test database only');
const base='http://127.0.0.1:3047';process.env.APP_URL=base;process.env.LVD_WORKERS_DISABLED='1';
const {getPayload}=await import('payload'),{default:config}=await import('../src/payload.config.ts'),{pool}=await import('../src/modules/shared/db.ts'),{seal}=await import('../src/modules/integrations/crypto.ts'),{chromium}=await import('playwright');
const payload=await getPayload({config}),suffix=crypto.randomUUID(),password=crypto.randomUUID(),mediaIds=[];
let owner,article,server,browser,debugPage,addedStorage=false,log='';
await mkdir('test-results/media-picker',{recursive:true});
try{
 assert.equal((await pool.query("SELECT count(*)::int AS n FROM lvd_integrations WHERE provider='r2'")).rows[0].n,0,'No preexisting storage configuration may be overwritten');
 await pool.query("INSERT INTO lvd_integrations(provider,encrypted_values,enabled,check_state) VALUES('r2',$1,true,'passed')",[seal('r2',{endpoint:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',bucket:'synthetic-media-picker',accessKeyId:'synthetic-only',secretAccessKey:'synthetic-only'})]);addedStorage=true;
 owner=await payload.create({collection:'users',overrideAccess:true,context:{bootstrapOwner:true},data:{name:'Synthetic media picker admin',email:'picker-'+suffix+'@example.invalid',password,role:'owner'}});
 article=await payload.create({collection:'articles',user:owner,overrideAccess:false,draft:true,data:{title:'Synthetic picker '+suffix,body:'Synthetic image picker test.',_status:'draft'}});
 for(const [index,mime,visibility] of [[1,'image/png','public'],[2,'application/pdf','public'],[3,'image/png','private']]){
  const row=(await pool.query("INSERT INTO media(title,filename,url,mime_type,filesize,width,height,visibility,uploaded_by_id) VALUES($1,$2,'/api/media/file/'||$2::varchar,$3,1024,320,240,$4,$5) RETURNING id",['Picker fixture '+index,'picker-'+suffix+'-'+index+'.'+(mime==='application/pdf'?'pdf':'png'),mime,visibility,owner.id])).rows[0];mediaIds.push(row.id);
 }
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3047'],{stdio:['ignore','pipe','pipe'],env:process.env});server.stdout.on('data',s=>log=(log+s).slice(-4000));server.stderr.on('data',s=>log=(log+s).slice(-4000));
 let ready=false;for(let n=0;n<100;n++){try{if((await fetch(base+'/health/ready')).ok){ready=true;break;}}catch{}await pause(200);}assert.ok(ready,log);
 browser=await chromium.launch({headless:true,executablePath:process.env.LVD_TEST_BROWSER_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 for(const width of [320,390,768,1280]){
  await payload.update({collection:'articles',id:article.id,user:owner,overrideAccess:false,draft:true,data:{body:'Synthetic image picker test.',featuredImage:null}});
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<768,hasTouch:width<768});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  await context.route('**/api/media/file/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#799"/></svg>'}));
  const page=await context.newPage();debugPage=page;page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const login=await context.request.post(base+'/api/users/login',{headers:{origin:base},data:{email:owner.email,password}});assert.equal(login.status(),200);
  await page.goto(base+'/admin/collections/articles/'+article.id);await page.locator('.lvd-article-editor .tiptap').waitFor();
  // The article image field and rich text editor both use this drawer view.
  const cover=page.locator('#field-featuredImage');
  assert.equal(await cover.count(),1);
  const initialImageCount=await page.locator('.lvd-article-editor .tiptap img').count();
  const picker=page.locator('.lvd-media-picker:visible');
  // Cover fields retain their native image/public constraints in the shared chooser.
  await cover.getByRole('button',{name:'Chọn tệp',exact:true}).click();await picker.waitFor();
  await picker.getByRole('searchbox',{name:'Tìm tệp',exact:true}).fill(suffix);await page.waitForFunction(()=>document.querySelectorAll('.lvd-media-picker-item').length===1);
  await picker.locator('.lvd-media-picker-item').click();await picker.getByRole('button',{name:'Dùng tệp này',exact:true}).click();await picker.waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Thêm tệp',exact:true}).click();await picker.waitFor();
  assert.equal(await picker.getByRole('button',{name:'Dùng tệp này',exact:true}).isDisabled(),true);
  await picker.getByRole('tab',{name:'Thư viện',exact:true}).focus();await page.keyboard.press('ArrowLeft');assert.equal(await picker.getByRole('tab',{name:'Tải tệp lên'}).getAttribute('aria-selected'),'true');await page.keyboard.press('ArrowRight');
  const header=page.locator('.lvd-media-picker-view .list-header:visible'),titleBox=await header.locator('h1').boundingBox(),closeBox=await header.locator('.list-drawer__header-close').boundingBox();assert.ok(Math.abs(titleBox.y+titleBox.height/2-closeBox.y-closeBox.height/2)<4,'Title and close share one row');
  await picker.getByRole('searchbox',{name:'Tìm tệp',exact:true}).fill(suffix);
  await page.waitForFunction(()=>document.querySelectorAll('.lvd-media-picker-item').length===2);
  assert.equal(await picker.getByRole('button').filter({hasText:'Picker fixture 3'}).count(),0,'Private media excluded from editor');
  await picker.locator('.lvd-media-picker-item').first().click();
  assert.ok(await picker.locator('.lvd-media-picker-thumb img').count()>0,'Image thumbnails render');await picker.locator('.lvd-media-picker-thumb img').first().evaluate(img=>img.decode());
  assert.equal(await picker.getByRole('button',{name:'Dùng tệp này',exact:true}).isEnabled(),true);
  assert.equal(await page.locator('.lvd-article-editor .tiptap img').count(),initialImageCount,'Selection waits for explicit confirmation');
  const fit=await picker.evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,scroll:el.scrollWidth,client:el.clientWidth};});assert.ok(fit.left>=0&&fit.right<=fit.width+1&&fit.scroll<=fit.client+1,JSON.stringify(fit));
  const button=await picker.getByRole('button',{name:'Dùng tệp này',exact:true}).boundingBox();assert.ok(button.height>=44&&button.width>=44);
  await page.screenshot({path:'test-results/media-picker/library-'+width+'.png'});
  await picker.getByRole('searchbox',{name:'Tìm tệp',exact:true}).fill('no-match-'+suffix);await picker.locator('.lvd-media-picker-empty').waitFor();
  await picker.getByRole('tab',{name:'Tải tệp lên',exact:true}).click();await picker.getByRole('button',{name:'Chọn tệp',exact:true}).waitFor();
  assert.equal(await picker.getByRole('checkbox',{name:'Công khai tệp để dùng trên website',exact:true}).isChecked(),true);
  // Failed uploads must remain visible, without inserting media or changing tab.
  let failUpload=true;const uploadDoc=await(await context.request.get(base+'/api/media/'+mediaIds[0])).json();
  // The production editor requires HTTPS; use an equivalent relative native URL
  // for this HTTP-only localhost fixture rather than weakening its URL guard.
  uploadDoc.url=new URL(uploadDoc.url).pathname;
  await page.route(base+'/api/media/'+mediaIds[0]+'?depth=0',route=>route.fulfill({json:uploadDoc}));await page.route(base+'/api/media',route=>route.request().method()==='POST'?failUpload?route.fulfill({status:503,json:{errors:[{message:'Synthetic upload failure'}]}}):route.fulfill({status:201,json:{doc:uploadDoc}}):route.fallback());
  await picker.locator('input[type=file]').setInputFiles({name:'failure.png',mimeType:'image/png',buffer:Buffer.from('synthetic fixture')});await picker.getByRole('alert').filter({hasText:'Synthetic upload failure'}).waitFor();
  assert.equal(await picker.getByRole('tab',{name:'Tải tệp lên'}).getAttribute('aria-selected'),'true');
  await page.screenshot({path:'test-results/media-picker/upload-'+width+'.png'});
  failUpload=false;await picker.locator('input[type=file]').setInputFiles({name:'success.png',mimeType:'image/png',buffer:Buffer.from('synthetic fixture')});
  await page.waitForFunction(()=>document.querySelector('.lvd-media-picker [role=tab][aria-selected=true]')?.textContent==='Thư viện');
  await picker.locator('.lvd-media-picker-item.is-selected').filter({hasText:'Picker fixture 1'}).waitFor();
  await picker.getByRole('tab',{name:'Thư viện',exact:true}).click();await picker.getByRole('searchbox',{name:'Tìm tệp',exact:true}).fill(suffix);await page.waitForFunction(()=>document.querySelectorAll('.lvd-media-picker-item').length===2);
  await picker.locator('.lvd-media-picker-item').filter({hasText:'Picker fixture 1'}).click();await picker.getByRole('button',{name:'Dùng tệp này',exact:true}).click();await page.waitForFunction(n=>document.querySelectorAll('.lvd-article-editor .tiptap img').length>n,initialImageCount);
  assert.equal(errors.length,0,errors.join('\n'));await context.close();
  console.log('Media picker viewport passed:',width);
 }
 console.log('Media picker checks passed: desktop/tablet/mobile 320/390, private filtering, explicit selection, no matches, upload failure, progress recovery and insertion.');
}catch(error){console.error('UI failure',error);if(debugPage)console.error((await debugPage.locator('body').innerText()).slice(-6000));throw error;}finally{
 await browser?.close();if(server&&server.exitCode===null){server.kill('SIGTERM');await pause(500);if(server.exitCode===null)server.kill('SIGKILL');}
 if(article&&owner)await payload.delete({collection:'articles',id:article.id,user:owner,overrideAccess:false});
 if(mediaIds.length)await pool.query('DELETE FROM media WHERE id=ANY($1::int[])',[mediaIds]);
 if(owner)await payload.delete({collection:'users',id:owner.id,overrideAccess:true});if(addedStorage)await pool.query("DELETE FROM lvd_integrations WHERE provider='r2'");
 await payload.destroy();await pool.end();
}
process.exit(0);

// Real CMS controls, synthetic records, isolated database only.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as pause} from 'node:timers/promises';
const db=new URL(process.env.DATABASE_URL||'');
if(!['127.0.0.1','localhost'].includes(db.hostname)||db.pathname!=='/lvd_test')throw Error('Isolated lvd_test database only');
const base='http://127.0.0.1:3047';process.env.APP_URL=base;process.env.LVD_WORKERS_DISABLED='1';
const {getPayload}=await import('payload'),{default:config}=await import('../src/payload.config.ts'),{pool}=await import('../src/modules/shared/db.ts'),{chromium}=await import('playwright');
const payload=await getPayload({config}),suffix=crypto.randomUUID(),password=crypto.randomUUID(),baseline=process.env.LVD_ACTIONS_BASELINE==='1';
let owner,article,server,browser,debugPage,log='';
await mkdir('test-results/article-actions',{recursive:true});
try{
 owner=await payload.create({collection:'users',overrideAccess:true,context:{bootstrapOwner:true},data:{name:'Synthetic toolbar admin',email:'toolbar-'+suffix+'@example.invalid',password,role:'owner'}});
 const categories=await payload.find({collection:'categories',limit:1,overrideAccess:true}),tags=await payload.find({collection:'tags',limit:2,overrideAccess:true});
 article=await payload.create({collection:'articles',user:owner,overrideAccess:false,draft:true,data:{title:'Bài kiểm tra thanh công cụ với tiêu đề rất dài '+suffix,body:'<div data-lvd-richtext="1"><h2>Nội dung kiểm tra</h2>'+('<p>Kiểm tra các nút và cuộn trang bằng dữ liệu giả.</p>'.repeat(20))+'</div>',categories:categories.docs.map(x=>x.id),tags:tags.docs.map(x=>x.id),_status:'draft'}});
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3047'],{stdio:['ignore','pipe','pipe'],env:process.env});server.stdout.on('data',s=>log=(log+s).slice(-4000));server.stderr.on('data',s=>log=(log+s).slice(-4000));
 let ready=false;for(let n=0;n<100;n++){try{if((await fetch(base+'/health/ready')).ok){ready=true;break;}}catch{}await pause(200);}assert.ok(ready,log);
 browser=await chromium.launch({headless:true,executablePath:process.env.LVD_TEST_BROWSER_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const measurements=[];
 for(const width of [320,390,768,1024,1280,1642]){
  await payload.update({collection:'articles',id:article.id,user:owner,overrideAccess:false,draft:true,data:{_status:'draft'}});
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<768,hasTouch:width<768});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  let releasePost,translationReady=true;
  await context.route('**/service/articles/translations*',route=>{
   if(route.request().method()==='GET')return route.fulfill({json:{articles:[],translationReady}});
   return new Promise(resolve=>{releasePost=()=>{void route.fulfill({status:503,json:{error:'Synthetic translation unavailable'}}).then(resolve);};});
  });
  const page=await context.newPage();debugPage=page;page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  assert.equal((await context.request.post(base+'/api/users/login',{headers:{origin:base},data:{email:owner.email,password}})).status(),200);
  await page.goto(base+'/admin/collections/articles/'+article.id);await page.locator('.lvd-inline-article-title input').waitFor();await page.locator('.lvd-article-editor .tiptap').waitFor();await page.evaluate(()=>document.fonts.ready);
  const measure=()=>page.evaluate(()=>{
   const rect=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,radius:s.borderRadius,border:s.borderWidth,padding:s.padding,display:s.display};};
   const selectors=['.lvd-article-language-toggle','.lvd-article-translate','#preview-button','#action-save','.doc-controls__popup .popup-button'];
   const side=document.querySelector('.document-fields__sidebar-fields');
   return {width:innerWidth,pageWidth:document.documentElement.scrollWidth,toolbar:rect(document.querySelector('.doc-controls')),fields:rect(document.querySelector('.document-fields')),side:rect(side),gutter:getComputedStyle(side).paddingRight,buttons:selectors.map(selector=>({selector,...rect(document.querySelector(selector)),html:document.querySelector(selector).outerHTML.slice(0,500)})),dots:rect(document.querySelector('.doc-controls__dots')),wrapper:rect(document.querySelector('.doc-controls__controls-wrapper'))};
  });
  const geometry=await measure();measurements.push(geometry);console.log('Toolbar geometry',JSON.stringify(geometry));
  await page.screenshot({path:'test-results/article-actions/'+(baseline?'baseline-':'fixed-')+width+'.png'});
  if(!baseline){
   assert.ok(geometry.pageWidth<=width+1,'No horizontal page overflow at '+width);
   for(const button of geometry.buttons){assert.ok(Math.abs(button.height-44)<1,'44px action: '+JSON.stringify(button));assert.equal(button.radius,'4px','Shared corners: '+button.selector);assert.ok(button.x>=0&&button.right<=width,'Visible action: '+button.selector);}
   for(const button of geometry.buttons.filter(b=>b.selector.includes('preview')||b.selector.includes('popup-button')))assert.equal(button.width,44,'Square icon action');
   assert.equal(geometry.dots.border,'0px','Menu has one outer border');
   assert.ok(Math.abs(geometry.buttons.at(-1).right-(geometry.side.right-parseFloat(geometry.gutter)))<1,'Toolbar aligns with settings content right edge');
   const groups=Map.groupBy(geometry.buttons,b=>Math.round(b.y));for(const row of groups.values())for(let n=1;n<row.length;n++)assert.ok(Math.abs(row[n].x-row[n-1].right-8)<1,'Uniform 8px action spacing');
   assert.equal(new Set(geometry.buttons.map(b=>Math.round(b.y))).size,width<=380?2:1,'Predictable toolbar rows');
   for(const button of geometry.buttons)assert.ok(button.y>=geometry.toolbar.y&&button.bottom<=geometry.toolbar.bottom,'Actions fit header');
   const tabSelectors=['.lvd-article-language-toggle','.lvd-article-translate','#preview-button','#action-save','.doc-controls__popup .popup-button'];
   await page.locator(tabSelectors[0]).focus();
   for(const selector of tabSelectors.slice(1)){await page.keyboard.press('Tab');assert.equal(await page.locator(selector).evaluate(e=>e===document.activeElement),true,'Tab order follows visual order: '+selector);}
   const popup=page.getByRole('button',{name:'Thao tác khác',exact:true});await popup.click();await page.locator('.popup__content:visible').waitFor();const menuBox=await page.locator('.popup__content:visible').boundingBox();assert.ok(menuBox.x>=0&&menuBox.x+menuBox.width<=width+1,'Menu stays in viewport');await page.keyboard.press('Escape');await page.locator('.popup__content:visible').waitFor({state:'hidden'});
   await popup.focus();assert.equal(await popup.evaluate(e=>e===document.activeElement),true,'Menu supports keyboard focus');await page.keyboard.press('Enter');await page.locator('.popup__content:visible').waitFor();await page.keyboard.press('Escape');
   await page.evaluate(()=>window.scrollTo(0,500));await page.waitForTimeout(100);const scrolled=await measure();for(const b of scrolled.buttons)assert.ok(b.y>=-1&&b.bottom<=844,'Actions remain visible after scrolling');
   if(width===390||width===1280){
    await page.evaluate(()=>window.scrollTo(0,0));
    const originalTitle=await page.locator('.lvd-inline-article-title input').inputValue();
    for(const selector of ['.lvd-article-translate','.lvd-article-language-toggle']){
     releasePost=null;await page.locator(selector).click();await page.locator('.lvd-translation-loading').waitFor();
     assert.equal(await page.locator(selector).isDisabled(),true,'Action disabled during request');
     const busy=await measure();for(let n=0;n<busy.buttons.length;n++){assert.equal(busy.buttons[n].height,44);assert.ok(Math.abs(busy.buttons[n].width-geometry.buttons[n].width)<1,'Loading does not resize toolbar');}
     assert.ok(releasePost,'Translation request reached handler');releasePost();await page.locator('.lvd-translation-error').filter({hasText:'Synthetic translation unavailable'}).waitFor();
     await page.waitForFunction(selector=>!document.querySelector(selector).disabled,selector);
     assert.equal(await page.locator('.lvd-inline-article-title input').inputValue(),originalTitle,'Failure preserves draft');
    }
    const preview=page.locator('#preview-button'),href=await preview.getAttribute('href');
    const [previewPage]=await Promise.all([page.waitForEvent('popup'),preview.click()]);await previewPage.waitForURL(base+href);await previewPage.close();
    if(width===1280){
     const [saved]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/articles/'+article.id&&r.request().method()==='PATCH'&&!r.url().includes('draft=true')),page.locator('#action-save').click()]);
     assert.equal(saved.status(),200,'Native publish succeeds');
     const published=await context.request.get(base+'/api/articles/'+article.id+'?depth=0');assert.equal((await published.json())._status,'published','Synthetic article published');
    }
    translationReady=false;await page.reload();await page.waitForFunction(()=>document.querySelector('.lvd-article-translate')?.disabled&&document.querySelector('.lvd-article-translate')?.title==='Chưa bật kết nối AI dịch bài viết');
    assert.equal((await page.locator('.lvd-article-translate').boundingBox()).height,44,'Unavailable AI retains button size');
   }
   assert.equal(errors.length,0,errors.join('\n'));
  }
  await context.close();console.log((baseline?'Baseline':'Passed')+' viewport '+width);
 }
 await writeFile('test-results/article-actions/'+(baseline?'baseline':'fixed')+'.json',JSON.stringify(measurements,null,2));
}catch(error){console.error('Article toolbar failure',error);if(debugPage&&!debugPage.isClosed())await debugPage.screenshot({path:'test-results/article-actions/failure.png'}).catch(()=>{});throw error;}finally{
 await browser?.close();if(server&&server.exitCode===null){server.kill('SIGTERM');await pause(500);if(server.exitCode===null)server.kill('SIGKILL');}
 if(article&&owner)await payload.delete({collection:'articles',id:article.id,user:owner,overrideAccess:false});if(owner)await payload.delete({collection:'users',id:owner.id,overrideAccess:true});await payload.destroy();await pool.end();
}

process.exit(0);

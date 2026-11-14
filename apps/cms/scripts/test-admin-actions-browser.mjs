// Shared action controls on real admin screens; localhost synthetic data only.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as pause} from 'node:timers/promises';
const db=new URL(process.env.DATABASE_URL||'');
if(!['127.0.0.1','localhost'].includes(db.hostname)||db.pathname!=='/lvd_test')throw Error('Isolated lvd_test database only');
const base='http://127.0.0.1:3047';process.env.APP_URL=base;process.env.LVD_WORKERS_DISABLED='1';
const {getPayload}=await import('payload'),{default:config}=await import('../src/payload.config.ts'),{pool}=await import('../src/modules/shared/db.ts'),{chromium}=await import('playwright');
const payload=await getPayload({config}),suffix=crypto.randomUUID(),password=crypto.randomUUID(),fixtures=[],results=[];let image;
let owner,server,browser,debugPage,log='';
const selector='.doc-controls__controls .btn,.doc-controls .preview-btn,.doc-controls__popup .popup-button,.list-header__title-actions>a,.list-header__title-actions>button,.list-controls [class*=list-controls__toggle-],.list-controls__popup .popup-button,.lvd-article-import-actions>a,.lvd-csv-toolbar>button,.integration-actions>button,.lvd-answer-rule footer>button,.lvd-media-filters button,.lvd-media-list-actions>button,.lvd-admin-actions>a,.lvd-admin-actions>button,.backup-panel>.lvd-admin-card>button,.lvd-profile button';
await mkdir('test-results/admin-actions',{recursive:true});
try{
 owner=await payload.create({collection:'users',overrideAccess:true,context:{bootstrapOwner:true},data:{name:'Synthetic shared toolbar admin',email:'actions-'+suffix+'@example.invalid',password,role:'owner'}});
 const create=async(collection,data,draft=false)=>{const doc=await payload.create({collection,data,user:owner,overrideAccess:false,...(draft?{draft:true}:{})});fixtures.push([collection,doc.id]);return doc.id;};
 const category=await create('categories',{name:'Toolbar category '+suffix,slug:'toolbar-'+suffix}),tag=await create('tags',{name:'Toolbar tag '+suffix,slug:'toolbar-'+suffix});
 const reply=await create('quick-replies',{title:'Toolbar reply '+suffix,body:'Synthetic reply only.'});
 const knowledge=await create('knowledge',{title:'Toolbar knowledge '+suffix,body:'Synthetic knowledge only.',_status:'draft'},true);
 image=(await pool.query("INSERT INTO media(title,filename,mime_type,filesize,width,height,visibility,uploaded_by_id) VALUES('Synthetic shared action image',$1,'image/png',100,240,160,'private',$2) RETURNING id,filename,updated_at AS \"updatedAt\",uploaded_by_id AS \"uploadedBy\"",['actions-'+suffix+'.png',owner.id])).rows[0];
 image.updatedAt=new Date(image.updatedAt).toISOString();
 const pages=[
  ['categories-edit','/admin/collections/categories/'+category],['tags-edit','/admin/collections/tags/'+tag],['knowledge-edit','/admin/collections/knowledge/'+knowledge],['reply-edit','/admin/collections/quick-replies/'+reply],['user-edit','/admin/collections/users/'+owner.id],['settings','/admin/globals/site-settings'],
  ...['articles','categories','tags','knowledge','users','media','quick-replies'].map(slug=>[slug+'-list','/admin/collections/'+slug]),
  ['connections','/admin/settings/connections'],['backups','/admin/settings/backups'],['rules','/admin/knowledge/rules'],['import','/admin/articles/import'],['profile','/admin/account']
 ];
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3047'],{stdio:['ignore','pipe','pipe'],env:process.env});server.stdout.on('data',s=>log=(log+s).slice(-4000));server.stderr.on('data',s=>log=(log+s).slice(-4000));
 let ready=false;for(let n=0;n<100;n++){try{if((await fetch(base+'/health/ready')).ok){ready=true;break;}}catch{}await pause(200);}assert.ok(ready,log);
 browser=await chromium.launch({headless:true,executablePath:process.env.LVD_TEST_BROWSER_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 for(const width of (process.env.LVD_ADMIN_ACTIONS_MEDIA_ONLY==='1'?[390,1440]:[320,390,768,1440])){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<768,hasTouch:width<768});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/users/login',{headers:{origin:base},data:{email:owner.email,password}})).status(),200);
  const page=await context.newPage();debugPage=page;page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [name,path] of (process.env.LVD_ADMIN_ACTIONS_MEDIA_ONLY==='1'?[]:pages.filter(([name])=>!process.env.LVD_ADMIN_ACTIONS_PAGE||name===process.env.LVD_ADMIN_ACTIONS_PAGE))){
   await page.goto(base+path);await page.locator('.template-default__wrap').waitFor();
   if(name==='connections'||name==='backups')await page.locator('.integration-actions').first().waitFor();
   if(name==='rules')await page.locator('.lvd-answer-rule textarea:not([disabled])').first().waitFor();
   if(name==='media-list')await page.locator('.lvd-media-filters').waitFor();
   await page.locator(':is('+selector+'):visible').first().waitFor();await page.evaluate(()=>document.fonts.ready);
   const boxes=await page.locator(selector).evaluateAll(nodes=>nodes.filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {text:(e.textContent||e.getAttribute('aria-label')||e.id).trim(),class:e.className,x:r.x,right:r.right,y:r.y,height:r.height,width:r.width,radius:s.borderRadius};}));
   assert.ok(boxes.length,'Actions exist: '+name);
   const issues=boxes.filter(b=>Math.abs(b.height-44)>1||b.radius!=='4px'||b.x<0||b.right>width+1);
   assert.deepEqual(issues,[],name+' '+width+' controls');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' page fits '+width);
   const menu=page.locator('.doc-controls__popup .popup-button:visible,.list-controls__popup .popup-button:visible').first();
   if(await menu.count()){
    await menu.click();const content=page.locator('.popup__content:visible').first();await content.waitFor();const r=await content.boundingBox();assert.ok(r.x>=-1&&r.x+r.width<=width+1,'Menu fits '+name);await page.keyboard.press('Escape');await content.waitFor({state:'hidden'});
   }
   const filters=page.locator('#toggle-list-filters:visible');
   if(await filters.count()){await filters.click();assert.equal(await filters.getAttribute('aria-expanded'),'true');await filters.click();assert.equal(await filters.getAttribute('aria-expanded'),'false');}
   if(name==='media-list'){await page.getByRole('button',{name:'Xem dạng danh sách',exact:true}).click();await page.locator('.lvd-media-list-actions').waitFor();assert.equal(await page.locator('.lvd-media-list-actions button').isDisabled(),true,'Bulk apply disabled without selection');await page.getByRole('button',{name:'Xem dạng lưới',exact:true}).click();
    await page.locator('.lvd-media-grid a').first().click();const details=page.locator('.lvd-media-details[open]');await details.locator('.lvd-media-detail-actions').waitFor();
    const detailBoxes=await details.locator('header button,.lvd-media-detail-actions>a,.lvd-media-detail-actions>button').evaluateAll(nodes=>nodes.map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {text:e.textContent.trim(),height:r.height,radius:s.borderRadius,x:r.x,right:r.right};}));
    assert.deepEqual(detailBoxes.filter(b=>Math.abs(b.height-44)>1||b.radius!=='4px'||b.x<0||b.right>width+1),[],'File details use shared controls');
    if(width===390||width===1440)await page.screenshot({path:'test-results/admin-actions/file-details-'+width+'.png'});
    await details.getByRole('button',{name:'Đóng chi tiết tệp',exact:true}).click();await details.waitFor({state:'hidden'});
   }
   if(width===390||width===1440)await page.screenshot({path:'test-results/admin-actions/'+name+'-'+width+'.png'});
   results.push({page:name,width,controls:boxes.length});console.log('Passed',name,width,boxes.length);
  }
  if((width===390||width===1440)&&!process.env.LVD_ADMIN_ACTIONS_PAGE){
   const {testMediaImageEditor}=await import('./test-media-image-editor.mjs');
   await testMediaImageEditor({page,base,image,inspectActions:async editor=>{
    const boxes=await editor.locator('button:visible').evaluateAll(nodes=>nodes.map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {text:e.textContent.trim(),height:r.height,radius:s.borderRadius};}));
    assert.deepEqual(boxes.filter(b=>Math.abs(b.height-44)>1||b.radius!=='4px'),[],'Image editor controls match shared standard');
    await page.screenshot({path:'test-results/admin-actions/image-editor-'+width+'.png'});
   }});
  }
  assert.deepEqual(errors,[],'No page errors at '+width);await context.close();
 }
 await writeFile('test-results/admin-actions/results.json',JSON.stringify(results,null,2));console.log('Passed admin action screen/viewport combinations:',results.length);
}catch(error){console.error('Admin actions failure',error);if(debugPage&&!debugPage.isClosed())await debugPage.screenshot({path:'test-results/admin-actions/failure.png'}).catch(()=>{});throw error;}finally{
 await browser?.close();if(server&&server.exitCode===null){server.kill('SIGTERM');await pause(500);if(server.exitCode===null)server.kill('SIGKILL');}
 if(image)await pool.query('DELETE FROM media WHERE id=$1',[image.id]);
 for(const [collection,id] of fixtures.reverse())await payload.delete({collection,id,user:owner,overrideAccess:false});if(owner)await payload.delete({collection:'users',id:owner.id,overrideAccess:true});await payload.destroy();await pool.end();
}
process.exit(0);

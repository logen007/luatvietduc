// Shared article/knowledge title shell, using real native forms and fake local data.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {setTimeout as pause} from 'node:timers/promises';
const db=new URL(process.env.DATABASE_URL||'');
if(!['127.0.0.1','localhost'].includes(db.hostname)||db.pathname!=='/lvd_test')throw Error('Isolated lvd_test database only');
const base='http://127.0.0.1:3047';process.env.APP_URL=base;process.env.LVD_WORKERS_DISABLED='1';
const {getPayload}=await import('payload'),{default:config}=await import('../src/payload.config.ts'),{pool}=await import('../src/modules/shared/db.ts'),{chromium}=await import('playwright');
const payload=await getPayload({config}),suffix=crypto.randomUUID(),password=crypto.randomUUID(),fixtures=[];
const initialTitle='Tiêu đề kiểm tra bố cục soạn nội dung dài '+suffix,body='<div data-lvd-richtext="1"><h2>Nội dung giả</h2>'+('<p>Kiểm tra khung soạn dùng chung và lưu đúng dữ liệu.</p>'.repeat(20))+'</div>';
let owner,member,server,browser,debugPage,log='';
await mkdir('test-results/content-editor',{recursive:true});
try{
 owner=await payload.create({collection:'users',overrideAccess:true,context:{bootstrapOwner:true},data:{name:'Synthetic content header owner',email:'header-'+suffix+'@example.invalid',password,role:'owner'}});
 member=await payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Synthetic denied member',email:'denied-'+suffix+'@example.invalid',password,role:'member'}});
 const create=async(collection,data)=>{const doc=await payload.create({collection,data,user:owner,overrideAccess:true,draft:true});fixtures.push([collection,doc.id]);return doc;};
 const article=await create('articles',{title:initialTitle,body,_status:'draft'}),knowledge=await create('knowledge',{title:initialTitle,body,_status:'draft'});
 const derived=await create('knowledge',{title:'Synthetic source-owned title',body,articleOrigin:article.id,_status:'draft'});
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3047'],{stdio:['ignore','pipe','pipe'],env:process.env});server.stdout.on('data',s=>log=(log+s).slice(-4000));server.stderr.on('data',s=>log=(log+s).slice(-4000));
 let ready=false;for(let n=0;n<100;n++){try{if((await fetch(base+'/health/ready')).ok){ready=true;break;}}catch{}await pause(200);}assert.ok(ready,log);
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 for(const width of [320,390,768,1024,1280,1642]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<768,hasTouch:width<768});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/users/login',{headers:{origin:base},data:{email:owner.email,password}})).status(),200);
  const page=await context.newPage();debugPage=page;page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [collection,doc] of [['articles',article],['knowledge',knowledge]]){
   await page.goto(base+'/admin/collections/'+collection+'/'+doc.id);const title=page.locator('.doc-controls__wrapper .lvd-inline-document-title input');await title.waitFor();await page.locator('.lvd-article-editor .tiptap').waitFor();await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('.doc-header:visible').count(),0,'One title header for '+collection);
   assert.equal(await page.locator('.lvd-inline-document-title input:visible').count(),1);
   const shape=await page.evaluate(()=>{
    const input=document.querySelector('.lvd-inline-document-title input'),title=input.getBoundingClientRect(),header=document.querySelector('.doc-controls').getBoundingClientRect(),back=document.querySelector('.lvd-admin-back')?.getBoundingClientRect(),side=document.querySelector('.document-fields__sidebar'),panel=side.getBoundingClientRect(),styles=getComputedStyle(input),wrap=document.querySelector('.document-fields__sidebar-wrap').getBoundingClientRect(),fields=document.querySelector('.document-fields').getBoundingClientRect();
    const actions=[...document.querySelectorAll('.doc-controls__controls .btn,.doc-controls__popup .popup-button')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,height:r.height,radius:getComputedStyle(e).borderRadius};});
    return {width:innerWidth,overflow:document.documentElement.scrollWidth,title:{x:title.x,right:title.right,y:title.y,height:title.height,textLeft:title.x+parseFloat(styles.paddingLeft),font:styles.fontSize},header:{x:header.x,y:header.y,right:header.right,bottom:header.bottom},back:back?{x:back.x,right:back.right,y:back.y}:null,side:{width:wrap.width,client:side.clientWidth,scroll:side.scrollWidth,bottom:wrap.bottom},fieldsBottom:fields.bottom,actions};
   });
   assert.ok(shape.overflow<=width+1,JSON.stringify(shape));assert.equal(shape.title.height,44);assert.equal(shape.title.font,width<=760?'18px':'22px');
   assert.ok(shape.title.y>=shape.header.y&&shape.title.y+44<=shape.header.bottom,'Title belongs to action header');
   if(width<=1024&&shape.back)assert.ok(shape.title.textLeft>=shape.back.right+8,'Back and title do not overlap');
   for(const action of shape.actions){assert.equal(action.height,44);assert.equal(action.radius,'4px');assert.ok(action.x>=0&&action.right<=width+1);}
   assert.ok(shape.side.scroll<=shape.side.client+1,'Settings have no sideways scroll');if(width>1000){assert.equal(shape.side.width,320);assert.ok(Math.abs(shape.side.bottom-shape.fieldsBottom)<1,'Divider reaches full content height');}
   await page.screenshot({path:'test-results/content-editor/'+collection+'-'+width+'.png'});
   if(collection==='knowledge'&&(width===390||width===1280)){
    const updated='Tiêu đề được sửa trực tiếp '+width+' '+suffix;await title.fill(updated);
    const [saved]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/knowledge/'+doc.id&&r.request().method()==='PATCH'),page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click()]);assert.equal(saved.status(),200);
    const draft=await page.evaluate(async id=>{const r=await fetch('/api/knowledge/'+id+'?draft=true&depth=0',{cache:'no-store'});if(!r.ok)throw Error('Draft read '+r.status);return r.json();},doc.id);assert.equal(draft.title,updated);assert.equal(draft.body,body);assert.equal(draft._status,'draft');
    await page.reload();await title.waitFor();assert.equal(await title.inputValue(),updated,'Reload retains edited title');
    await title.fill('');await page.locator('#action-save').click();await page.locator('.lvd-inline-title-error').waitFor();assert.equal(await title.getAttribute('aria-invalid'),'true');
    const unchanged=await page.evaluate(async id=>(await fetch('/api/knowledge/'+id+'?draft=true&depth=0',{cache:'no-store'})).json(),doc.id);assert.equal(unchanged.title,updated,'Invalid title does not overwrite saved draft');
    await title.fill(updated+' đã xuất bản');
    const [published]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/knowledge/'+doc.id&&r.request().method()==='PATCH'),page.locator('#action-save').click()]);assert.equal(published.status(),200);
    const applied=await page.evaluate(async id=>(await fetch('/api/knowledge/'+id+'?depth=0',{cache:'no-store'})).json(),doc.id);assert.equal(applied.title,updated+' đã xuất bản');assert.equal(applied._status,'published');assert.equal(applied.body,body);
   }
   console.log('Shared editor passed',collection,width);
  }
  if(width===390){
   await page.goto(base+'/admin/collections/knowledge/'+derived.id);const sourceTitle=page.locator('.doc-controls__wrapper .lvd-inline-document-title input');await sourceTitle.waitFor();assert.equal(await sourceTitle.getAttribute('readonly'),'');assert.equal(await sourceTitle.inputValue(),derived.title);
   await page.goto(base+'/admin/collections/knowledge/create');const newTitle=page.locator('.doc-controls__wrapper .lvd-inline-document-title input');await newTitle.waitFor();await newTitle.fill('Synthetic new header '+suffix);await page.locator('.tiptap').fill('Synthetic new knowledge body.');
   const [created]=await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname==='/api/knowledge'&&r.request().method()==='POST'),page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click()]);assert.equal(created.status(),201);const newDoc=(await created.json()).doc;fixtures.push(['knowledge',newDoc.id]);assert.equal(newDoc.title,'Synthetic new header '+suffix);assert.equal(newDoc._status,'draft');
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 const denied=await browser.newContext();assert.equal((await denied.request.post(base+'/api/users/login',{headers:{origin:base},data:{email:member.email,password}})).status(),200);
 await denied.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());const memberPage=await denied.newPage();await memberPage.goto(base+'/tai-khoan');
 const access=await memberPage.evaluate(async id=>{const me=await(await fetch('/api/users/me')).json();const response=await fetch('/api/knowledge/'+id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({title:'Denied change'})});return {user:me.user?.id,status:response.status};},knowledge.id);assert.equal(access.user,member.id);assert.ok([403,404].includes(access.status),'Authenticated member cannot change title');await denied.close();
 console.log('Knowledge title save/reload/required/publish/create/read-only and member access checks passed.');
}catch(error){console.error('Shared editor failure',error);if(debugPage&&!debugPage.isClosed())await debugPage.screenshot({path:'test-results/content-editor/failure.png'}).catch(()=>{});throw error;}finally{
 await browser?.close();if(server&&server.exitCode===null){server.kill('SIGTERM');await pause(500);if(server.exitCode===null)server.kill('SIGKILL');}
 for(const [collection,id] of fixtures.reverse())await payload.delete({collection,id,user:owner,overrideAccess:true});if(member)await payload.delete({collection:'users',id:member.id,overrideAccess:true});if(owner)await payload.delete({collection:'users',id:owner.id,overrideAccess:true});await payload.destroy();await pool.end();
}
process.exit(0);

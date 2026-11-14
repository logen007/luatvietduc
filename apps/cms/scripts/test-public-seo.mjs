// Real built pages, isolated data only. No external provider or search submission.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as pause} from 'node:timers/promises';
const db=new URL(process.env.DATABASE_URL||'');
if(!['localhost','127.0.0.1'].includes(db.hostname)||db.pathname!=='/lvd_test')throw new Error('Isolated test database only');
const base='http://127.0.0.1:3048';process.env.APP_URL=base;process.env.LVD_WORKERS_DISABLED='1';
const {getPayload,createLocalReq}=await import('payload'),{default:config}=await import('../src/payload.config.ts');
const {setTranslationGroup}=await import('../src/modules/content/translation-group.ts');
const {pool}=await import('../src/modules/shared/db.ts');
const {chromium}=await import('playwright'),payload=await getPayload({config}),suffix=crypto.randomUUID(),ids=[];
const before=await payload.findGlobal({slug:'site-settings',overrideAccess:true});
let server,browser,owner,log='';
try{
 owner=await payload.create({collection:'users',overrideAccess:true,context:{bootstrapOwner:true},data:{name:'Synthetic SEO owner',email:`seo-${suffix}@example.invalid`,password:crypto.randomUUID(),role:'owner'}});
 const create=async(language,status)=>{const article=await payload.create({collection:'articles',user:owner,overrideAccess:false,data:{title:'Synthetic SEO '+language+' '+suffix,slug:'seo-'+language+'-'+status+'-'+ids.length+'-'+suffix,body:'Nội dung kiểm thử giả, không phải tư vấn.',jurisdiction:'BOTH',language,_status:status,reviewState:status==='published'?'approved':'draft'}});ids.push(article.id);return article;};
 const first=await create('vi','published'),draft=await create('vi','draft');
 // More than one real page catches accidental canonical/title collapse.
 for(let i=0;i<12;i++)await create('vi','published');
 const req=await createLocalReq({user:owner},payload);setTranslationGroup(req,first.translationGroup);
 const second=await payload.create({collection:'articles',req,overrideAccess:false,data:{title:'Synthetischer SEO Test '+suffix,slug:'seo-de-'+suffix,body:'Synthetischer Testinhalt.',jurisdiction:'BOTH',language:'de',_status:'published',reviewState:'approved'}});ids.push(second.id);
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3048'],{stdio:['ignore','pipe','pipe'],env:process.env});
 server.stderr.on('data',data=>{log=(log+data).slice(-3000);});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/health/live')).ok)break;}catch{}await pause(200);if(i===99)throw new Error('Server not ready '+log);}
 browser=await chromium.launch({executablePath:process.env.LVD_TEST_BROWSER_EXECUTABLE||undefined,headless:true});const context=await browser.newContext();
 await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 const page=await context.newPage();
 // Route code splitting must not turn indexable pages into client-only shells.
 const htmlContext=await browser.newContext({javaScriptEnabled:false});
 await htmlContext.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 const htmlPage=await htmlContext.newPage();
 await payload.updateGlobal({slug:'site-settings',overrideAccess:true,data:{publicIndexingEnabled:false}});
 assert.equal((await (await fetch(base+'/robots.txt')).text()).includes('Disallow: /\n'),true);
 await payload.updateGlobal({slug:'site-settings',overrideAccess:true,data:{publicIndexingEnabled:true}});
 const robots=await fetch(base+'/robots.txt');assert.match(robots.headers.get('cache-control'),/no-store/);assert.match(await robots.text(),/Sitemap:/);
 for(const path of ['/','/thu-vien','/tin-tuc','/gioi-thieu','/lien-he','/quyen-rieng-tu','/dieu-khoan','/tro-giup','/phap-luat/viet-nam','/chu-de/quoc-tich','/tin/kindergeld-2026','/bai-viet/'+first.slug]){
  const response=await page.goto(base+path);assert.equal(response.status(),200,path);
  assert.ok((await page.title()).length>12,path+' title');
  assert.ok((await page.locator('meta[name="description"]').getAttribute('content')).length>30,path+' description');
  assert.match(await page.locator('link[rel="canonical"]').getAttribute('href'),/^http:\/\/127\.0\.0\.1:3048\//);
  assert.ok(await page.locator('meta[property="og:image"]').getAttribute('content'));
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/(?<!no)index/);
  const schemas=await page.locator('script[type="application/ld+json"]').allTextContents();assert.equal(schemas.length,1,path);for(const schema of schemas)assert.ok(JSON.parse(schema)['@graph'].length);
  assert.equal((await htmlPage.goto(base+path)).status(),200,path+' without JavaScript');
  assert.equal(await htmlPage.locator('h1').count(),1,path+' server-rendered heading');
  assert.ok((await htmlPage.locator('h1').innerText()).trim(),path+' heading is readable without hydration');
  await htmlPage.locator('h1').waitFor({state:'visible'});
  assert.equal(await htmlPage.locator('link[rel="canonical"]').getAttribute('href'),await page.locator('link[rel="canonical"]').getAttribute('href'));
  const htmlSchemas=await htmlPage.locator('script[type="application/ld+json"]').allTextContents();assert.equal(htmlSchemas.length,1,path+' server schema');assert.ok(JSON.parse(htmlSchemas[0])['@graph'].length);
 }
 await page.goto(base+'/phap-luat/viet-nam?trang=2');assert.match(await page.title(),/Trang 2/);assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),base+'/phap-luat/viet-nam?trang=2');
 assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/max-image-preview:large/);
 await page.goto(base+'/tin-tuc?q=synthetic');assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
 for(const path of ['/tai-khoan','/hoi-dap']){await page.goto(base+path);assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);}
 await page.goto(base+'/bai-viet/'+first.slug);assert.equal(await page.locator('link[hreflang="de"]').getAttribute('href'),base+'/bai-viet/'+second.slug);
 const sitemap=await(await fetch(base+'/sitemaps/0.xml')).text();assert.ok(sitemap.includes(first.slug));assert.ok(!sitemap.includes(draft.slug));assert.ok(!sitemap.includes('<loc>'+base+'/thu-vien</loc>'));assert.ok(!sitemap.includes('/hoi-dap'));
 await payload.update({collection:'articles',id:first.id,user:owner,overrideAccess:false,data:{_status:'draft',reviewState:'withdrawn'}});
 assert.equal((await fetch(base+'/bai-viet/'+first.slug)).status,404);
 assert.ok(!(await(await fetch(base+'/sitemaps/0.xml')).text()).includes(first.slug),'Withdrawal immediately removes sitemap URL');
 await page.goto(base+'/bai-viet/'+second.slug);assert.equal(await page.locator('link[hreflang="vi"]').count(),0,'Withdrawn translation is not advertised');
 console.log('Public SEO passed: 12 real page types with and without JavaScript, robots switch/cache, metadata, JSON-LD, canonical aliases, real page-two title/canonical, public preview directives, private/search noindex, translations, draft exclusion and immediate withdrawal.');
}catch(error){console.error(log);throw error;}finally{
 await browser?.close();
 if(server&&server.exitCode===null)await new Promise(resolve=>{const timeout=setTimeout(()=>server.kill('SIGKILL'),5000);server.once('exit',()=>{clearTimeout(timeout);resolve();});server.kill('SIGTERM');});
 await payload.updateGlobal({slug:'site-settings',overrideAccess:true,data:{publicIndexingEnabled:before.publicIndexingEnabled===true}});
 for(const id of ids.reverse())await payload.delete({collection:'articles',id,user:owner,overrideAccess:false});
 if(owner)await payload.delete({collection:'users',id:owner.id,overrideAccess:true});
 await Promise.race([Promise.all([payload.destroy(),pool.end()]),pause(1500)]);
}
process.exit(0);

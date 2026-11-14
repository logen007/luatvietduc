// Delay application scripts for a bounded period and compare the actual SSR
// document with hydration. Never block scripts waiting for rendering itself.
import assert from 'node:assert/strict';
// Theme equality alone misses content pushed around by late controls/data.
// Observe actual unexpected movement as part of the existing explicit audit.
async function observeLayout(page){
 await page.addInitScript(()=>{window.__lvdAuditCLS=0;if(PerformanceObserver.supportedEntryTypes.includes('layout-shift'))new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.__lvdAuditCLS+=entry.value;}).observe({type:'layout-shift',buffered:true});});
}
async function assertStableLayout(page,path){
 const cls=await page.evaluate(()=>window.__lvdAuditCLS);
 assert.ok(cls<=.1,path+' unexpected layout movement: '+cls);
}
export async function testLoadingStability(browser,base,payload,pool,owner){
 assert.equal(new URL(base).hostname,'127.0.0.1');
 const before=await payload.findGlobal({slug:'site-settings',user:owner,overrideAccess:false});
 const routes=['/','/phap-luat/viet-nam','/phap-luat/duc','/chu-de/hon-nhan-gia-dinh','/tin-tuc','/gioi-thieu','/lien-he','/quyen-rieng-tu','/dieu-khoan','/tro-giup','/tai-khoan?mode=signin','/tai-khoan?mode=forgot','/hoi-dap'];
 const article=(await payload.find({collection:'articles',overrideAccess:true,where:{_status:{equals:'published'}},limit:1})).docs[0];if(article?.slug)routes.push('/bai-viet/'+article.slug);
 let checked=0;
 try{
  await payload.updateGlobal({slug:'site-settings',user:owner,overrideAccess:false,data:{tagline:'Synthetic stable footer',siteName:'Luật Việt Đức'}});
  for(const width of [390,1280])for(const language of ['vi','de']){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   await context.addCookies([{name:'lvd-lang',value:language,url:base}]);
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
   try{for(const route of routes){
    const page=await context.newPage(),errors=[];await observeLayout(page);page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/_next/static/**/*.js',async request=>{await new Promise(resolve=>setTimeout(resolve,150));await request.continue();});
    try{
     const serverResponse=await context.request.get(base+route,{timeout:15000});assert.equal(serverResponse.ok(),true,route+' SSR response');const serverHTML=await serverResponse.text();
     await page.goto(base+route,{waitUntil:'commit'});await page.locator('.live-header').waitFor();
     await page.waitForFunction(()=>Array.from(document.querySelectorAll('link[rel=stylesheet]')).every(link=>link.sheet));
     // Inspect the inert server document as well: fast hydration must not hide a wrong default.
     const server=await page.evaluate(html=>{const doc=new DOMParser().parseFromString(html,'text/html');return {language:doc.documentElement.lang,brand:doc.querySelector('.live-brand')?.textContent,nav:doc.querySelector('.live-nav')?.textContent,footer:doc.querySelector('.live-footer-identity>p')?.textContent,h1:doc.querySelector('h1')?.textContent};},serverHTML);
     const capture=()=>page.evaluate(()=>({language:document.documentElement.lang,brand:document.querySelector('.live-brand')?.textContent,nav:document.querySelector('.live-nav')?.textContent,footer:document.querySelector('.live-footer-identity>p')?.textContent,headerBackground:getComputedStyle(document.querySelector('.live-header')).backgroundColor,bodyBackground:getComputedStyle(document.body).backgroundColor,h1:document.querySelector('h1')?.textContent}));
     const initial=await capture();assert.equal(initial.language,language,route+' server language');
     if(initial.footer!==undefined)assert.equal(initial.footer,'Synthetic stable footer',route+' real settings must be in initial HTML');
     if(route.startsWith('/tai-khoan'))assert.ok(!initial.h1,'Account session loading must not announce registration on sign-in/reset');
     await page.waitForLoadState('domcontentloaded');
     await page.waitForFunction(()=>document.documentElement.lang===document.cookie.match(/lvd-lang=(vi|de)/)?.[1]);
     await page.waitForTimeout(350);const final=await capture();await assertStableLayout(page,route);
     for(const field of ['language','brand','nav','footer'])assert.equal(final[field],server[field],route+' '+field+' differs from actual server document');
     for(const field of ['language','brand','nav','footer','headerBackground','bodyBackground'])assert.equal(final[field],initial[field],route+' '+field+' changed during hydration');
     if(!route.startsWith('/tai-khoan')&&initial.h1)assert.equal(final.h1,initial.h1,route+' heading changed during hydration');
     assert.ok(!errors.some(error=>/hydration|didn't match|server rendered/i.test(error)),errors.join('\n'));
     await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(150);const reloaded=await capture();
     for(const field of ['language','brand','nav','footer','bodyBackground'])assert.equal(reloaded[field],final[field],route+' '+field+' changed after F5');
     checked++;
    }finally{await page.close();}
   }console.log('Loading matrix completed: '+width+'px '+language); }finally{await context.close();}
  }
  console.log('Loading stability checks passed: '+checked+' server/hydration page cases, mobile/desktop, VI/DE, delayed scripts, real initial settings and stable shell colors/text.');
 }finally{await payload.updateGlobal({slug:'site-settings',user:owner,overrideAccess:false,data:{siteName:before.siteName,tagline:before.tagline}});}
}

export async function testAdminLoadingStability(context,base){
 let count=0;
 for(const width of [390,1280])for(const path of ['/admin','/admin/collections/articles','/admin/collections/media','/admin/collections/categories','/admin/collections/tags','/admin/knowledge','/admin/inbox','/admin/settings','/admin/settings/connections','/admin/settings/backups','/admin/account']){
  const page=await context.newPage();await observeLayout(page);page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(15000);await page.setViewportSize({width,height:900});
  await page.route('**/_next/static/**/*.js',async route=>{await new Promise(resolve=>setTimeout(resolve,150));await route.continue();});
  try{
   await page.goto(base+path,{waitUntil:'commit'});await page.waitForSelector('html.lvd-admin');
   await page.waitForFunction(()=>Array.from(document.querySelectorAll('link[rel=stylesheet]')).every(link=>link.sheet));
   const capture=()=>page.evaluate(()=>({background:getComputedStyle(document.body).backgroundColor,foreground:getComputedStyle(document.body).color,theme:document.documentElement.getAttribute('data-theme'),css:Array.from(document.querySelectorAll('head link[rel=stylesheet]')).some(link=>link.href.includes('/admin-theme.css'))}));
   const initial=await capture();assert.equal(initial.css,true,path+' admin CSS must be in head before scripts');
   await page.waitForLoadState('domcontentloaded');await page.locator('.lvd-admin-navigation').waitFor();await page.waitForTimeout(150);
   const final=await capture();await assertStableLayout(page,path);assert.deepEqual(final,initial,path+' admin skin changed after hydration');count++;
  }finally{await page.close();}
 }
 console.log('Admin loading stability checks passed: '+count+' native/custom pages on mobile/desktop, CSS available before scripts and stable theme.');
}

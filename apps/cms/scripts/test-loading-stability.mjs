// Hold application scripts to compare the real server-rendered screen with its
// hydrated result. Local synthetic configuration only; no customer data.
import assert from 'node:assert/strict';
export async function testLoadingStability(browser,base,payload,pool,owner){
 assert.equal(new URL(base).hostname,'127.0.0.1');
 const before=await payload.findGlobal({slug:'site-settings',user:owner,overrideAccess:false});
 const routes=['/','/phap-luat/viet-nam','/phap-luat/duc','/chu-de/hon-nhan-gia-dinh','/tin-tuc','/gioi-thieu','/lien-he','/quyen-rieng-tu','/dieu-khoan','/tro-giup','/tai-khoan?mode=signin','/tai-khoan?mode=forgot','/tro-chuyen'];
 const article=(await payload.find({collection:'articles',overrideAccess:true,where:{_status:{equals:'published'}},limit:1})).docs[0];if(article?.slug)routes.push('/bai-viet/'+article.slug);
 let checked=0;
 try{
  await payload.updateGlobal({slug:'site-settings',user:owner,overrideAccess:false,data:{tagline:'Synthetic stable footer',siteName:'Luật Việt Đức'}});
  for(const width of [390,1280])for(const language of ['vi','de']){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   await context.addCookies([{name:'lvd-lang',value:language,url:base}]);
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
   try{for(const route of routes){
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    let release;const gate=new Promise(resolve=>{release=resolve;});
    await page.route('**/_next/static/**/*.js',async request=>{await gate;await request.continue();});
    try{
     await page.goto(base+route,{waitUntil:'commit'});await page.locator('.live-header').waitFor();
     await page.waitForFunction(()=>Array.from(document.querySelectorAll('link[rel=stylesheet]')).every(link=>link.sheet));
     await page.evaluate(()=>document.fonts.ready);
     const capture=()=>page.evaluate(()=>({language:document.documentElement.lang,brand:document.querySelector('.live-brand')?.textContent,nav:document.querySelector('.live-nav')?.textContent,footer:document.querySelector('.live-footer-identity>p')?.textContent,headerBackground:getComputedStyle(document.querySelector('.live-header')).backgroundColor,bodyBackground:getComputedStyle(document.body).backgroundColor,h1:document.querySelector('h1')?.textContent}));
     const initial=await capture();assert.equal(initial.language,language,route+' server language');
     if(initial.footer!==undefined)assert.equal(initial.footer,'Synthetic stable footer',route+' real settings must be in initial HTML');
     if(route.startsWith('/tai-khoan'))assert.ok(!initial.h1,'Account session loading must not announce registration on sign-in/reset');
     release();await page.waitForLoadState('domcontentloaded');
     await page.waitForFunction(()=>document.documentElement.lang===document.cookie.match(/lvd-lang=(vi|de)/)?.[1]);
     await page.waitForTimeout(350);const final=await capture();
     for(const field of ['language','brand','nav','footer','headerBackground','bodyBackground'])assert.equal(final[field],initial[field],route+' '+field+' changed during hydration');
     if(!route.startsWith('/tai-khoan')&&initial.h1)assert.equal(final.h1,initial.h1,route+' heading changed during hydration');
     assert.ok(!errors.some(error=>/hydration|didn't match|server rendered/i.test(error)),errors.join('\n'));
     await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(150);const reloaded=await capture();
     for(const field of ['language','brand','nav','footer','bodyBackground'])assert.equal(reloaded[field],final[field],route+' '+field+' changed after F5');
     checked++;
    }finally{release();await page.close();}
   }}finally{await context.close();}
  }
  console.log('Loading stability checks passed: '+checked+' server/hydration page cases, mobile/desktop, VI/DE, delayed scripts, real initial settings and stable shell colors/text.');
 }finally{await payload.updateGlobal({slug:'site-settings',user:owner,overrideAccess:false,data:{siteName:before.siteName,tagline:before.tagline}});}
}

export async function testAdminLoadingStability(context,base){
 let count=0;
 for(const width of [390,1280])for(const path of ['/admin','/admin/collections/articles','/admin/collections/media','/admin/collections/categories','/admin/collections/tags','/admin/knowledge','/admin/inbox','/admin/settings','/admin/settings/connections','/admin/settings/backups','/admin/account']){
  const page=await context.newPage();await page.setViewportSize({width,height:900});
  let release;const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**/_next/static/**/*.js',async route=>{await gate;await route.continue();});
  try{
   await page.goto(base+path,{waitUntil:'commit'});await page.waitForSelector('html.lvd-admin');
   await page.waitForFunction(()=>Array.from(document.querySelectorAll('link[rel=stylesheet]')).every(link=>link.sheet));
   const capture=()=>page.evaluate(()=>({background:getComputedStyle(document.body).backgroundColor,foreground:getComputedStyle(document.body).color,theme:document.documentElement.getAttribute('data-theme'),css:Array.from(document.querySelectorAll('head link[rel=stylesheet]')).some(link=>link.href.includes('/admin-theme.css'))}));
   const initial=await capture();assert.equal(initial.css,true,path+' admin CSS must be in head before scripts');
   release();await page.waitForLoadState('domcontentloaded');await page.locator('.lvd-admin-navigation').waitFor();await page.waitForTimeout(150);
   const final=await capture();assert.deepEqual(final,initial,path+' admin skin changed after hydration');count++;
  }finally{release();await page.close();}
 }
 console.log('Admin loading stability checks passed: '+count+' native/custom pages on mobile/desktop, CSS available before scripts and stable theme.');
}

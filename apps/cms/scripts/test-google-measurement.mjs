import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as pause} from 'node:timers/promises';
import {getPayload} from 'payload';
import {chromium} from 'playwright';
import config from '../src/payload.config.ts';
import {pool} from '../src/modules/shared/db.ts';
import {saveConnection,markCheck,setEnabled} from '../src/modules/integrations/store.ts';
const db=new URL(process.env.DATABASE_URL||'');assert.equal(db.hostname,'127.0.0.1');assert.equal(db.pathname,'/lvd_test');
const payload=await getPayload({config}),password=crypto.randomUUID(),suffix=crypto.randomUUID(),base='http://127.0.0.1:3047';
let browser,server,log='';const users=[];
try{
 for(const role of ['owner','support'])users.push(await payload.create({collection:'users',overrideAccess:true,context:{bootstrapOwner:true},data:{name:'Measurement test '+role,email:`measurement-${role}-${suffix}@example.invalid`,password,role}}));
 for(const [provider,values] of [['analytics',{measurementId:'G-TEST123456'}],['searchConsole',{verification:'synthetic-verification-123456'}]]){
  await saveConnection(provider,values,0,users[0].id);await markCheck(provider,1,'configured',users[0].id);await setEnabled(provider,1,true,users[0].id);
 }
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3047'],{env:process.env,stdio:['ignore','pipe','pipe']});
 server.stderr.on('data',data=>log=(log+data).slice(-3000));
 for(let i=0;i<100;i++){try{if((await fetch(base+'/health/ready')).ok)break;}catch{}await pause(200);if(i===99)throw Error(log);}
 const html=await (await fetch(base)).text();assert.match(html,/<meta name="google-site-verification" content="synthetic-verification-123456"/);
 browser=await chromium.launch({headless:true,executablePath:process.env.LVD_TEST_BROWSER_EXECUTABLE||undefined});
 const context=await browser.newContext({viewport:{width:1280,height:844}}),requests=[];
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname==='www.googletagmanager.com'){requests.push(url.href);return route.fulfill({contentType:'text/javascript',body:'/* synthetic tracker: no Google request */'});}return url.origin===base?route.continue():route.abort();});
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base);await page.getByRole('button',{name:'Đồng ý',exact:true}).waitFor();assert.equal(requests.length,0,'No Google request before consent');
 await page.getByRole('button',{name:'Đồng ý',exact:true}).click();await page.waitForFunction(()=>document.querySelector('script[data-lvd-measurement]'));
 assert.equal(requests.length,1);assert.ok(requests[0].includes('/gtag/js?id=G-TEST123456'));
 const count=()=>page.evaluate(()=>Array.from(window.dataLayer||[]).filter(item=>item[0]==='event'&&item[1]==='page_view').length);
 assert.equal(await count(),1);
 await page.locator('.live-nav a[href="/tin-tuc"]').click();await page.waitForURL(base+'/tin-tuc');await page.waitForFunction(()=>Array.from(window.dataLayer||[]).filter(item=>item[0]==='event'&&item[1]==='page_view').length===2);
 assert.equal(requests.length,1,'Public route reuses one tracker');
 await page.evaluate(()=>history.pushState({},'', '/tai-khoan?mode=signin&conversation=private-token'));
 await page.waitForURL(/tai-khoan/);await page.waitForLoadState('domcontentloaded');await page.waitForTimeout(350);
 assert.equal(await page.locator('script[data-lvd-measurement]').count(),0);assert.equal(await page.evaluate(()=>typeof window.dataLayer),'undefined');
 await page.goto(base+'/tin-tuc?q=synthetic-sensitive-query');await page.waitForLoadState('domcontentloaded');await page.waitForTimeout(350);assert.equal(await page.locator('script[data-lvd-measurement]').count(),0,'No query tracking');
 await page.goto(base);await page.getByRole('button',{name:'Thống kê',exact:true}).click();await page.getByRole('button',{name:'Từ chối',exact:true}).click();await page.waitForLoadState('domcontentloaded');await page.waitForTimeout(350);assert.equal(await page.locator('script[data-lvd-measurement]').count(),0,'Withdrawal stops tracking');
 await saveConnection('gtm',{containerId:'GTM-TEST1234'},0,users[0].id);await markCheck('gtm',1,'configured',users[0].id);await setEnabled('gtm',1,true,users[0].id);
 await page.goto(base);await page.getByRole('button',{name:'Thống kê',exact:true}).click();await page.getByRole('button',{name:'Đồng ý',exact:true}).click();await page.waitForFunction(()=>document.querySelector('script[data-lvd-measurement]'));
 assert.ok((await page.locator('script[data-lvd-measurement]').getAttribute('src')).includes('/gtm.js?id=GTM-TEST1234'));
 assert.equal(await page.evaluate(()=>Array.from(window.dataLayer||[]).filter(item=>item[0]==='config').length),0,'GTM suppresses direct GA');
 assert.equal(await page.evaluate(()=>window.dataLayer.filter(item=>item.event==='lvd_page_view').length),1);
 for(const user of users){
  const isolated=await browser.newContext();assert.equal((await isolated.request.get(base+'/service/integrations')).status(),403);
  const login=await isolated.request.post(base+'/api/users/login',{headers:{Origin:base,Referer:base+'/admin/login'},data:{email:user.email,password}});assert.equal(login.status(),200);
  const token=(await login.json()).token;assert.ok(token);
  const headers={Origin:base,Referer:base+'/admin/settings/connections',Authorization:'JWT '+token};
  const response=await isolated.request.get(base+'/service/integrations',{headers});assert.equal(response.status(),user.role==='owner'?200:403);
  if(user.role==='owner'){
   const items=(await response.json()).connections;assert.ok(['gtm','analytics','searchConsole'].every(key=>items.some(item=>item.provider===key)));
   await page.context().addCookies((await isolated.cookies()).map(cookie=>({...cookie,secure:false})));await page.setViewportSize({width:390,height:844});await page.goto(base+'/admin/settings/connections');
   for(const title of ['Google Tag Manager','Google Analytics 4','Google Search Console'])await page.getByRole('heading',{name:title,exact:true}).waitFor();
   const invalid=await isolated.request.post(base+'/service/integrations',{headers,data:{action:'save',provider:'gtm',version:2,values:{containerId:'<script>evil</script>'}}});assert.equal(invalid.status(),400);
  }
  await isolated.close();
 }
 assert.deepEqual(errors,[]);console.log('Google measurement: SSR verification, owner/support ACL, ID validation, consent/withdrawal, public SPA views, private/query exclusions, GTM precedence and mobile admin cards passed. External tags mocked.');
}finally{
 await browser?.close();server?.kill('SIGTERM');
 for(const provider of ['gtm','analytics','searchConsole']){await pool.query('DELETE FROM lvd_integration_events WHERE provider=$1',[provider]);await pool.query('DELETE FROM lvd_integrations WHERE provider=$1',[provider]);}
 for(const user of users)await payload.delete({collection:'users',id:user.id,overrideAccess:true});
 await payload.destroy();await pool.end();
}

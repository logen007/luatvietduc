import assert from 'node:assert/strict';

export async function testHeroLoading({context,base}){
 const origin=new URL(base).origin;assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
 for(const width of [390,1280]){
 const page=await context.newPage();let videoRequests=0;const videoPath=width<=760?'/media/legal-hero-stock-mobile-v4.mp4':'/media/legal-hero-stock-v4.mp4';
 try{
  await page.setViewportSize({width,height:844});await page.emulateMedia({reducedMotion:'no-preference'});
  // Hold only the hero observer's first delivery; real React/media code runs.
  await page.addInitScript(()=>{const Native=window.IntersectionObserver;window.IntersectionObserver=class extends Native{constructor(callback,options){super(callback,options);this.callback=callback;}observe(target){if(target.matches('.pm-hero-video'))window.__showHero=()=>this.callback([{target,isIntersecting:true}],this);else super.observe(target);}};});
  await page.route('**/media/*.mp4',route=>{videoRequests++;assert.equal(new URL(route.request().url()).pathname,videoPath);return route.fulfill({contentType:'video/mp4',body:''});});
  await page.goto(origin+'/');await page.waitForFunction(()=>typeof window.__showHero==='function');
  assert.equal(await page.locator('.pm-hero-video').getAttribute('src'),null,'Initial rendering waits for confirmed visibility before loading video');assert.equal(videoRequests,0);
  const response=page.waitForResponse('**'+videoPath);await page.evaluate(()=>window.__showHero());await response;
  assert.equal(await page.locator('.pm-hero-video').getAttribute('src'),videoPath);assert.equal(videoRequests,1);
  console.log('Hero loading browser check passed: '+width+'px, no video request before confirmed visibility');
 }finally{await page.close();}
 }

}

// Call after the signed-in account check, before integration mocks or unsaved
// admin edits. The caller owns the ready local server and authenticated context.
export async function testPublicReview({page,context,base,owner}){
 const origin=new URL(base).origin;
 assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Local browser fixture only');
 assert.equal(page.context(),context);
 const returnUrl=new URL(page.url()).origin===origin?page.url():origin+'/tai-khoan',viewport=page.viewportSize(),name=owner?.name||'Browser test admin';
 const draftKeys=['lvd-staff-draft:public-review','lvd-chat-handoff-v1'],draftValues=['Synthetic persisted staff draft','Synthetic persisted account handoff'];
 let previousDrafts,held;
 const sessionPattern='**/service/me',isSession=response=>response.url()===origin+'/service/me';
 const sessionRoute=async route=>{const gate=held;if(gate)await gate.promise;await route.fallback();};
 const hold=()=>{let release;const promise=new Promise(resolve=>{release=resolve;});return held={promise,release};};
 const release=async()=>{
  const gate=held,response=page.waitForResponse(isSession);held=null;gate.release();await response;
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 };
 const waitOwner=()=>page.waitForFunction(value=>document.querySelector('.live-auth-panel h1')?.textContent.includes(value),name);
 try{
  await page.goto(origin+'/tai-khoan');await waitOwner();
  assert.equal(await page.locator('.live-menu-dialog a[href="/admin"]').count(),1);
  previousDrafts=await page.evaluate(({keys,values})=>keys.map((key,index)=>{const before=sessionStorage.getItem(key);sessionStorage.setItem(key,values[index]);return before;}),{keys:draftKeys,values:draftValues});
  await page.route(sessionPattern,sessionRoute);

  // An ordinary focus check keeps the current account visible while pending.
  hold();let requested=page.waitForRequest(request=>isSession(request));
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await requested;
  assert.ok(await page.locator('.live-account-links').isVisible());
  assert.ok((await page.locator('.live-auth-panel h1').textContent()).includes(name));
  assert.equal(await page.locator('.live-menu-dialog a[href="/admin"]').count(),1);
  await release();await waitOwner();

  // Simulate a persisted browser-history restoration without depending on
  // Chromium's BFCache eligibility for the surrounding test setup.
  hold();requested=page.waitForRequest(request=>isSession(request));
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await requested;
  await page.waitForFunction(value=>!document.querySelector('.live-auth-panel h1')?.textContent.includes(value)&&!document.querySelector('.live-account-links')&&!document.querySelector('.live-menu-dialog a[href="/admin"]'),name);
  assert.ok(await page.locator('.live-auth-panel .live-loading').isVisible(),'Restored account waits for a checked identity');
  assert.deepEqual(await page.evaluate(keys=>keys.map(key=>sessionStorage.getItem(key)),draftKeys),draftValues,'History revalidation preserves draft storage');
  await release();await waitOwner();
  assert.ok(await page.locator('.live-account-links').isVisible());
  assert.equal(await page.locator('.live-menu-dialog a[href="/admin"]').count(),1);

  await page.goto(origin+'/thu-vien?xem=tat-ca');await page.locator('#catalog-query').waitFor();
  await page.locator('#catalog-query').fill('');await page.locator('#catalog-group').selectOption('');await page.locator('#catalog-sort').selectOption('a-z');
  await Promise.all([
   page.waitForURL(url=>url.pathname==='/thu-vien'&&url.searchParams.get('sap-xep')==='a-z'),
   page.locator('.catalog-toolbar button[type="submit"]').click(),
  ]);
  assert.equal(new URL(page.url()).searchParams.get('xem'),'tat-ca','Sorting keeps the explicit all-topics view');
  await page.locator('.question-list .catalog-topic').first().waitFor();

  await page.setViewportSize({width:390,height:844});await page.goto(origin+'/');await page.locator('#pm-title').waitFor();
  await page.evaluate(()=>window.scrollTo(0,0));await page.locator('.pm-home:not(.pm-scrolled)').waitFor();
  const menu=page.locator('.live-menu-button');await menu.waitFor({state:'visible'});
  const menuStyle=()=>menu.evaluate(button=>{
   const header=getComputedStyle(button.closest('.site-header')),style=getComputedStyle(button),icon=button.querySelector('svg'),iconStyle=getComputedStyle(icon),rect=icon.getBoundingClientRect(),box=button.getBoundingClientRect();
   const background=header.backgroundColor.match(/[\d.]+/g).map(Number);
   return {header:header.color,headerBackground:background,heroBackground:getComputedStyle(document.querySelector('.pm-hero')).backgroundColor,color:style.color,stroke:iconStyle.stroke,display:style.display,visibility:style.visibility,opacity:Number(style.opacity),iconWidth:rect.width,iconHeight:rect.height,inViewport:box.left>=0&&box.right<=innerWidth&&box.top>=0&&box.bottom<=innerHeight};
  });
  const checkMenu=(style,color)=>{assert.equal(style.header,color);assert.equal(style.color,color);assert.equal(style.stroke,color);assert.notEqual(style.display,'none');assert.equal(style.visibility,'visible');assert.ok(style.opacity>0&&style.iconWidth>0&&style.iconHeight>0&&style.inViewport,'Menu icon is visible inside the mobile viewport');};
  const heroStyle=await menuStyle();checkMenu(heroStyle,'rgb(255, 255, 255)');
  assert.equal(heroStyle.heroBackground,'rgb(11, 11, 11)');assert.equal(heroStyle.headerBackground[3],0,'The white menu remains visible over the transparent hero header');
  await menu.click();await page.locator('.live-menu-dialog').waitFor({state:'visible'});await page.locator('.live-menu-heading button').click();
  await page.evaluate(()=>window.scrollTo(0,160));
  await page.waitForFunction(()=>document.querySelector('.pm-home.pm-scrolled')&&getComputedStyle(document.querySelector('.site-header')).color==='rgb(11, 11, 11)');
  const scrolledStyle=await menuStyle();checkMenu(scrolledStyle,'rgb(11, 11, 11)');
  assert.ok(scrolledStyle.headerBackground.slice(0,3).every(channel=>channel>=240)&&scrolledStyle.headerBackground[3]>=.9,'The dark menu contrasts with the white scrolled header');
  console.log('Public review browser checks passed: persisted session recovery, retained drafts, library view and mobile menu colors');
 }finally{
  held?.release();held=null;await page.unroute(sessionPattern,sessionRoute);
  if(previousDrafts)await page.evaluate(({keys,values})=>keys.forEach((key,index)=>{if(values[index]===null)sessionStorage.removeItem(key);else sessionStorage.setItem(key,values[index]);}),{keys:draftKeys,values:previousDrafts});
  if(viewport)await page.setViewportSize(viewport);
  await page.goto(returnUrl);
 }
}

// Every contact response is intercepted: no email or provider request occurs.
export async function testContactAndSettings({page,base}){
 const origin=new URL(base).origin;assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
 const returnUrl=page.url();const previousLanguage=await page.evaluate(()=>sessionStorage.getItem('lvd-lang'));
 let invalidSettings=false,siteName='Synthetic known brand';
 const settingsPattern=origin+'/service/settings';
 const settingsRoute=route=>route.fulfill({json:invalidSettings?{navigation:{}}:{siteName,navigation:[],socialLinks:[],maxMessageLength:2000}});
 const contactPattern=origin+'/service/contact';
 let releaseContact;const heldContact=new Promise(resolve=>{releaseContact=resolve;});const requests=[];
 const contactRoute=async route=>{assert.equal(route.request().method(),'POST');requests.push(route.request().postDataJSON());if(requests.length===1)return route.fulfill({json:null});if(requests.length===2)return route.fulfill({status:503,json:{error:'Synthetic contact unavailable'}});await heldContact;return route.fulfill({json:{ok:true}});};
 await page.route(settingsPattern,settingsRoute);await page.route(contactPattern,contactRoute);
 try{
  await page.goto(origin+'/lien-he');await page.waitForTimeout(150);const initialRefresh=page.waitForResponse(settingsPattern);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await initialRefresh;await page.locator('.brand-name').filter({hasText:siteName}).waitFor();
  invalidSettings=true;let settingsReply=page.waitForResponse(settingsPattern);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await settingsReply;await page.waitForTimeout(50);assert.equal(await page.locator('.brand-name').innerText(),siteName,'Invalid settings cannot replace the last working brand/menu');
  invalidSettings=false;siteName='Synthetic recovered brand';settingsReply=page.waitForResponse(settingsPattern);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await settingsReply;await page.locator('.brand-name').filter({hasText:siteName}).waitFor();
  await page.evaluate(()=>{sessionStorage.setItem('lvd-lang','vi');document.cookie='lvd-lang=vi; Path=/; SameSite=Lax';document.dispatchEvent(new Event('lvd:languagechange'));});
  const form=page.locator('.contact-email-form'),name=form.locator('[name=name]'),email=form.locator('[name=email]'),subject=form.locator('[name=subject]'),message=form.locator('[name=message]');
  await name.fill('Synthetic contact visitor');await email.fill('synthetic@example.invalid');await subject.fill('Synthetic subject');await message.fill('Synthetic message that must survive failures');
  await form.locator('button[type=submit]').evaluate(button=>{button.click();button.click();});await form.getByRole('alert').filter({hasText:'Chưa gửi được lời nhắn.'}).waitFor();assert.equal(requests.length,1,'Double submit is gated');assert.equal(await message.inputValue(),'Synthetic message that must survive failures');
  await form.locator('button[type=submit]').click();await form.getByRole('alert').filter({hasText:'Synthetic contact unavailable'}).waitFor();assert.equal(requests.length,2);assert.equal(await subject.inputValue(),'Synthetic subject');assert.equal(requests[0].key,requests[1].key,'An uncertain retry keeps its provider idempotency key');
  await form.locator('button[type=submit]').click();await form.locator('button:disabled').waitFor();await page.waitForFunction(()=>document.querySelector('.contact-email-form')?.getAttribute('aria-busy')==='true');releaseContact();await form.getByRole('status').filter({hasText:'Cảm ơn bạn.'}).waitFor();
  assert.equal(requests.length,3);assert.equal(requests[2].key,requests[0].key);assert.equal(await name.inputValue(),'');assert.equal(await message.inputValue(),'');
  // A saved German locale still shows and retains the supported legacy search.
  await page.evaluate(()=>{sessionStorage.setItem('lvd-lang','de');document.cookie='lvd-lang=de; Path=/; SameSite=Lax';});await page.goto(origin+'/tin-tuc?tinh-huong=uy-quyen&nhom=viec-lam&trang=2');await page.waitForFunction(()=>document.documentElement.lang==='de');assert.equal(await page.locator('#news-query').inputValue(),'ủy quyền');
  const category=page.locator('.press-categories a').first();assert.equal(new URL(await category.getAttribute('href'),origin).searchParams.get('q'),'ủy quyền');
  console.log('Contact/settings browser checks passed: malformed and failed receipts keep fields/key, gated retry, confirmed reset, cached settings recovery and legacy German news search');
 }finally{
  releaseContact();await page.unroute(settingsPattern,settingsRoute);await page.unroute(contactPattern,contactRoute);
  await page.evaluate(value=>{if(value===null)sessionStorage.removeItem('lvd-lang');else sessionStorage.setItem('lvd-lang',value);document.cookie='lvd-lang='+(value||'vi')+'; Path=/; SameSite=Lax';document.dispatchEvent(new Event('lvd:languagechange'));},previousLanguage);
  await page.goto(returnUrl);
 }
}

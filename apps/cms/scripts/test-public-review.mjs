import assert from 'node:assert/strict';

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

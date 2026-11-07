import assert from 'node:assert/strict';
export async function testHomeServices(browser,base){
 const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'no-preference'});
 try{
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  const page=await context.newPage();await page.goto(base);const section=page.locator('.lvd-home-services');await section.scrollIntoViewIfNeeded();
  const active=section.locator('.lvd-service-wheel-row[data-distance="0"]');
  const first=await active.innerText();await page.waitForFunction(initial=>document.querySelector('.lvd-service-wheel-row[data-distance="0"]')?.textContent!==initial,first,{timeout:7000});
  assert.equal(await section.locator('.lvd-service-play').count(),0);
  const tabs=section.getByRole('tab');await tabs.nth(1).click();
  const selected=await active.innerText();await page.waitForFunction(initial=>document.querySelector('.lvd-service-wheel-row[data-distance="0"]')?.textContent!==initial,selected,{timeout:7000});
  const geometry=await section.locator('.lvd-service-tabs').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('header').getBoundingClientRect();return Math.abs(a.x+a.width/2-b.x-b.width/2);});assert.ok(geometry<2,'Tab strip stays horizontally centered');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);const still=await active.innerText();await page.waitForTimeout(3300);assert.equal(await active.innerText(),still);
  console.log('Homepage services passed: automatic rotation with pointer/focused tab, centered compact tabs, no resume button and reduced motion respected.');
 }finally{await context.close();}
}

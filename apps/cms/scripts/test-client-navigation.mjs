import assert from 'node:assert/strict';
// Real local pages with synthetic session/chat transport. No provider requests.
export async function testClientNavigation(browser,base){
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:844}});
  try{
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
   await context.route('**/service/me',route=>route.fulfill({json:{user:null,connections:{}}}));
   await context.route('**/service/conversations',route=>{assert.equal(route.request().method(),'GET');return route.fulfill({json:[]});});
   await context.route('**/service/assistant/questions',route=>route.fulfill({json:{questions:[]}}));
   const page=await context.newPage();page.setDefaultTimeout(12000);
   await page.goto(base);await page.locator('#home-question').waitFor();
   await page.evaluate(()=>{window.__navigationDocument='same-document';});
   const unchanged=async()=>assert.equal(await page.evaluate(()=>window.__navigationDocument),'same-document','Internal pages must retain the current document');
   await page.locator('.lvd-benefit-card[data-scroll-reveal="pending"]').first().waitFor({state:'attached'});
   // Click immediately after the automatic scroll: reveal motion must never
   // move a link's hit area out from under the pointer.
   await page.locator('.lvd-benefit-action').first().click();await page.waitForURL(url=>url.pathname==='/hoi-dap');await unchanged();
   await page.locator('.live-brand').click();await page.waitForURL(base+'/');await page.locator('#home-question').waitFor();await unchanged();
   assert.equal(await page.locator('.live-footer [data-scroll-reveal]').count(),0,'Footer navigation remains outside content reveal animations');
   const go=async href=>{await page.locator(`a[href="${href}"]:visible`).first().click();await page.waitForURL(url=>url.pathname===href);await unchanged();};
   await go('/tin-tuc');await page.locator('#news-query').fill('Kindergeld');await page.locator('#news-query').press('Enter');await page.waitForURL(url=>url.searchParams.get('q')==='Kindergeld');await unchanged();
   await page.locator('.press-categories a').last().click();await page.waitForURL(url=>Boolean(url.searchParams.get('nhom')));await unchanged();assert.equal(await page.locator('#news-query').inputValue(),'Kindergeld');
   await go('/thu-vien');await page.locator('#catalog-query').fill('quốc tịch');await page.locator('#catalog-query').press('Enter');await page.waitForURL(url=>url.searchParams.get('q')==='quốc tịch');await unchanged();
   await go('/phap-luat/duc');assert.equal(await page.locator('#catalog-query').inputValue(),'','A new filter route must not retain an old uncontrolled field value');
   await go('/phap-luat/viet-nam');
   for(const href of ['/gioi-thieu','/lien-he','/quyen-rieng-tu','/dieu-khoan'])await go(href);
   await page.goBack();await page.waitForURL('**/quyen-rieng-tu');await unchanged();
   await page.locator('main a[href="/lien-he"]').first().click();await page.waitForURL('**/lien-he');await unchanged();
   await go('/tai-khoan');await page.locator('.live-auth-switch a').click();await page.getByRole('heading',{name:'Đăng nhập',exact:true}).waitFor();await unchanged();
   await go('/hoi-dap');await page.locator('.chat-compose textarea:not(:disabled)').waitFor();await unchanged();
   await page.locator('.live-brand').click();await page.waitForURL(base+'/');await page.locator('#home-question').waitFor();await unchanged();
  }finally{await context.close();}
 }
 console.log('Public links, search/filter forms, policy links, account modes and chat reuse the document at mobile/desktop widths');
}

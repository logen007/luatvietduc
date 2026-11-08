import assert from 'node:assert/strict';
export async function testChatQualificationBrowser(context,base){
 const page=await context.newPage();let requests=0;
 const expires=new Date(Date.now()+60000).toISOString(),id=crypto.randomUUID();
 const handler=route=>{requests++;const low=new URL(route.request().url()).searchParams.get('view')==='low';return route.fulfill({json:{rows:low?[{id,title:'Thử phân loại',state:'queued',qualification:'low',expires_at:expires,version:1,registered:false,updated_at:new Date().toISOString()}]:[],counts:{all:1,low:1,queue:0},total:low?1:0,totalPages:1,page:1}});};
 await page.route('**/service/inbox?*',handler);
 try{
  await page.goto(base+'/admin/inbox');
  await page.locator('.operator-inbox').waitFor();
  await page.getByRole('combobox',{name:'Lọc hội thoại'}).selectOption('low');
  const timer=page.locator('.operator-expiry');await timer.waitFor();
  const before=await timer.textContent();assert.match(before,/^00:(?:00:\d{2}|01:00)$/);
  await page.waitForTimeout(1200);assert.notEqual(await timer.textContent(),before,'Countdown updates on the existing row');
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Low priority inbox fits mobile');
  assert.ok(requests<=5,'Countdown does not poll every second');
 }finally{await page.close();}
}

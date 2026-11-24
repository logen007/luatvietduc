import assert from 'node:assert/strict';
export async function testProfileBrowser(browser,base,payload,owner){
 const password=crypto.randomUUID(),support=await payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Profile browser specialist',email:'profile-browser-'+crypto.randomUUID()+'@example.invalid',password,role:'support'}});
 let context;
 try{
  const login=await payload.login({collection:'users',data:{email:support.email,password}});
  context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addCookies([{name:'payload-token',value:login.token,url:base}]);
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  const page=await context.newPage();
  const response=await page.goto(base+'/admin/account');assert.equal(response.status(),200);
  await page.getByRole('heading',{name:'Hồ sơ',exact:true}).waitFor();
  assert.equal(await page.locator('.lvd-profile').count(),1);
  assert.equal(await page.locator('.doc-header:visible').count(),0,'Profile has one heading');
  assert.equal(await page.getByLabel('Email',{exact:true}).getAttribute('readonly'),'');
  await page.getByLabel('Tên hiển thị',{exact:true}).fill('Updated specialist profile');
  await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Đã lưu hồ sơ.'}).waitFor();
  await page.reload();await page.getByLabel('Tên hiển thị',{exact:true}).waitFor();assert.equal(await page.getByLabel('Tên hiển thị',{exact:true}).inputValue(),'Updated specialist profile');
  for(const width of [390,1280]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Profile stays within viewport');
   const columns=await page.locator('.lvd-profile-fields').evaluate(element=>getComputedStyle(element).gridTemplateColumns.split(' ').length);assert.equal(columns,width===390?1:2);
  }
  assert.equal((await payload.findByID({collection:'users',id:support.id,overrideAccess:true})).role,'support');
  console.log('Profile browser checks passed: real specialist account view, one heading, name save/reload, read-only email, mobile/desktop layout.');
 }finally{await context?.close();await payload.delete({collection:'users',id:support.id,overrideAccess:true});}
}

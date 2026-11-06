import assert from 'node:assert/strict';
export async function testRolePreviewBrowser(context,base,payload,pool,owner){
 const page=await context.newPage();page.setDefaultTimeout(15000);
 const realCookies=await context.cookies();
 const status=(path,method='GET',data)=>page.evaluate(async({path,method,data})=>(await fetch(path,{method,...(data?{headers:{'content-type':'application/json'},body:JSON.stringify(data)}:{})})).status,{path,method,data});
 try{
  await page.setViewportSize({width:1280,height:900});await page.goto(base+'/admin');
  const control=page.locator('.lvd-admin-sidebar .lvd-role-preview'),switchRole=control.getByRole('button',{name:'Chuyển sang Chuyên viên',exact:true});await switchRole.waitFor();assert.equal(await switchRole.textContent(),'Admin');assert.equal(await control.locator('svg,select').count(),0);
  assert.equal(await control.evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('.lvd-admin-navigation'))&Node.DOCUMENT_POSITION_FOLLOWING)),true,'Role control precedes the main navigation');
  const toggle=page.locator('.template-default__nav-toggler');if(!await page.evaluate(()=>document.querySelector('.template-default')?.classList.contains('template-default--nav-open')))await toggle.click();await toggle.click();
  await page.waitForFunction(()=>!document.querySelector('.template-default')?.classList.contains('template-default--nav-open'));
  const hit=await switchRole.boundingBox();assert.ok(hit&&hit.width>=44&&hit.height>=44,'Collapsed sidebar retains an operable role selector');
  await toggle.click();await switchRole.click();await page.waitForURL(base+'/admin');
  await page.waitForFunction(async()=>{const me=await(await fetch('/service/me',{cache:'no-store'})).json();return me.user?.role==='support'&&me.user.rolePreview==='support';});
  await page.locator('.lvd-admin-navigation').getByRole('link',{name:'Bài viết',exact:true}).waitFor();assert.equal(await page.locator('.lvd-admin-navigation').getByRole('link',{name:'Người dùng',exact:true}).count(),0);assert.equal(await page.locator('.lvd-admin-navigation').getByRole('link',{name:'Cài đặt',exact:true}).count(),0);
  assert.equal(await status('/service/integrations'),403,'Specialist preview cannot read settings service');
  assert.equal(await status('/api/users/'+owner.id,'PATCH',{role:'owner'}),403,'Preview cannot raise its own stored role');
  const native=await page.evaluate(async()=>{const response=await fetch('/api/users/refresh-token',{method:'POST',credentials:'include'});return {status:response.status,body:await response.json()};});assert.equal(native.status,200,'Native refresh: '+JSON.stringify(native.body));assert.equal(native.body.user.role,'support');
  await page.reload();await page.locator('.lvd-admin-navigation').waitFor({state:'attached'});if(!await page.evaluate(()=>document.querySelector('.template-default')?.classList.contains('template-default--nav-open')))await page.locator('.template-default__nav-toggler').click();await page.locator('.lvd-role-preview').getByRole('button',{name:'Chuyển sang Admin',exact:true}).click();await page.waitForURL(base+'/admin');await page.locator('.lvd-admin-navigation').getByRole('link',{name:'Người dùng',exact:true}).waitFor();
  assert.equal(await status('/service/role-preview','POST',{role:'member'}),200);await page.goto(base+'/tai-khoan');
  const me=await page.evaluate(async()=>await(await fetch('/service/me')).json());assert.equal(me.user.role,'member');assert.equal(me.user.rolePreview,'member');
  assert.equal(await status('/service/integrations'),403);
  await page.setViewportSize({width:390,height:844});const restore=page.locator('.live-header .lvd-role-preview').getByRole('button',{name:'Chuyển sang Admin',exact:true});await restore.waitFor();assert.ok(await restore.isVisible());await restore.click();await page.waitForURL(base+'/admin');
  const menu=page.locator('.template-default__nav-toggler');if(!await page.evaluate(()=>document.querySelector('.template-default')?.classList.contains('template-default--nav-open')))await menu.click();await page.locator('.lvd-admin-sidebar').getByRole('button',{name:'Chuyển sang Chuyên viên',exact:true}).waitFor();
  assert.equal((await pool.query('SELECT role FROM users WHERE id=$1',[owner.id])).rows[0].role,'owner');
  console.log('Owner role-switch browser checks passed: prominent sidebar control, 44px collapsed rail, support permissions/native refresh, member return button on mobile and unchanged owner account.');
 }finally{await page.close();await context.clearCookies();await context.addCookies(realCookies);}
}

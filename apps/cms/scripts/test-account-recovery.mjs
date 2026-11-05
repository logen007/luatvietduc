import assert from 'node:assert/strict';

// Exercises real React unmount/remount and the real session Retry button.
// Recovery writes are intercepted; the token belongs only to this fixture.
export async function testAccountRecovery({page,base}){
 const origin=new URL(base).origin;assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
 const token='a'.repeat(40),writes=[];let failSession=false;
 const session=route=>route.fulfill(failSession?{status:503,json:{error:'Synthetic session unavailable'}}:{json:{user:null,connections:{google:false}}});
 const matches=url=>url.origin===origin&&/^\/service\/auth\/(verify|reset)$/.test(url.pathname);
 const recovery=route=>{const request=route.request();assert.equal(request.method(),'POST');const value=request.postDataJSON();assert.equal(value.token,token);writes.push({path:new URL(request.url()).pathname,token:value.token});return route.fulfill({json:{ok:true}});};
 try{
  await page.route('**/service/me',session);await page.route(matches,recovery);
  for(const mode of ['verify','reset']){
   failSession=false;await page.goto(origin+'/tai-khoan?mode='+mode+'&token='+token);
   const heading=mode==='verify'?'Verify your email':'Choose a new password';await page.getByRole('heading',{name:heading,exact:true}).waitFor();
   assert.equal(new URL(page.url()).searchParams.has('token'),false,'Recovery token leaves the URL');
   failSession=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await page.locator('.live-auth-panel').getByRole('alert').waitFor();assert.equal(await page.getByRole('heading',{name:heading,exact:true}).count(),0,'Session error unmounts the guest form');
   failSession=false;await page.locator('.live-auth-panel').getByRole('button',{name:'Thử lại',exact:true}).click();
   await page.getByRole('heading',{name:heading,exact:true}).waitFor();assert.equal(await page.getByText('This link is invalid or has expired.',{exact:true}).count(),0);
   if(mode==='reset')await page.getByLabel('Password',{exact:true}).fill('Synthetic-new-password-123');
   await page.getByRole('button',{name:mode==='verify'?'Verify email':'Save new password',exact:true}).click();await page.getByRole('heading',{name:'Sign in',exact:true}).waitFor();
   assert.equal(writes.at(-1)?.path,'/service/auth/'+mode);assert.equal(writes.at(-1)?.token,token);
  }
  console.log('Account recovery browser checks passed: verify/reset links survive session failure and Retry without storing tokens');
 }finally{
  await page.unroute(matches,recovery);await page.unroute('**/service/me',session);await page.goto(origin+'/tai-khoan');
 }
}

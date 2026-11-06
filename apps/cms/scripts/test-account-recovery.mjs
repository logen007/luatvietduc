import assert from 'node:assert/strict';

// Exercises real React unmount/remount and the real session Retry button.
// Recovery writes are intercepted; the token belongs only to this fixture.
export async function testAccountRecovery({page,base}){
 const origin=new URL(base).origin;assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
 const token='a'.repeat(40),writes=[];let failSession=false,holdRecovery=false,releaseRecovery,capturedRecovery;
 const session=route=>route.fulfill(failSession?{status:503,json:{error:'Synthetic session unavailable'}}:{json:{user:null,connections:{google:false}}});
 const matches=url=>url.origin===origin&&/^\/service\/auth\/(verify|reset)$/.test(url.pathname);
 const recovery=async route=>{const request=route.request();assert.equal(request.method(),'POST');const value=request.postDataJSON();assert.equal(value.token,token);const path=new URL(request.url()).pathname;writes.push({path,token:value.token});const held=holdRecovery;if(held){capturedRecovery?.();await new Promise(resolve=>{releaseRecovery=resolve;});}try{await route.fulfill({json:{ok:true,state:path.endsWith('/verify')?'verified':'password-reset'}});}catch(error){if(!held)throw error;}};
 try{
  await page.route('**/service/me',session);await page.route(matches,recovery);
  for(const mode of ['verify','reset']){
   failSession=false;await page.goto(origin+'/tai-khoan?mode='+mode+'&token='+token);
   const heading=mode==='verify'?'Xác nhận email':'Đặt mật khẩu mới';await page.getByRole('heading',{name:heading,exact:true}).waitFor();
   assert.equal(new URL(page.url()).searchParams.has('token'),false,'Recovery token leaves the URL');
   failSession=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await page.locator('.live-auth-panel').getByRole('alert').waitFor();assert.equal(await page.getByRole('heading',{name:heading,exact:true}).count(),0,'Session error unmounts the guest form');
   failSession=false;await page.locator('.live-auth-panel').getByRole('button',{name:'Thử lại',exact:true}).click();
   await page.getByRole('heading',{name:heading,exact:true}).waitFor();assert.equal(await page.getByText('Liên kết không hợp lệ hoặc đã hết hạn.',{exact:true}).count(),0);
   if(mode==='reset')await page.getByLabel('Mật khẩu',{exact:true}).fill('Synthetic-new-password-123');
   await page.getByRole('button',{name:mode==='verify'?'Xác nhận email':'Lưu mật khẩu mới',exact:true}).click();await page.getByRole('heading',{name:'Đăng nhập',exact:true}).waitFor();
   assert.equal(writes.at(-1)?.path,'/service/auth/'+mode);assert.equal(writes.at(-1)?.token,token);
  }
  // A pending response belongs to the form that sent it. Session failure and
  // Retry replace that form; the old response must not retire the new draft.
  const captured=new Promise(resolve=>{capturedRecovery=resolve;});holdRecovery=true;
  await page.goto(origin+'/tai-khoan?mode=reset&token='+token);await page.getByRole('heading',{name:'Đặt mật khẩu mới',exact:true}).waitFor();
  await page.getByLabel('Mật khẩu',{exact:true}).fill('Synthetic-pending-password-123');await page.getByRole('button',{name:'Lưu mật khẩu mới',exact:true}).click();await captured;
  failSession=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.locator('.live-auth-panel').getByRole('alert').waitFor();
  failSession=false;await page.locator('.live-auth-panel').getByRole('button',{name:'Thử lại',exact:true}).click();await page.getByRole('heading',{name:'Đặt mật khẩu mới',exact:true}).waitFor();
  const newerDraft='Synthetic-newer-draft-456';await page.getByLabel('Mật khẩu',{exact:true}).fill(newerDraft);holdRecovery=false;releaseRecovery();await page.waitForTimeout(100);
  assert.equal(new URL(page.url()).searchParams.get('mode'),'reset','The old request cannot change a replacement recovery form URL');assert.equal(await page.getByLabel('Mật khẩu',{exact:true}).inputValue(),newerDraft);
  await page.getByRole('button',{name:'Lưu mật khẩu mới',exact:true}).click();await page.getByRole('heading',{name:'Đăng nhập',exact:true}).waitFor();assert.equal(writes.at(-1)?.token,token);
  console.log('Account recovery browser checks passed: verify/reset survive session Retry; a stale pending response cannot clear replacement recovery or draft');
 }finally{
  releaseRecovery?.();await page.unroute(matches,recovery);await page.unroute('**/service/me',session);await page.goto(origin+'/tai-khoan');
 }
}

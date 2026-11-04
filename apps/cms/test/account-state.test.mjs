import test from 'node:test';
import assert from 'node:assert/strict';
import {accountView,createSessionStore} from '../src/modules/shared/account-state.mjs';
test('account controls cover all states, roles and both languages without false login labels',()=>{
 for(const language of ['vi','de']){
  const login=language==='vi'?'Đăng nhập':'Anmelden',account=language==='vi'?'Tài khoản':'Mein Konto';
  for(const status of ['loading','error']){const view=accountView({status,user:null},language);assert.equal(view.label,account);assert.equal(view.management,null);}
  assert.equal(accountView({status:'ready',user:null},language).label,login);
  for(const role of ['owner','support','member','unknown']){const view=accountView({status:'ready',user:{id:1,role}},language);assert.equal(view.label,account);assert.equal(view.href,'/tai-khoan');assert.equal(view.management?.href,role==='owner'?'/admin':role==='support'?'/admin/inbox':undefined);}
 }
});
test('one in-flight request supplies all shell consumers and refreshes after expiry',async()=>{
 let count=0,time=0;const store=createSessionStore(async()=>{count++;return{user:{id:1,role:'member'}};},()=>time);
 await Promise.all([store.refresh(),store.refresh(),store.refresh()]);assert.equal(count,1);
 await store.refresh();assert.equal(count,1);time=16000;await store.refresh();assert.equal(count,2);
});
test('logout invalidation prevents an older authenticated response from restoring the user',async()=>{
 let resolve;const store=createSessionStore(()=>new Promise(r=>{resolve=r;}));const first=store.refresh();await Promise.resolve();store.invalidate();resolve({user:{id:1,role:'owner'}});await first;
 assert.equal(store.getSnapshot().status,'loading');assert.equal(store.getSnapshot().user,null);
});
test('expired sessions and network failures clear staff links rather than pretending login succeeded',async()=>{
 let next={user:{id:1,role:'owner'}};const store=createSessionStore(async()=>{if(next instanceof Error)throw next;return next;});
 await store.refresh();assert.ok(accountView(store.getSnapshot()).management);
 next={user:null};await store.refresh(true);assert.equal(accountView(store.getSnapshot()).label,'Đăng nhập');assert.equal(accountView(store.getSnapshot()).management,null);
 next=new Error('offline');await assert.rejects(store.refresh(true));assert.equal(accountView(store.getSnapshot()).label,'Tài khoản');assert.equal(store.getSnapshot().status,'error');
});

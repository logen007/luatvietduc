import test from 'node:test';
import assert from 'node:assert/strict';
import {accountView,createSessionStore} from '../src/modules/shared/account-state.mjs';
test('account controls cover all states, roles and both languages without false login labels',()=>{
 for(const language of ['vi','de']){
  const login=language==='vi'?'Đăng nhập':'Anmelden',account=language==='vi'?'Tài khoản':'Mein Konto';
  for(const status of ['loading','error']){const view=accountView({status,user:null},language);assert.equal(view.label,account);assert.equal(view.management,null);}
  assert.equal(accountView({status:'ready',user:null},language).label,login);assert.equal(accountView({status:'ready',user:null},language).href,'/tai-khoan?mode=signin');
  for(const role of ['owner','support','member','unknown']){const view=accountView({status:'ready',user:{id:1,role}},language);assert.equal(view.label,account);assert.equal(view.href,'/tai-khoan');assert.equal(view.management?.href,role==='owner'?'/admin':role==='support'?'/admin/inbox':undefined);}
 }
});
test('one in-flight request supplies all shell consumers and refreshes after expiry',async()=>{
 let count=0,time=0;const store=createSessionStore(async()=>{count++;return{user:{id:1,role:'member'}};},()=>time);
 await Promise.all([store.refresh(),store.refresh(),store.refresh()]);assert.equal(count,1);
 await store.refresh();assert.equal(count,1);time=16000;await store.refresh();assert.equal(count,2);
});
test('focus, visibility and explicit refresh share one in-flight session request',async()=>{
 let calls=0,release;const store=createSessionStore(()=>{calls++;return new Promise(resolve=>{release=resolve;});});
 const requests=[store.refresh(true),store.refresh(true),store.refresh()];
 assert.equal(requests[0],requests[1]);assert.equal(requests[1],requests[2]);
 await Promise.resolve();assert.equal(calls,1);release({user:null});await Promise.all(requests);
});
test('session revisions change for account or access changes, not display-name refreshes',async()=>{
 let user={id:1,role:'support',jurisdictions:['VN','DE'],name:'Original'};
 const store=createSessionStore(async()=>({user}));await store.refresh();
 const original=store.getSnapshot().revision;
 user={...user,name:'Updated',jurisdictions:['DE','VN']};await store.refresh(true);
 assert.equal(store.getSnapshot().revision,original);
 for(const update of [{role:'member'},{id:2},{jurisdictions:['VN']}]){
  const ticket=store.getSnapshot().revision;user={...user,...update};await store.refresh(true);
  assert.ok(store.getSnapshot().revision>ticket);assert.equal(store.isCurrent(ticket),false);
 }
});
test('late private results cannot commit after logout or a failed session check, even for the same returning account',async()=>{
 let fail=false;const store=createSessionStore(async()=>{if(fail)throw new Error('offline');return {user:{id:1,role:'support'}};});
 await store.refresh();const beforeLogout=store.getSnapshot().revision;
 let release;const result=new Promise(resolve=>{release=resolve;});let privateView=null;
 const delivery=result.then(value=>{if(store.isCurrent(beforeLogout))privateView=value;});
 store.invalidate();assert.equal(store.isCurrent(beforeLogout),false);
 await store.refresh();assert.equal(store.getSnapshot().user.id,1);
 release({messages:['private reply']});await delivery;assert.equal(privateView,null);
 const beforeFailure=store.getSnapshot().revision;fail=true;await assert.rejects(store.refresh(true));
 assert.equal(store.isCurrent(beforeFailure),false);assert.equal(store.getSnapshot().data,null);
 fail=false;await store.refresh();assert.equal(store.isCurrent(beforeFailure),false);
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

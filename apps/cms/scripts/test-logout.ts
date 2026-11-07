import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool,hash} from '../src/modules/shared/db';
import {GET as serviceGet,POST as publicPost} from '../src/app/service/[...path]/route';
import {GET as nativeGet,POST as nativePost} from '../src/app/(payload)/api/[...slug]/route';

export async function testLogout(payload:Payload,owner:User){
 const db=new URL(process.env.DATABASE_URL||'');if(db.pathname!=='/lvd_test'||!['127.0.0.1','localhost'].includes(db.hostname))throw new Error('Isolated logout checks only');
 const origin=process.env.APP_URL||'http://localhost:3000',password=randomUUID();
 const staff=await payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Synthetic logout staff',email:randomUUID()+'@example.invalid',password,role:'support',jurisdictions:['VN','DE']}});
 const authenticate=(cookie:string)=>payload.auth({headers:new Headers({cookie,origin})});
 const googleToken=async()=>{const token=randomBytes(32).toString('base64url');await pool.query("INSERT INTO lvd_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 day')",[await hash(token),staff.id]);return token;};
 const login=()=>payload.login({collection:'users',data:{email:staff.email,password}});
 try{
  for(const lane of ['public','admin'])for(const strategy of ['google','password','both']){
   const google=await googleToken(),local=await login(),otherGoogle=await googleToken(),otherLocal=await login();
   const cookie=[...(strategy!=='password'?['lvd-session='+google]:[]),...(strategy!=='google'?['payload-token='+local.token]:[])].join('; ');
   assert.equal((await authenticate(cookie)).user?.id,staff.id);
   const call=(site=origin)=>{
    const req=new Request(origin+(lane==='public'?'/service/logout':'/api/users/logout'),{method:'POST',headers:{origin:site,cookie,'content-type':'application/json'},body:'{}'});
    return lane==='public'?publicPost(req,{params:Promise.resolve({path:['logout']})}):nativePost(req,{params:Promise.resolve({slug:['users','logout']})});
   };
   assert.equal((await call('https://attacker.invalid')).status,403);assert.equal((await authenticate(cookie)).user?.id,staff.id,'Cross-site logout cannot revoke a session');
   const response=await call();assert.equal(response.status,200);assert.match(response.headers.get('cache-control')||'',/no-store/);
   for(const name of ['lvd-session','payload-token','lvd-oauth'])assert.match(response.headers.get('set-cookie')||'',new RegExp(name+'=;.*Max-Age=0','i'));
   assert.equal((await authenticate(cookie)).user,null,'Replaying the old credentials must fail at the server, not just clear the UI');
   if(strategy!=='password')assert.equal((await authenticate('lvd-session='+google)).user,null);
   if(strategy!=='google')assert.equal((await authenticate('payload-token='+local.token)).user,null);
   assert.equal((await authenticate('lvd-session='+otherGoogle)).user?.id,staff.id,'Other devices keep their Google session');
   assert.equal((await authenticate('payload-token='+otherLocal.token)).user?.id,staff.id,'Other devices keep their local session');
   const me=await serviceGet(new Request(origin+'/service/me',{headers:{cookie,origin}}),{params:Promise.resolve({path:['me']})});assert.equal((await me.json()).user,null);
   const inbox=await serviceGet(new Request(origin+'/service/inbox',{headers:{cookie,origin}}),{params:Promise.resolve({path:['inbox']})});assert.equal(inbox.status,403);
   const users=await nativeGet(new Request(origin+'/api/users',{headers:{cookie,origin}}),{params:Promise.resolve({slug:['users']})});assert.equal(users.status,403);
   assert.equal((await call()).status,200,'Logout is idempotent');
  }
  console.log('Logout checks passed: public/admin, Google/password/both, old credential replay, API denial, CSRF, repeat logout and other-device isolation.');
 }finally{await payload.delete({collection:'users',id:staff.id,user:owner,overrideAccess:false});}
}

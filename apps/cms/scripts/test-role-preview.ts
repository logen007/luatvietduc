import assert from 'node:assert/strict';
import {createLocalReq,meOperation,refreshOperation,type Payload} from 'payload';
import type {User} from '../src/payload-types';
import {rolePreviewRequest} from '../src/modules/identity/role-preview';
import {ROLE_PREVIEW_COOKIE,signRolePreview} from '../src/modules/identity/role-preview-token';
import {createAppSession} from '../src/modules/identity/app-sessions';
import {logoutRequest} from '../src/modules/identity/logout';
import {pool} from '../src/modules/shared/db';
export async function testRolePreview(payload:Payload,owner:User){
 const db=new URL(process.env.DATABASE_URL||'');assert.ok(['localhost','127.0.0.1'].includes(db.hostname)&&db.pathname==='/lvd_test');
 const origin=process.env.APP_URL||'http://localhost:3000',password=crypto.randomUUID(),ids:number[]=[];
 const create=async(role:'owner'|'support'|'member')=>{const user=await payload.create({collection:'users',user:owner,overrideAccess:false,context:{bootstrapOwner:role==='owner'},data:{name:'Synthetic preview '+role,email:crypto.randomUUID()+'@example.invalid',password,role}});ids.push(user.id);return user;};
 const login=async(user:User)=>{const result=await payload.login({collection:'users',data:{email:user.email,password}});assert.ok(result.token);return new Headers({origin,cookie:'payload-token='+result.token});};
 const request=(headers:Headers,role?:string)=>rolePreviewRequest(new Request(origin+'/service/role-preview',{method:role?'POST':'GET',headers:new Headers({...Object.fromEntries(headers),...(role?{'content-type':'application/json'}:{})}),...(role?{body:JSON.stringify({role})}:{})}),payload);
 const switched=async(headers:Headers,role:string)=>{const response=await request(headers,role);assert.equal(response.status,200);const cookie=response.headers.get('set-cookie')!.split(';')[0],next=new Headers(headers);next.set('cookie',(headers.get('cookie')||'').split(';').filter(part=>!part.trim().startsWith(ROLE_PREVIEW_COOKIE+'=')).join(';')+'; '+cookie);return next;};
 const principal=async(headers:Headers)=>(await payload.auth({headers})).user;
 const req=async(headers:Headers)=>createLocalReq({req:{headers,user:await principal(headers),url:origin+'/api/users/refresh-token'}},payload);
 const refresh=async(headers:Headers)=>refreshOperation({collection:payload.collections.users,req:await req(headers)});
 const current=(id:number)=>payload.findByID({collection:'users',id,overrideAccess:true,showHiddenFields:true});
 const originalFindOne=payload.db.findOne;
 try{
  const subject=await create('owner'),native=await login(subject),google=new Headers({origin,cookie:'lvd-session='+await createAppSession(subject.id)});
  for(const real of [native,google]){
   for(const role of ['support','member']){
    const headers=await switched(real,role),effective=await principal(headers);assert.equal(effective?.role,role);assert.equal((effective as any).rolePreview,role);assert.equal((await current(subject.id)).role,'owner');
    const status=await request(headers);assert.equal((await status.json()).role,role);
    await assert.rejects(()=>payload.updateGlobal({slug:'site-settings',user:effective,overrideAccess:false,data:{siteName:'Denied preview settings write'}}));
    await assert.rejects(()=>payload.update({collection:'users',id:subject.id,user:effective,overrideAccess:false,data:{role:'owner'}}));
    if(role==='support'){
     const article=await payload.create({collection:'articles',user:effective,overrideAccess:false,draft:true,data:{title:'Synthetic preview article '+crypto.randomUUID(),body:'Synthetic content created while previewing specialist permissions.',_status:'draft'}});await payload.delete({collection:'articles',id:article.id,user:effective,overrideAccess:false});
    }else await assert.rejects(()=>payload.create({collection:'articles',user:effective,overrideAccess:false,draft:true,data:{title:'Denied user article',body:'Synthetic denied content',_status:'draft'}}));
    const me=await meOperation({collection:payload.collections.users,req:await req(headers)});assert.equal(me.user?.role,role,'Native me cannot report the real owner role');
    if(real===native){
     const rotated=await refresh(headers);assert.equal(rotated.user?.role,role,'Native refresh cannot report the real owner role');assert.ok(rotated.refreshedToken);
     const after=new Headers(headers);after.set('cookie',headers.get('cookie')!.replace(/payload-token=[^;]+/,'payload-token='+rotated.refreshedToken));assert.equal((await principal(after))?.role,role,'Preview survives refresh SID rotation');
    }
    const restored=await switched(headers,'owner');assert.equal((await principal(restored))?.role,'owner');assert.equal((await current(subject.id)).role,'owner');
   }
  }
  const other=await create('owner'),otherSession=await login(other),ownerPreview=await switched(native,'support');
  const stolen=new Headers(otherSession);stolen.set('cookie',otherSession.get('cookie')+'; '+ROLE_PREVIEW_COOKIE+'='+ownerPreview.get('cookie')!.split(ROLE_PREVIEW_COOKIE+'=')[1].split(';')[0]);assert.equal((await principal(stolen))?.role,'owner','Another owner session cannot inherit a preview');
  for(const role of ['support','member'] as const){const user=await create(role),headers=await login(user);assert.equal((await request(headers,'owner')).status,403);assert.equal((await request(headers)).status,403);const forged=new Headers(headers);forged.set('cookie',headers.get('cookie')+'; '+ROLE_PREVIEW_COOKIE+'='+signRolePreview(subject.id,'support',native));assert.equal((await principal(forged))?.role,role);}
  const cross=new Headers(native);cross.set('origin','https://cross-origin.example.invalid');assert.equal((await request(cross,'support')).status,403);assert.equal((await request(native,'reviewer')).status,400);
  const expired=new Headers(native);expired.set('cookie',native.get('cookie')+'; '+ROLE_PREVIEW_COOKIE+'='+signRolePreview(subject.id,'member',native,process.env.PAYLOAD_SECRET,Date.now()-901000));assert.equal((await principal(expired))?.role,'owner');
  const logoutPreview=await switched(google,'member'),out=await logoutRequest(new Request(origin+'/service/logout',{method:'POST',headers:logoutPreview}),payload);assert.equal(out.status,200);assert.ok(out.headers.get('set-cookie')?.includes(ROLE_PREVIEW_COOKIE+'='));assert.equal(await principal(logoutPreview),null);
  // Refresh must serialize with account writes/logout in either order. Pause
  // an actual transactional read after its row lock, not a synthetic adapter.
  async function race(change:'role'|'logout',refreshFirst:boolean){
   const user=await create('support'),headers=await login(user),firstReq=await req(headers);
   let reached!:()=>void,release!:()=>void,used=false;
   const waiting=new Promise<void>(resolve=>{reached=resolve;}),gate=new Promise<void>(resolve=>{release=resolve;});
   payload.db.findOne=(async function(this:Payload['db'],args:any){const found=await originalFindOne.call(this,args);if(!used&&args.collection==='users'&&args.req?.transactionID&&found?.id===user.id){used=true;reached();await gate;}return found;}) as typeof originalFindOne;
   const mutation=()=>change==='role'?payload.update({collection:'users',id:user.id,user:owner,overrideAccess:false,data:{role:'member'}}):logoutRequest(new Request(origin+'/service/logout',{method:'POST',headers}),payload);
   const renewal=()=>refreshOperation({collection:payload.collections.users,req:firstReq});
   let a:Promise<unknown>|undefined,b:Promise<unknown>|undefined;
   try{
    a=(refreshFirst?renewal:mutation)();await Promise.race([waiting,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Refresh race read not reached')),5000))]);
    b=(refreshFirst?mutation:renewal)();let completed=false;void b.then(()=>{completed=true;},()=>{completed=true;});await new Promise(resolve=>setTimeout(resolve,80));assert.equal(completed,false,'Refresh and lifecycle writes use the same row lock');release();
    const outcomes=await Promise.allSettled([a,b]);assert.equal(outcomes[0].status,'fulfilled');if(refreshFirst)assert.equal(outcomes[1].status,'fulfilled');else assert.equal(outcomes[1].status,'rejected','A stale principal/SID cannot refresh after revocation');
    if(change==='role')assert.equal((await current(user.id)).role,'member');else assert.equal(await principal(headers),null);
   }finally{release();payload.db.findOne=originalFindOne;await Promise.allSettled([a,b].filter(Boolean) as Promise<unknown>[]);}
  }
  for(const change of ['role','logout'] as const)for(const first of [true,false])await race(change,first);
  console.log('Role preview checks passed: owner-only native/Google support/member previews, native me/refresh, real role unchanged, ACL enforcement, restore, expiry, forgery/CSRF denial, logout and refresh/lifecycle races in both orders.');
 }finally{payload.db.findOne=originalFindOne;for(const id of ids)await payload.delete({collection:'users',id,overrideAccess:true});}
}

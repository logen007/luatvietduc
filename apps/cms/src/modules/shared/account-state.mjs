// One presentation contract for the public shell, React header and account page.
// These links are hints only; authorization remains on the server.
export function accountView(session,language='vi'){
 const de=language==='de',ready=session?.status==='ready',user=ready?session.user:null;
 const management=user?.role==='owner'?{href:'/admin',label:de?'Verwaltung':'Quản trị'}:user?.role==='support'?{href:'/admin/inbox',label:de?'Postfach':'Hộp thư'}:null;
 return {href:'/tai-khoan',label:ready&&!user?(de?'Anmelden':'Đăng nhập'):(de?'Mein Konto':'Tài khoản'),management};
}
export function createSessionStore(request,now=Date.now){
 let state={status:'loading',user:null,data:null},pending=null,generation=0,expires=0;
 const listeners=new Set(),notify=()=>listeners.forEach(fn=>fn());
 function refresh(force=false){
  if(pending&&!force)return pending;
  if(!force&&state.status==='ready'&&now()<expires)return Promise.resolve(state.data);
  const current=++generation;
  const task=Promise.resolve().then(request).then(data=>{
   if(!data||!Object.hasOwn(data,'user'))throw new Error('Invalid session response');
   if(current===generation){state={status:'ready',user:data.user||null,data};expires=now()+15000;notify();}
   return data;
  }).catch(error=>{
   if(current===generation){state={status:'error',user:null,data:null};expires=0;notify();}
   throw error;
  }).finally(()=>{if(current===generation)pending=null;});
  pending=task;return task;
 }
 function invalidate(){generation++;pending=null;expires=0;state={status:'loading',user:null,data:null};notify();}
 return {getSnapshot:()=>state,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},refresh,invalidate};
}

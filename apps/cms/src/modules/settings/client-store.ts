// Public configuration cache. Unlike sessions it keeps the last good public
// value during a network failure; it never stores account or conversation data.
export function createPublicSettingsStore<T>(request:()=>Promise<T>,now=Date.now){
 type Snapshot={data:T|null;error:Error|null;loading:boolean};
 let state:Snapshot={data:null,error:null,loading:false},pending:Promise<T>|null=null,expires=0;
 const listeners=new Set<()=>void>(),notify=()=>listeners.forEach(listener=>listener());
 function load(force=false):Promise<T>{
  if(pending)return pending;
  if(!force&&state.data!==null&&now()<expires)return Promise.resolve(state.data);
  state={...state,loading:true};
  pending=Promise.resolve().then(request).then(data=>{
   state={data,error:null,loading:false};expires=now()+30000;notify();return data;
  }).catch(error=>{
   state={...state,error:error instanceof Error?error:new Error('Settings unavailable'),loading:false};expires=0;notify();throw error;
  }).finally(()=>{pending=null;});
  notify();
  return pending;
 }
 return {load,getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};}};
}

export function createLatestRequest<T>(){
 let selected:string|undefined,revision=0,pending:{revision:number;task:Promise<Result<T>>}|undefined;
 type Result<V>={ok:true;value:V;current:()=>boolean}|{ok:false;error:unknown;current:()=>boolean};
 function select(key:string){if(selected!==key){selected=key;revision++;pending=undefined;}}
 function clear(key:string){if(selected===key){selected=undefined;revision++;pending=undefined;}}
 function load(key:string,request:()=>Promise<T>,force=false):Promise<Result<T>>{
  if(selected!==key)return Promise.resolve({ok:false,error:null,current:()=>false});
  if(pending&&!force)return pending.task;
  const ticket=++revision,current=()=>selected===key&&revision===ticket;
  const task=Promise.resolve().then(request).then<Result<T>,Result<T>>(
   value=>({ok:true,value,current}),error=>({ok:false,error,current}),
  ).finally(()=>{if(pending?.revision===ticket)pending=undefined;});
  pending={revision:ticket,task};return task;
 }
 return {select,clear,load};
}

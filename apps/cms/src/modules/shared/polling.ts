// One in-flight request per loop; hidden tabs sleep and refresh when focused again.
export function visiblePoll(task:()=>Promise<unknown>,interval:number,{initial=true}={}){
 let stopped=false,pending=false,timer:ReturnType<typeof setTimeout>|undefined;
 const schedule=()=>{clearTimeout(timer);if(!stopped&&!document.hidden)timer=setTimeout(tick,interval);};
 const tick=async()=>{
  if(stopped||pending||document.hidden)return;
  pending=true;
  try{await task();}catch{/* The caller owns its error state. */}
  finally{pending=false;schedule();}
 };
 const wake=()=>{clearTimeout(timer);if(!document.hidden)void tick();};
 document.addEventListener('visibilitychange',wake);window.addEventListener('focus',wake);
 if(initial)void tick();else schedule();
 return ()=>{stopped=true;clearTimeout(timer);document.removeEventListener('visibilitychange',wake);window.removeEventListener('focus',wake);};
}

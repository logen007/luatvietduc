// Public release metadata only. No customer session, provider key or deployment control.
const branch='feat/platform-cms-bootstrap',repository='logen007/luatvietduc';
const versionPattern=/^\d{2}\.\d{2}\.\d{2}$/;
export type ReleaseState={status:'idle'|'unknown'}|{status:'updating';version:string};
type PendingRelease={version:string;status:string;conclusion:string|null;updatedAt:number}|null;
export function updateState(active:unknown,pending:PendingRelease,now=Date.now()):ReleaseState{
 const current=(active as {version?:unknown})?.version;
 if(typeof current!=='string'||!versionPattern.test(current))return {status:'unknown'};
 if(!pending)return {status:'idle'};
 if(!versionPattern.test(pending.version))return {status:'unknown'};
 const newer=pending.version.split('.').map(Number).reduce((n,part)=>n*100+part,0)>current.split('.').map(Number).reduce((n,part)=>n*100+part,0);
 if(!newer)return {status:'idle'};
 if(pending.status==='completed'&&pending.conclusion!=='success')return {status:'idle'};
 // A successful check is preparation, not proof of activation. Stop the spinner
 // if that evidence goes stale rather than reporting an endless active update.
 if(!Number.isFinite(pending.updatedAt)||now-pending.updatedAt>(pending.status==='completed'?5:15)*60_000||pending.updatedAt>now+60_000)return {status:'unknown'};
 return {status:'updating',version:pending.version};
}
async function publicJSON(url:string,request:typeof fetch){
 const response=await request(url,{cache:'no-store',credentials:'omit',redirect:'error',headers:{Accept:'application/json','User-Agent':'LuatVietDuc-release-notice'},signal:AbortSignal.timeout(3000)});
 if(!response.ok)throw new Error('Release metadata unavailable');
 const text=await response.text();if(text.length>100_000)throw new Error('Release metadata invalid');return JSON.parse(text);
}
export async function pendingRelease(request:typeof fetch=fetch):Promise<PendingRelease>{
 const listing=await publicJSON('https://api.github.com/repos/'+repository+'/actions/workflows/platform-foundation.yml/runs?branch='+branch+'&event=push&per_page=1',request);
 const run=listing.workflow_runs?.[0];if(!run)return null;
 if(run.head_branch!==branch||run.event!=='push'||run.path!=='.github/workflows/platform-foundation.yml'||run.head_repository?.full_name!==repository||!/^[a-f0-9]{40}$/.test(run.head_sha)||!['queued','in_progress','waiting','pending','requested','completed'].includes(run.status))throw new Error('Release metadata invalid');
 if(run.status==='completed'&&run.conclusion!=='success')return null;
 const target=await publicJSON('https://raw.githubusercontent.com/'+repository+'/'+run.head_sha+'/apps/cms/src/modules/shared/site-version.json',request);
 if(typeof target.version!=='string'||!versionPattern.test(target.version))throw new Error('Release version invalid');
 return {version:target.version,status:run.status,conclusion:run.conclusion,updatedAt:Date.parse(run.updated_at)};
}
// Share both an in-flight lookup and its cooldown across all visitors. Public
// GitHub API use is bounded to 30 requests/hour/process, including failures.
let cached:Promise<PendingRelease>|undefined,until=0;
export async function cachedPendingRelease(){
 if(!cached||Date.now()>=until){until=Date.now()+120_000;cached=pendingRelease();void cached.catch(()=>{});}
 return cached;
}

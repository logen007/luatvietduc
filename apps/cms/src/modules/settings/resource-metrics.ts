import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {performance} from 'node:perf_hooks';
import {pool} from '../shared/db';
import {bundledNames} from '../storage/bundled';
import {isAdmin,type AccountPrincipal} from '../identity/permissions';
import {HttpError} from '../http/errors';
const execute=promisify(execFile);
const number=(value:string)=>{const n=Number(value.trim());return Number.isFinite(n)&&n>=0?n:null;};
async function text(path:string){try{return await readFile(path,'utf8');}catch{return '';}}
export function cpuPercent(before:number,after:number,milliseconds:number){return milliseconds>0&&after>=before?Math.round((after-before)/1000/milliseconds*1000)/10:null;}
async function runtimeSample(){
 const [memory,limit,cpu,quota]=await Promise.all([text('/sys/fs/cgroup/memory.current'),text('/sys/fs/cgroup/memory.max'),text('/sys/fs/cgroup/cpu.stat'),text('/sys/fs/cgroup/cpu.max')]);
 const used=memory.trim()?number(memory):null,usage=/^usage_usec\s+(\d+)$/m.exec(cpu);
 const parts=quota.trim().split(/\s+/),quotaCores=parts[0]!=='max'&&Number(parts[1])>0?Number(parts[0])/Number(parts[1]):null;
 return {at:performance.now(),scope:used!==null&&usage?'container' as const:'process' as const,memoryBytes:used!==null&&usage?used:process.memoryUsage().rss,memoryLimitBytes:limit.trim()&&limit.trim()!=='max'?number(limit):null,cpuMicroseconds:usage&&used!==null?Number(usage[1]):Object.values(process.cpuUsage()).reduce((a,b)=>a+b,0),quotaCores:Number.isFinite(quotaCores)?quotaCores:null};
}
export type RuntimeMetrics={scope:'container'|'process';memoryBytes:number;memoryLimitBytes:number|null;cpuPercent:number|null;cpuLimitCores:number|null;measuredAt:string};
let previous:Awaited<ReturnType<typeof runtimeSample>>|undefined,runtimeFlight:Promise<RuntimeMetrics>|undefined,runtimeUntil=0;
async function runtime(){
 if(runtimeFlight&&Date.now()<runtimeUntil)return runtimeFlight;
 runtimeUntil=Date.now()+3000;
 runtimeFlight=(async()=>{
  let sample=await runtimeSample();
  if(!previous||previous.scope!==sample.scope){previous=sample;await new Promise(resolve=>setTimeout(resolve,250));sample=await runtimeSample();}
  const percent=cpuPercent(previous!.cpuMicroseconds,sample.cpuMicroseconds,sample.at-previous!.at);previous=sample;
  return {scope:sample.scope,memoryBytes:sample.memoryBytes,memoryLimitBytes:sample.scope==='container'?sample.memoryLimitBytes:null,cpuPercent:percent,cpuLimitCores:sample.scope==='container'?sample.quotaCores:null,measuredAt:new Date().toISOString()};
 })();return runtimeFlight;
}
export const resourceStorageSQL=`WITH objects AS (
 SELECT to_jsonb(m) data FROM media m WHERE m.filename IS NOT NULL AND NOT(m.filename=ANY($1::text[]))
), files AS (
 SELECT concat_ws('/',data->>'prefix',data->>'filename') key,COALESCE((data->>'filesize')::numeric,0) bytes FROM objects
 UNION ALL
 SELECT concat_ws('/',data->>'prefix',data->>(size||'_filename')),COALESCE((data->>(size||'_filesize'))::numeric,0) FROM objects CROSS JOIN unnest(ARRAY['sizes_thumbnail','sizes_medium','sizes_large']) size WHERE data->>(size||'_filename') IS NOT NULL
 UNION ALL
 SELECT data->'original_file'->>'key',COALESCE((data->'original_file'->>'filesize')::numeric,0) FROM objects WHERE data->'original_file'->>'key' IS NOT NULL
), unique_files AS (SELECT key,max(bytes) bytes FROM files GROUP BY key)
SELECT pg_database_size(current_database())::text database_bytes,COALESCE((SELECT sum(bytes) FROM unique_files),0)::text media_bytes,COALESCE((SELECT sum(size) FROM lvd_chat_files),0)::text chat_bytes`;
export type StorageMetrics={appBytes:number|null;databaseBytes:number|null;mediaBytes:number|null;chatBytes:number|null;measuredAt:string};
let storageFlight:Promise<StorageMetrics>|undefined,storageUntil=0;
async function storage(){
 if(storageFlight&&Date.now()<storageUntil)return storageFlight;
 storageUntil=Date.now()+120000;
 storageFlight=(async()=>{
  const [database,filesystem]=await Promise.allSettled([
   pool.query(resourceStorageSQL,[bundledNames]),
   execute('du',['-sk',process.cwd(),'/legacy-assets','/legacy-index.html'],{timeout:8000,maxBuffer:4096}),
  ]);
  const row=database.status==='fulfilled'?database.value.rows[0]:null;
  const appBytes=filesystem.status==='fulfilled'?filesystem.value.stdout.trim().split('\n').reduce((sum,line)=>sum+Number(line.split(/\s+/)[0])*1024,0):null;
  return {appBytes:appBytes!==null&&Number.isFinite(appBytes)?appBytes:null,databaseBytes:row?Number(row.database_bytes):null,mediaBytes:row?Number(row.media_bytes):null,chatBytes:row?Number(row.chat_bytes):null,measuredAt:new Date().toISOString()};
 })();return storageFlight;
}
export async function resourceMetrics(user?:AccountPrincipal|null){
 if(!isAdmin(user))throw new HttpError(403,'Chỉ Admin được xem tài nguyên website.');
 const [live,disk]=await Promise.all([runtime(),storage()]);return {runtime:live,storage:disk};
}

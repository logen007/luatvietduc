import test from 'node:test';
import assert from 'node:assert/strict';
import {updateState,pendingRelease} from '../src/modules/shared/release-status.ts';
const now=Date.parse('2026-11-08T18:00:00Z'),active={version:'01.40.18'},pending={version:'01.40.19',status:'in_progress',conclusion:null,updatedAt:now};
test('a newer queued/checking/prepared release shows the notice, activation hides it',()=>{
 for(const status of ['queued','in_progress','waiting','pending','requested','completed'])assert.deepEqual(updateState(active,{...pending,status,conclusion:status==='completed'?'success':null},now),{status:'updating',version:pending.version});
 for(const version of ['01.40.17','01.40.18'])assert.equal(updateState(active,{...pending,version},now).status,'idle');
 assert.equal(updateState({version:'01.40.19'},pending,now).status,'idle');assert.equal(updateState(active,null,now).status,'idle');
 assert.equal(updateState({version:'01.99.99'},{...pending,version:'02.00.00'},now).status,'updating');
});
test('failed/cancelled releases, invalid metadata and stale preparation cannot spin forever',()=>{
 for(const conclusion of ['failure','cancelled','skipped','timed_out','action_required'])assert.equal(updateState(active,{...pending,status:'completed',conclusion},now).status,'idle');
 assert.equal(updateState(active,{...pending,status:'completed',conclusion:'success',updatedAt:now-6*60_000},now).status,'unknown');
 for(const value of [null,{}, {version:'01.2.3'}])assert.equal(updateState(value,pending,now).status,'unknown');
 for(const updatedAt of [NaN,now-16*60_000,now+120_000])assert.equal(updateState(active,{...pending,updatedAt},now).status,'unknown');
});
const sha='a'.repeat(40),run={head_branch:'feat/platform-cms-bootstrap',event:'push',path:'.github/workflows/platform-foundation.yml',head_repository:{full_name:'logen007/luatvietduc'},head_sha:sha,status:'in_progress',conclusion:null,updated_at:new Date(now).toISOString()};
test('release lookup uses only the approved public workflow and immutable version, without credentials',async()=>{
 const calls=[],request=async(url,options)=>{calls.push(url);assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.ok(!options.headers.Authorization);return Response.json(calls.length===1?{workflow_runs:[run]}:{version:'01.40.19'});};
 assert.deepEqual(await pendingRelease(request),pending);assert.equal(calls.length,2);assert.ok(calls[0].includes('event=push'));assert.ok(calls[1].includes('/'+sha+'/'));
});
test('wrong branch, fork, malformed SHA and unexpected workflow cannot choose another URL',async()=>{
 for(const patch of [{head_branch:'main'},{event:'pull_request'},{path:'other.yml'},{head_repository:{full_name:'other/repo'}},{head_sha:'../../secret'},{status:'untrusted'}]){
  let calls=0;await assert.rejects(()=>pendingRelease(async()=>{calls++;return Response.json({workflow_runs:[{...run,...patch}]});}),/invalid/);assert.equal(calls,1);
 }
});
test('provider errors and invalid versions remain unknown, without successful-update claims',async()=>{
 await assert.rejects(()=>pendingRelease(async()=>new Response('rate limited',{status:429})),/unavailable/);
 let calls=0;await assert.rejects(()=>pendingRelease(async()=>Response.json(++calls===1?{workflow_runs:[run]}:{version:'invalid'})),/invalid/);
 assert.equal(await pendingRelease(async()=>Response.json({workflow_runs:[]})),null);
 let failedCalls=0;assert.equal(await pendingRelease(async()=>{failedCalls++;return Response.json({workflow_runs:[{...run,status:'completed',conclusion:'failure'}]});}),null);assert.equal(failedCalls,1);
});

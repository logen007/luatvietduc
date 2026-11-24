import test from 'node:test';
import assert from 'node:assert/strict';
import {createLatestRequest} from '../src/modules/shared/latest-request.ts';
const deferred=()=>{let resolve,reject;const task=new Promise((yes,no)=>{resolve=yes;reject=no;});return {task,resolve,reject};};
test('a late result cannot replace a newer query, including when returning to the same key',async()=>{
 const loader=createLatestRequest(),old=deferred();loader.select('A');const first=loader.load('A',()=>old.task);
 loader.select('B');const second=await loader.load('B',async()=>2);assert.equal(second.current(),true);
 loader.select('A');old.resolve(1);assert.equal((await first).current(),false);assert.equal(second.current(),false);
 assert.equal((await loader.load('A',async()=>3)).value,3);
});
test('same-query polling shares one request, while refresh after a write invalidates the older read',async()=>{
 const loader=createLatestRequest(),old=deferred();let calls=0;loader.select('A');
 const first=loader.load('A',()=>{calls++;return old.task;}),same=loader.load('A',async()=>{calls++;return 99;});assert.equal(first,same);
 const updated=await loader.load('A',async()=>4,true);old.resolve(1);assert.equal(updated.current(),true);assert.equal((await first).current(),false);assert.equal(calls,1);
});
test('failed reads remain recoverable and cleanup blocks late updates without starting obsolete requests',async()=>{
 const loader=createLatestRequest(),late=deferred();loader.select('A');const first=loader.load('A',()=>late.task);loader.clear('A');late.reject(new Error('Offline'));
 const result=await first;assert.equal(result.ok,false);assert.equal(result.current(),false);
 const obsolete=await loader.load('A',async()=>{throw Error('Must not run');});assert.equal(obsolete.current(),false);
 loader.select('A');const failure=await loader.load('A',async()=>{throw Error('Retry');});assert.equal(failure.ok,false);assert.equal(failure.current(),true);
 assert.equal((await loader.load('A',async()=>5)).value,5);
});

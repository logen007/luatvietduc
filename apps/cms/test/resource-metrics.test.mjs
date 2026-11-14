import test from 'node:test';
import assert from 'node:assert/strict';
import {cpuPercent,resourceMetrics} from '../src/modules/settings/resource-metrics.ts';
test('resource metrics are denied before measurement for guests, members and specialists',async()=>{
 for(const user of [null,undefined,{role:'member'},{role:'support'},{role:'reviewer'}])await assert.rejects(()=>resourceMetrics(user),error=>error.status===403);
});
test('CPU samples represent one-core utilization and reject reset counters or zero intervals',()=>{
 assert.equal(cpuPercent(0,1_000_000,1000),100);
 assert.equal(cpuPercent(0,250_000,1000),25);
 assert.equal(cpuPercent(0,2_000_000,1000),200);
 assert.equal(cpuPercent(1000,0,1000),null);assert.equal(cpuPercent(0,100,0),null);
});

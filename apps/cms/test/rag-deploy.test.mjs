import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../../../'+p,import.meta.url),'utf8');
test('semantic index deployment stays private, bounded and independent of application compose',()=>{
 const compose=read('ops/rag/compose.yml');
 assert.ok(!/^\s*ports:/m.test(compose));assert.ok(!compose.includes('root_default'));assert.ok(compose.includes('mem_limit: 384m'));assert.ok(compose.includes('read_only: true'));assert.ok(compose.includes('cap_drop: [ALL]'));assert.ok(compose.includes('qdrant/qdrant:v1.20.0'));
 const worker=read('ops/rag/worker.py');assert.ok(worker.includes("'--user','node'"));assert.ok(worker.includes("'timeout','150'"));assert.ok(!worker.includes('shell=True'));
 const helper=read('ops/deploy/release-reviewed-rag.py');assert.ok(helper.includes('engine.policies(sha)'));assert.ok(helper.includes('module.ci_success(sha'));assert.ok(helper.includes('engine.activate(sha,current)'));assert.ok(!helper.includes('policy_hashes] ='));assert.ok(!helper.includes('system prune'));
});

test('current-image retention protects live updates and unrelated services',async()=>{
 const {spawnSync}=await import('node:child_process');
 const result=spawnSync('python3',['-m','unittest','discover','-s',new URL('../../../ops/deploy',import.meta.url).pathname,'-p','test_app_retention.py'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
});

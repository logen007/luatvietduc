import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
const require=createRequire(import.meta.url);
test('legacy migration loader uses patched esbuild and still transforms TypeScript in sync and async modes',async()=>{
 const path=require.resolve('@esbuild-kit/core-utils'),loaderRequire=createRequire(path);
 const version=loaderRequire('esbuild').version.split('.').map(Number);
 assert.ok(version[0]>0||version[1]>=25,'Loader must not resolve the vulnerable nested esbuild');
 const loader=require(path),source='export const answer: number = 40 + 2;';
 for(const result of [loader.transformSync(source,'synthetic.ts'),await loader.transform(source,'synthetic.ts',{format:'cjs'})]){
  const module={exports:{}};runInNewContext(result.code,{module,exports:module.exports},{timeout:1000});assert.equal(module.exports.answer,42);assert.ok(result.map);
 }
});

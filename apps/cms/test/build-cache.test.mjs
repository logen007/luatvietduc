import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {trimBuildCache,BUILD_CACHE_LIMIT} from '../scripts/trim-build-cache.mjs';
test('compiler cache is reused within budget and can be absent',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'lvd-cache-'));
 try{
  assert.deepEqual(trimBuildCache(path.join(root,'missing')),{cleared:false,bytes:0});
  fs.mkdirSync(path.join(root,'webpack'));fs.writeFileSync(path.join(root,'webpack','pack'),'1234');
  assert.deepEqual(trimBuildCache(root,4),{cleared:false,bytes:4});assert.equal(fs.readFileSync(path.join(root,'webpack','pack'),'utf8'),'1234');
  assert.equal(BUILD_CACHE_LIMIT,768*1024*1024);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('oversized cache clears only its contents and never follows an external symlink',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'lvd-cache-'));
 try{
  const cache=path.join(root,'cache'),outside=path.join(root,'outside');fs.mkdirSync(cache);fs.mkdirSync(outside);fs.writeFileSync(path.join(outside,'keep'),'retained');
  fs.symlinkSync(outside,path.join(cache,'link'));fs.writeFileSync(path.join(cache,'pack'),'123456');
  assert.equal(trimBuildCache(cache,1).cleared,true);assert.deepEqual(fs.readdirSync(cache),[]);assert.equal(fs.readFileSync(path.join(outside,'keep'),'utf8'),'retained');
  assert.throws(()=>trimBuildCache(path.join(outside,'keep')),/directory/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mediaStorageCoordinates} from '../src/modules/storage/media-coordinates.ts';

const forged={prefix:'originals/123',_objectKey:'foreign',_objectkey:'foreign-lower',_object_key:'foreign-legacy'};
const run=(operation,args)=>mediaStorageCoordinates({operation,args});

test('create uses the fixed flat namespace before upload processing, including override callers',()=>{
 for(const overrideAccess of [false,true]){
  const source={...forged,title:'Synthetic upload'},args={data:source,overrideAccess};
  assert.equal(run('create',args),args);assert.deepEqual(args.data,{title:'Synthetic upload',prefix:''});
  assert.deepEqual(source,{...forged,title:'Synthetic upload'},'The caller object is not mutated');
 }
});

test('single and bulk updates cannot choose storage coordinates',()=>{
 for(const selector of [{id:1},{where:{id:{in:[1,2]}}}])for(const overrideAccess of [false,true]){
  const args={...selector,overrideAccess,data:{...forged,caption:'Synthetic caption',updatedAt:'2026-11-05T00:00:00Z'}};
  run('update',args);assert.deepEqual(args.data,{caption:'Synthetic caption',updatedAt:'2026-11-05T00:00:00Z'});
  for(const [key,value] of Object.entries(selector))assert.deepEqual(args[key],value);
 }
});

test('ordinary data and unrelated operations retain their semantics',()=>{
 const update={data:{title:'Synthetic title'}};run('update',update);assert.deepEqual(update.data,{title:'Synthetic title'});
 const create={data:{}};run('create',create);assert.deepEqual(create.data,{prefix:''});
 for(const operation of ['read','count','delete','login']){
  const args={data:{...forged}},before=structuredClone(args);run(operation,args);assert.deepEqual(args,before);
 }
 for(const data of [undefined,null,[],false]){const args={data};run('update',args);assert.equal(args.data,data,'Invalid body validation remains native');}
});

test('video uploads allow 50 MiB while documents and images retain 10 MiB before processing',()=>{
 const args=(mimetype,size)=>({req:{file:{mimetype,size}},data:{}});
 assert.doesNotThrow(()=>run('create',args('video/mp4',20*1024*1024)));
 assert.doesNotThrow(()=>run('update',args('video/webm',50*1024*1024)));
 assert.throws(()=>run('create',args('video/mp4',50*1024*1024+1)),/50 MB/);
 assert.throws(()=>run('create',args('image/jpeg',10*1024*1024+1)),/10 MB/);
 assert.throws(()=>run('update',args('application/pdf',20*1024*1024)),/10 MB/);
});

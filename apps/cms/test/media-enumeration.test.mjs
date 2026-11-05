import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mediaRootEnumeration} from '../src/modules/storage/media-enumeration.ts';

const roots={legacyParent:{exists:false}};
const run=(operation,args)=>mediaRootEnumeration({operation,args});

test('top-level media lists include only family roots, including privileged local lists',()=>{
 for(const currentDepth of [undefined,0,-1])for(const overrideAccess of [false,true]){
  const args={where:undefined,currentDepth,overrideAccess,limit:25,page:2};
  assert.equal(run('read',args),args);assert.deepEqual(args.where,{and:[roots]});
  assert.equal(args.limit,25);assert.equal(args.page,2);assert.equal(args.overrideAccess,overrideAccess);
 }
});

test('caller OR, parent and bulk-ID filters cannot restore child aliases to a root list',()=>{
 for(const where of [{or:[{id:{equals:2}},{visibility:{equals:'public'}}]},{legacyParent:{exists:true}},{id:{in:[1,2,3]}}]){
  const before=structuredClone(where),args={where,currentDepth:0};run('read',args);
  assert.deepEqual(args.where,{and:[before,roots]});assert.deepEqual(where,before,'The caller query is preserved without mutation');
 }
});

test('explicit counts apply the same root predicate without changing other arguments',()=>{
 for(const where of [undefined,{id:{in:[1,2,3]}},{visibility:{equals:'private'}}]){
  const args={where,overrideAccess:false};run('count',args);
  assert.deepEqual(args.where,{and:[...(where?[where]:[]),roots]});assert.equal(args.overrideAccess,false);
 }
 const args={};run('count',args);assert.deepEqual(args.where,{and:[roots]});
});

test('direct alias IDs and dataloader population remain readable',()=>{
 for(const args of [{id:2},{id:2,where:undefined,currentDepth:0},{where:{id:{in:[2,3]}},currentDepth:1},{where:{id:{in:[2,3]}},currentDepth:2,overrideAccess:false}]){
  const before=structuredClone(args);assert.equal(run('read',args),args);assert.deepEqual(args,before);
 }
});

test('write, auth and distinct operations retain their own semantics',()=>{
 for(const operation of ['create','update','delete','login','readDistinct','countVersions']){
  const args={where:{id:{in:[1,2,3]}},data:{title:'Synthetic metadata'}};
  const before=structuredClone(args);assert.equal(run(operation,args),args);assert.deepEqual(args,before);
 }
 const args={depth:1};run('read',args);assert.deepEqual(args,{depth:1},'Only the installed find argument shape is filtered');
});

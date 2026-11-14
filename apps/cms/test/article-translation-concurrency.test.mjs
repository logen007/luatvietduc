import test from 'node:test';
import assert from 'node:assert/strict';
import {articleTranslation} from '../src/modules/content/translations.ts';
import {pool} from '../src/modules/shared/db.ts';

test('parallel translations can read their connection without exhausting their own advisory-lock pool',async()=>{
 const originalConnect=pool.connect,originalQuery=pool.query,capacity=pool.options.max;
 let available=capacity,locked=0,releaseBarrier,timer;
 const waiting=[],barrier=new Promise(resolve=>{releaseBarrier=resolve;});
 const acquire=()=>available>0?(available--,Promise.resolve()):new Promise((resolve,reject)=>waiting.push({resolve,reject}));
 const release=()=>{const next=waiting.shift();if(next)next.resolve();else available++;};
 pool.connect=async()=>{
  await acquire();
  return {
   query:async text=>{
    if(text.includes('pg_try_advisory_lock')){if(++locked===capacity)releaseBarrier();await barrier;return {rows:[{locked:true}]};}
    return {rows:[{pg_advisory_unlock:true}]};
   },release,
  };
 };
 pool.query=async()=>{await acquire();try{await Promise.resolve();return {rows:[]};}finally{release();}};
 const updatedAt='2026-11-06T00:00:00.000Z',user={id:1,role:'owner'};
 const payload={find:async({where})=>({docs:where.id?[{id:where.id.equals,updatedAt,translationGroup:'group-'+where.id.equals,language:'vi',title:'Synthetic source',body:'Synthetic body'}]:[]})};
 let pending;
 try{
  pending=Promise.allSettled(Array.from({length:capacity},(_,index)=>articleTranslation(payload,user,{id:index+1,updatedAt,language:'de',mode:'preview'})));
  const result=await Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Translations exhausted the pool while waiting for their own connection settings')),1000);})]);
  assert.equal(result.length,capacity);
  for(const request of result){assert.equal(request.status,'rejected');assert.equal(request.reason.status,503,'Missing credentials should fail normally without any provider request');}
  assert.equal(available,capacity,'Every advisory-lock connection is returned');
 }finally{
  clearTimeout(timer);releaseBarrier();
  for(const request of waiting.splice(0))request.reject(new Error('Synthetic pool cleanup'));
  await pending;
  pool.connect=originalConnect;pool.query=originalQuery;
 }
});

test('an existing AI translation retry still needs neither credentials nor another provider call',async()=>{
 const originalConnect=pool.connect,originalQuery=pool.query;
 pool.connect=async()=>{throw new Error('An existing sibling needs no advisory admission');};
 pool.query=async()=>{throw new Error('An existing sibling needs no connection settings');};
 const updatedAt='2026-11-06T00:00:00.000Z',user={id:1,role:'owner'};
 const payload={find:async({where})=>({docs:where.id?[{id:1,updatedAt,translationGroup:'synthetic-existing',language:'vi'}]:[{id:2,language:'de'}]})};
 try{assert.deepEqual(await articleTranslation(payload,user,{id:1,updatedAt,language:'de',mode:'ai'}),{id:2,existing:true});}
 finally{pool.connect=originalConnect;pool.query=originalQuery;}
});

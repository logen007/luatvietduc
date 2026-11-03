import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadPublicSettings} from '../src/modules/settings/client.ts';
import {visiblePoll} from '../src/modules/shared/polling.ts';
test('shell settings share a request and recover after a failed request',async()=>{
 const previous=globalThis.fetch;let calls=0,fail=true;
 globalThis.fetch=async()=>{calls++;if(fail)throw new Error('synthetic network failure');return {ok:true,json:async()=>({siteName:'Synthetic site'})};};
 try{await assert.rejects(()=>Promise.all([loadPublicSettings(),loadPublicSettings()]));assert.equal(calls,1);fail=false;const values=await Promise.all([loadPublicSettings(),loadPublicSettings(),loadPublicSettings()]);assert.equal(calls,2);assert.equal(values[0],values[1]);}finally{globalThis.fetch=previous;}
});
test('polling never overlaps, sleeps when hidden, and stops on cleanup',async()=>{
 const original={document:globalThis.document,window:globalThis.window,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const doc=new EventTarget(),win=new EventTarget(),timers=new Map();doc.hidden=false;let sequence=0,calls=0,release;
 globalThis.document=doc;globalThis.window=win;globalThis.setTimeout=callback=>{timers.set(++sequence,callback);return sequence;};globalThis.clearTimeout=id=>timers.delete(id);
 let stop;
 try{
  stop=visiblePoll(()=>{calls++;return new Promise(resolve=>{release=resolve;});},100);
  assert.equal(calls,1);assert.equal(timers.size,0);win.dispatchEvent(new Event('focus'));assert.equal(calls,1);
  doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));release();await Promise.resolve();await Promise.resolve();assert.equal(timers.size,0);
  doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(calls,2);stop();release();await Promise.resolve();await Promise.resolve();assert.equal(timers.size,0);win.dispatchEvent(new Event('focus'));assert.equal(calls,2);
 }finally{stop?.();Object.assign(globalThis,original);}
});

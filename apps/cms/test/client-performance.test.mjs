import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadPublicSettings} from '../src/modules/settings/client.ts';
import {visiblePoll} from '../src/modules/shared/polling.ts';
import {createPublicSettingsStore} from '../src/modules/settings/client-store.ts';
test('shell settings share a request and recover after a failed request',async()=>{
 const previous=globalThis.fetch;let calls=0,fail=true;
 globalThis.fetch=async()=>{calls++;if(fail)throw new Error('synthetic network failure');return {ok:true,json:async()=>({siteName:'Synthetic site'})};};
 try{await assert.rejects(()=>Promise.all([loadPublicSettings(),loadPublicSettings()]));assert.equal(calls,1);fail=false;const values=await Promise.all([loadPublicSettings(),loadPublicSettings(),loadPublicSettings()]);assert.equal(calls,2);assert.equal(values[0],values[1]);}finally{globalThis.fetch=previous;}
});
test('settings refreshes share an in-flight request and update every subscriber together',async()=>{
 let calls=0,release,time=0;
 const store=createPublicSettingsStore(()=>{calls++;return new Promise(resolve=>{release=resolve;});},()=>time);
 const seenA=[],seenB=[],offA=store.subscribe(()=>seenA.push(store.getSnapshot())),offB=store.subscribe(()=>seenB.push(store.getSnapshot()));
 const first=store.load(),focused=store.load(true);assert.equal(first,focused);await Promise.resolve();assert.equal(calls,1);
 const original={siteName:'Original'};release(original);await first;assert.equal(seenA.at(-1),seenB.at(-1));assert.equal(store.getSnapshot().data,original);
 await store.load();assert.equal(calls,1);
 time=31000;const next=store.load();await Promise.resolve();assert.equal(calls,2);
 release({siteName:'Updated'});await next;assert.equal(seenA.at(-1).data.siteName,'Updated');
 offA();offB();const count=seenA.length;const forced=store.load(true);await Promise.resolve();release({siteName:'Latest'});await forced;assert.equal(seenA.length,count);
});
test('a failed public settings refresh preserves the last good value and can recover',async()=>{
 let value={siteName:'Original'},fail=false;const store=createPublicSettingsStore(async()=>{if(fail)throw new Error('offline');return value;});
 await store.load();fail=true;await assert.rejects(store.load(true));assert.equal(store.getSnapshot().data,value);assert.equal(store.getSnapshot().loading,false);assert.match(store.getSnapshot().error.message,/offline/);
 value={siteName:'Recovered'};fail=false;await store.load();assert.equal(store.getSnapshot().data,value);assert.equal(store.getSnapshot().error,null);
});
test('polling never overlaps, sleeps when hidden, and stops on cleanup',async()=>{
 const original={document:globalThis.document,window:globalThis.window,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const doc=new EventTarget(),win=new EventTarget(),timers=new Map();doc.hidden=false;let sequence=0,calls=0,release;
 globalThis.document=doc;globalThis.window=win;globalThis.setTimeout=callback=>{timers.set(++sequence,callback);return sequence;};globalThis.clearTimeout=id=>timers.delete(id);
 let stop;
 try{
  stop=visiblePoll(()=>{calls++;return new Promise(resolve=>{release=resolve;});},100);
  assert.equal(calls,1);assert.equal(timers.size,0);stop.refresh();win.dispatchEvent(new Event('focus'));assert.equal(calls,1);
  doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));release();await Promise.resolve();await Promise.resolve();assert.equal(timers.size,0);
  stop.refresh();assert.equal(calls,1);
  doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(calls,2);stop();release();await Promise.resolve();await Promise.resolve();assert.equal(timers.size,0);stop.refresh();win.dispatchEvent(new Event('focus'));assert.equal(calls,2);
 }finally{stop?.();Object.assign(globalThis,original);}
});
test('refresh during a pending read runs once immediately afterward, without overlapping reads',async()=>{
 const original={document:globalThis.document,window:globalThis.window,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const doc=new EventTarget(),win=new EventTarget(),timers=new Map();doc.hidden=false;let sequence=0,calls=0,release;
 globalThis.document=doc;globalThis.window=win;globalThis.setTimeout=callback=>{timers.set(++sequence,callback);return sequence;};globalThis.clearTimeout=id=>timers.delete(id);
 let stop;
 try{
  stop=visiblePoll(()=>{calls++;return new Promise(resolve=>{release=resolve;});},10000);
  for(let i=0;i<20;i++)stop.refresh();
  assert.equal(calls,1);assert.equal(timers.size,0);
  release();await Promise.resolve();await Promise.resolve();
  assert.equal(calls,2,'The acknowledged write must not wait for the idle polling interval');assert.equal(timers.size,0);
  release();await Promise.resolve();await Promise.resolve();assert.equal(calls,2);assert.equal(timers.size,1);
  stop();assert.equal(timers.size,0);
 }finally{stop?.();Object.assign(globalThis,original);}
});

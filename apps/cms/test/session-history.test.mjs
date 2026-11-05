import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createSessionStore} from '../src/modules/shared/account-state.mjs';

function sessionHarness(){
 const window=new EventTarget(),document=new EventTarget(),exports={},drafts=new Map([['lvd-staff-draft:synthetic','Draft'],['lvd-chat-handoff-v1','Handoff']]);
 let snapshot,unsubscribe,fetchCount=0,release;
 const source=fs.readFileSync(new URL('../src/modules/shared/session-client.ts',import.meta.url),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const response=user=>({ok:true,json:async()=>({user})});
 vm.runInNewContext(compiled,{exports,window,document,Event,AbortSignal,
  sessionStorage:{get length(){return drafts.size;},key:index=>[...drafts.keys()][index],removeItem:key=>drafts.delete(key)},
  localStorage:{setItem:()=>assert.fail('History restoration must not broadcast a logout')},
  fetch:()=>++fetchCount===1?Promise.resolve(response({id:1,role:'owner'})):new Promise(resolve=>{release=user=>resolve(response(user));}),
  require:name=>name==='react'?{useEffect:effect=>effect(),useSyncExternalStore:(subscribe,getSnapshot)=>{snapshot=getSnapshot;unsubscribe=subscribe(()=>{});return getSnapshot();}}:{createSessionStore},
 });
 exports.usePublicSession();
 return {api:exports,window,drafts,snapshot:()=>snapshot(),release:user=>release(user),close:()=>unsubscribe()};
}

test('a persisted history restore hides the previous identity before checking the current session and keeps draft storage',async()=>{
 const app=sessionHarness();await app.api.loadPublicSession();
 const previous=app.snapshot().revision,event=new Event('pageshow');Object.defineProperty(event,'persisted',{value:true});
 app.window.dispatchEvent(event);
 assert.equal(app.snapshot().status,'loading');assert.equal(app.snapshot().user,null);
 assert.equal(app.api.isPublicSessionCurrent(previous),false);
 assert.equal(app.drafts.get('lvd-staff-draft:synthetic'),'Draft');assert.equal(app.drafts.get('lvd-chat-handoff-v1'),'Handoff');
 await Promise.resolve();app.release({id:2,role:'member'});await app.api.loadPublicSession();
 assert.equal(app.snapshot().user.id,2);assert.equal(app.snapshot().status,'ready');app.close();
});

test('focus and ordinary pageshow keep the ready identity during refresh',async()=>{
 for(const type of ['focus','pageshow']){
  const app=sessionHarness();await app.api.loadPublicSession();const previous=app.snapshot().revision;
  const event=new Event(type);if(type==='pageshow')Object.defineProperty(event,'persisted',{value:false});
  app.window.dispatchEvent(event);
  assert.equal(app.snapshot().status,'ready');assert.equal(app.snapshot().user.id,1);assert.equal(app.api.isPublicSessionCurrent(previous),true);
  await Promise.resolve();app.release({id:1,role:'owner'});await app.api.loadPublicSession();
  assert.equal(app.snapshot().revision,previous);app.close();
 }
});

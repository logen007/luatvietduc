import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
test('unsaved navigation waits for approval, cancel stays put, and unload protection remains active',async()=>{
 let answer=false,prompts=0,moved=0;const cleanups=[],navigation=new EventTarget(),window=new EventTarget();window.location={href:'https://example.invalid/admin',assign(){moved++;}};window.navigation=navigation;
 const exports={},source=ts.transpileModule(fs.readFileSync(new URL('../src/modules/shared/unsaved-changes.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{exports,window,URL,Date,require:name=>({'react':{useRef:()=>({current:Symbol()}),useEffect:fn=>cleanups.push(fn())},'./confirm-dialog':{confirmAction:async()=>{prompts++;return answer;}}}[name]??assert.fail(name))});
 exports.useUnsavedChanges(true);
 assert.equal(exports.confirmAdminNavigation('/admin/articles',()=>moved++),false);await new Promise(setImmediate);assert.equal(moved,0);assert.equal(prompts,1);
 answer=true;assert.equal(exports.confirmAdminNavigation('/admin/articles',()=>moved++),false);await new Promise(setImmediate);assert.equal(moved,1);
 const event=new Event('navigate',{cancelable:true});Object.defineProperty(event,'destination',{value:{url:'https://example.invalid/admin/articles',sameDocument:true}});navigation.dispatchEvent(event);assert.equal(event.defaultPrevented,false);
 const unload=new Event('beforeunload',{cancelable:true});window.dispatchEvent(unload);assert.equal(unload.defaultPrevented,true,'Unrelated reload still warns while the dirty form remains');
 cleanups.forEach(fn=>fn?.());assert.equal(exports.confirmAdminNavigation('/admin'),true);
});

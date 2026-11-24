import test from 'node:test';
import assert from 'node:assert/strict';
import {isPageLink,prefetchPage} from '../src/modules/shared/navigation.ts';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('only UI pages participate in client navigation, including filtered and hash destinations',()=>{
 for(const href of ['/','/hoi-dap?question=nh%C3%A0','/tai-khoan?mode=signin','/tin-tuc?nhom=gia-dinh','/gioi-thieu#doi-ngu','/bai-viet/test','/admin/collections/articles?depth=1'])assert.equal(isPageLink(href),true,href);
 for(const href of ['#main','https://example.invalid/','mailto:test@example.invalid','//example.invalid','/\\example.invalid','/auth/google','/service/backups/google/start','/api/media/1','/assets/test.svg','/favicon.ico','/service/article-import','/x/../auth/google','/%61uth/google','/service%2Fbackups','/%2fexample.invalid','/%zz'])assert.equal(isPageLink(href),false,href);
});
test('public pages warm on intent rather than viewport entry; private pages never warm automatically',()=>{
 for(const href of ['/','/hoi-dap','/tin-tuc','/phap-luat/viet-nam'])assert.equal(prefetchPage(href),null,href);
 for(const href of ['/admin','/admin/inbox','/tai-khoan?mode=reset'])assert.equal(prefetchPage(href),false,href);
 for(const href of ['/bai-viet/one','/tin-tuc?q=private','/hoi-dap?conversation=synthetic'])assert.equal(prefetchPage(href),null,href);
});

test('large lists warm only the intended destination, preserve handlers and never warm private pages',()=>{
 let warmed='',stateWrites=0,confirmed=0;
 const exports={},Link=()=>{};
 const source=ts.transpileModule(fs.readFileSync(new URL('../src/modules/shared/AppLink.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(source,{exports,window:{location:{pathname:'/admin/inbox'}},require:name=>({
  react:{useRef:()=>({current:null}),useState:()=>[warmed,value=>{warmed=value;stateWrites++;}]},
  'react/jsx-runtime':{jsx:(type,props)=>({type,props})},
  'next/link':{default:Link},'./navigation':{isPageLink,prefetchPage},
  './unsaved-changes':{confirmAdminNavigation:()=>{confirmed++;return false;}},
 }[name]??assert.fail(name))});
 const render=props=>exports.AppLink(props).props;
 for(const href of Array.from({length:50},(_,i)=>'/bai-viet/article-'+i))assert.equal(render({href}).prefetch,false);
 let forwarded=0;const href='/tin-tuc?nhom=gia-dinh';
 for(const event of ['onMouseEnter','onFocus','onTouchStart']){
  warmed='';const props=render({href,[event]:()=>forwarded++});props[event]({});assert.equal(render({href}).prefetch,true);
 }
 assert.equal(forwarded,3);assert.equal(render({href:'/tin-tuc?nhom=viec-lam'}).prefetch,false,'A changed filter needs a new intent');
 for(const href of ['/admin/inbox','/tai-khoan?mode=reset']){
  const count=stateWrites,props=render({href});props.onMouseEnter({});assert.equal(stateWrites,count);assert.equal(props.prefetch,false);
 }
 const explicit=render({href:'/bai-viet/article-1',prefetch:false});explicit.onFocus({});assert.equal(explicit.prefetch,false);
 assert.equal(render({href:'/hoi-dap'}).prefetch,false);
 render({href:'/hoi-dap'}).onFocus({});assert.equal(render({href:'/hoi-dap'}).prefetch,true);
 let prevented=false;render({href:'/tin-tuc'}).onNavigate({preventDefault:()=>{prevented=true;}});assert.equal(confirmed,1);assert.equal(prevented,true);
});

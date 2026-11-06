import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import {publicShell,copyright} from '../src/modules/shared/public-shell.mjs';
import {accountView} from '../src/modules/shared/account-state.mjs';
test('one shell contract applies configured identity, copyright and navigation to both renderers',()=>{
 const navigation={primary:[{key:'library',href:'/#/tra-cuu',label:'Thư viện'}],footer:[{title:'Thông tin',links:[]}]};
 const settings={siteName:'Synthetic portal',tagline:'Synthetic tagline',logo:'/assets/logo.svg',accentColor:'#123456',footerText:'Synthetic footer',navigation:[{label:'Duplicate',url:'/#/tra-cuu'},{label:'Contact',url:'/#/lien-he'}],apiKey:'never public'};
 const shell=publicShell(settings,navigation);
 assert.equal(shell.name,settings.siteName);assert.equal(shell.tagline,settings.tagline);assert.equal(shell.logo,settings.logo);assert.equal(shell.accent,settings.accentColor);
 assert.deepEqual(shell.primary.map(link=>link.href),['/thu-vien','/lien-he']);
 assert.equal(copyright(shell,'01.17.00'),'© Synthetic portal. · v01.17.00 Synthetic footer');
 assert.ok(!JSON.stringify(shell).includes('never public'));
});
test('shell rejects unsafe links and preserves intentionally empty copy',()=>{
 const shell=publicShell({tagline:'',logo:'javascript:alert(1)',accentColor:'url(https://example.invalid)',navigation:[{label:'Bad',url:'//example.invalid'},{label:'Bad',url:'https://name:secret@example.invalid'},{label:'Bad',url:'/admin'},{label:'Removed page',url:'/bai-viet'}]});
 assert.equal(shell.tagline,'');assert.equal(shell.logo,null);assert.equal(shell.accent,null);assert.deepEqual(shell.primary,[]);
});
test('valid hash links saved in admin work on every page and deduplicate against root-qualified links',()=>{
 const shell=publicShell({navigation:[{label:'News again',url:'#/tin-tuc'},{label:'Contact',url:'  #/lien-he  '},{label:'Contact again',url:'/#/lien-he'}]}, {primary:[{key:'news',label:'Tin tức',href:'/#/tin-tuc'}],footer:[]});
 assert.deepEqual(shell.primary.map(link=>link.href),['/tin-tuc','/lien-he']);
 assert.equal(shell.primary[0].label,'Tin tức');
});

test('the mobile menu includes contact exactly once with default or configured contact navigation',()=>{
 const source=fs.readFileSync(new URL('../src/modules/shared/Header.tsx',import.meta.url),'utf8'),compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 for(const navigation of [[],[{label:'Liên hệ',url:'/#/lien-he'}]]){
  const exports={},shell=publicShell({navigation},{primary:[{key:'news',href:'/tin-tuc',label:'Tin tức'}],footer:[]});
  vm.runInNewContext(compiled,{exports,require:name=>({react:React,'react/jsx-runtime':jsxRuntime,'next/navigation':{usePathname:()=>'/tai-khoan'},'./session-client':{usePublicSession:()=>({status:'ready',user:null})},'./account-state.mjs':{accountView},'./locale':{useLocale:()=>({t:text=>text,language:'vi'})},'./LanguageSwitch':{LanguageSwitch:()=>null},'./RolePreviewControl':{RolePreviewControl:()=>null},'./usePublicShell':{usePublicShell:()=>shell},'./client-api':{api:()=>assert.fail('Rendering the menu must not send requests')}}[name]||assert.fail(name))});
  const html=renderToStaticMarkup(React.createElement(exports.Header)),dialog=html.match(/<dialog\b[^>]*>([\s\S]*?)<\/dialog>/)?.[1];assert.ok(dialog);
  assert.equal([...dialog.matchAll(/href="\/lien-he"/g)].length,1,'configured contact must reuse its mobile entry');
 }
});

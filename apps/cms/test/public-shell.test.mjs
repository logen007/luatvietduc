import {AppLink} from '../src/modules/shared/AppLink.tsx';
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
  vm.runInNewContext(compiled,{exports,require:name=>({'./AppLink':{AppLink},react:React,'react/jsx-runtime':jsxRuntime,'next/navigation':{usePathname:()=>'/tai-khoan'},'./session-client':{usePublicSession:()=>({status:'ready',user:null})},'./account-state.mjs':{accountView},'./locale':{useLocale:()=>({t:text=>text,language:'vi'})},'./LanguageSwitch':{LanguageSwitch:()=>null},'./RolePreviewControl':{RolePreviewControl:()=>null},'./usePublicShell':{usePublicShell:()=>shell},'./client-api':{api:()=>assert.fail('Rendering the menu must not send requests')}}[name]||assert.fail(name))});
  const html=renderToStaticMarkup(React.createElement(exports.Header,{activeSection:'news'})),dialog=html.match(/<dialog\b[^>]*>([\s\S]*?)<\/dialog>/)?.[1];assert.ok(dialog);
  assert.equal([...dialog.matchAll(/href="\/lien-he"/g)].length,1,'configured contact must reuse its mobile entry');
  assert.match(dialog,/<a(?=[^>]*href="\/tin-tuc")(?=[^>]*aria-current="location")[^>]*>/);
  assert.match(dialog,/<a(?=[^>]*href="\/tai-khoan[^"]*")(?=[^>]*aria-current="page")[^>]*>/);
 }
});

test('configured public links and logos reject normalized private paths and ambiguous separators',()=>{
 for(const url of ['/\\evil.invalid/path','/\t/evil.invalid/path','/bad\u007fpath','/admin?tab=users','/admin#users','/%61dmin/settings','/%2f%2fevil.invalid/path','/%5cevil.invalid/path','/%0a/evil.invalid/path','/%broken']){
  const shell=publicShell({logo:url,navigation:[{label:'Invalid',url}]});
  assert.equal(shell.logo,null,url);assert.deepEqual(shell.primary,[],url);
 }
 for(const url of ['/assets/flags/vn.svg','/tin-tuc?q=nh%C3%A0','https://example.invalid/media/photo%2Fone.webp']){
  const shell=publicShell({logo:url,navigation:[{label:'Valid',url}]});
  assert.equal(shell.logo,url,url);assert.equal(shell.primary[0]?.href,url,url);
 }
});


test('the server layout paints its base canvas before external stylesheets load',async()=>{
 const source=fs.readFileSync(new URL('../src/app/(frontend)/layout.tsx',import.meta.url),'utf8'),compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={},Provider=({children})=>children;
 vm.runInNewContext(compiled,{exports,process:{cwd:()=>'/synthetic'},require:name=>({'react/jsx-runtime':jsxRuntime,'next/headers':{cookies:async()=>({get:()=>({value:'vi'})})},'../../modules/shared/brand-metadata':{brandMetadata:{}},'../../modules/shared/public-copy.server':{readPublicCopy:()=>({})},'../../modules/public-site/server':{publicSiteSettings:async()=>({})},'../../modules/settings/client':{PublicSettingsProvider:Provider},'../../modules/shared/locale':{LocaleProvider:Provider},'node:path':{default:{join:(...parts)=>parts.join('/')}},'../../modules/shared/presentation-version.mjs':{getPresentationVersion:()=> 'synthetic'}}[name]||assert.fail(name))});
 const html=renderToStaticMarkup(await exports.default({children:React.createElement('main',null,'Synthetic page')})),head=html.match(/<head>([\s\S]*?)<\/head>/)?.[1];
 assert.ok(head);assert.match(head,/<style>body\{margin:0;background:#fff;color:#0b0b0b;font:400 16px\/1.5 var\(--lvd-font\);-webkit-font-smoothing:antialiased\}<\/style>/);
 assert.ok(head.indexOf('<style>')<head.indexOf('rel="stylesheet"'),'base canvas must be available before external CSS');
});

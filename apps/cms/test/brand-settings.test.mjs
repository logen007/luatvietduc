import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import {publicShell} from '../src/modules/shared/public-shell.mjs';
function load(file,dependencies={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>dependencies[name]??assert.fail(name)});return exports;}
test('public logo dimensions survive projection and reject malformed settings without exposing private files',()=>{
 const {publicSettings}=load('../src/modules/settings/view.ts'),{readPublicSettings}=load('../src/modules/settings/public-contract.ts');
 const settings={siteName:'Brand',logo:{visibility:'public',url:'/api/media/file/brand.svg'},headerLogoHeight:40,footerLogoHeight:60};
 const projected=readPublicSettings(publicSettings(settings));
 assert.equal(projected.logo,settings.logo.url);assert.equal(projected.headerLogoHeight,40);assert.equal(projected.footerLogoHeight,60);
 assert.equal(publicSettings({...settings,logo:{visibility:'private',url:'/private.pdf'}}).logo,null);
 for(const value of [0,65,'40',NaN])assert.throws(()=>readPublicSettings({...projected,headerLogoHeight:value}));
 for(const value of [0,121,'44',Infinity])assert.throws(()=>readPublicSettings({...projected,footerLogoHeight:value}));
 assert.equal(publicShell(projected).headerLogoHeight,40);assert.equal(publicShell({}).headerLogoHeight,32);assert.equal(publicShell({}).footerLogoHeight,44);
});
test('header and footer replace text with the same configured logo, with independent heights and accessible name',()=>{
 for(const configured of [true,false]){
  const shell=publicShell({siteName:'Brand',logo:configured?'/brand.svg':null,headerLogoHeight:40,footerLogoHeight:60});
  const dependencies={react:React,'react/jsx-runtime':jsxRuntime,'next/navigation':{usePathname:()=>'/'} ,'./session-client':{usePublicSession:()=>({status:'ready',user:null})},'./account-state.mjs':{accountView:()=>({href:'/tai-khoan',label:'Đăng nhập'})},'./locale':{useLocale:()=>({t:text=>text,language:'vi'})},'./LanguageSwitch':{LanguageSwitch:()=>null},'./RolePreviewControl':{RolePreviewControl:()=>null},'./SocialLinks':{SocialLinks:()=>null},'./site-version.json':{default:{version:'01.00.00'}},'./usePublicShell':{usePublicShell:()=>shell},'./public-shell.mjs':{copyright:()=>''},'./client-api':{api:()=>assert.fail('No network during render')}};
  const {Header}=load('../src/modules/shared/Header.tsx',dependencies),{Footer}=load('../src/modules/shared/Footer.tsx',dependencies);
  const header=renderToStaticMarkup(React.createElement(Header)),footer=renderToStaticMarkup(React.createElement(Footer));
  if(configured){assert.match(header,/<img[^>]*class="public-brand-logo"[^>]*alt="Brand"[^>]*height:40px/);assert.doesNotMatch(header,/class="brand-name"/);assert.match(footer,/<img[^>]*class="public-footer-logo"[^>]*alt="Brand"[^>]*height:60px/);}
  else{assert.match(header,/class="brand-name">Brand/);assert.match(footer,/class="live-footer-wordmark"[^>]*>Brand/);}
 }
});

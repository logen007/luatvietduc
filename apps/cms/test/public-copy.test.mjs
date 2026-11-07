import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {parsePublicCopy,mergePublicCopy,PUBLIC_COPY_MODULES} from '../src/modules/shared/public-copy.mjs';
import {readPublicCopy} from '../src/modules/shared/public-copy.server.ts';
import {LocaleProvider,useLocale} from '../src/modules/shared/locale/index.tsx';
import {usePublicCopy} from '../src/modules/public-site/ui.tsx';
test('snapshot edits reach the first server-rendered VI/DE text and remain plain escaped text',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'lvd-copy-'));
 try{
  fs.mkdirSync(path.join(root,'content'));fs.writeFileSync(path.join(root,'release.json'),'{}');
  for(const name of PUBLIC_COPY_MODULES)fs.writeFileSync(path.join(root,'content',name+'.json'),JSON.stringify({version:1,text:{}}));
  const save=value=>fs.writeFileSync(path.join(root,'content/home.json'),JSON.stringify({version:1,text:{Hello:{vi:value,de:'Guten Tag {name}'}}}));
  function Copy(){const l=usePublicCopy(),{t}=useLocale();return React.createElement('p',null,l('Hello','Old German'),' / ',t('Hello',{name:'Anh'}));}
  const render=language=>renderToStaticMarkup(React.createElement(LocaleProvider,{language,copy:readPublicCopy(root)},React.createElement(Copy)));
  save('Xin chào');assert.equal(render('vi'),'<p>Xin chào / Xin chào</p>');
  save('<script>new</script>');assert.ok(render('vi').includes('&lt;script&gt;new&lt;/script&gt;'));assert.ok(render('de').includes('Guten Tag Anh'));
  fs.writeFileSync(path.join(root,'content/home.json'),'invalid');assert.deepEqual(readPublicCopy(root),{});
 }finally{fs.rmSync(root,{recursive:true});}
});
test('copy catalog fails closed for malformed language values and oversized payloads',()=>{
 for(const value of [null,[],{version:2,text:{}},{version:1,text:[]},{version:1,text:{x:{vi:1,de:'x'}}},{version:1,text:{x:{vi:'x',de:'y',href:'/admin'}}}])assert.throws(()=>parsePublicCopy(value));
});

test('content modules cannot silently shadow the same label',()=>{const c={version:1,text:{Hello:{vi:'Chào',de:'Hallo'}}};assert.throws(()=>mergePublicCopy([c,c]));});

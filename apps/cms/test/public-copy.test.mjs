import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {spawnSync} from 'node:child_process';
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {parsePublicCopy,mergePublicCopy,PUBLIC_COPY_MODULES} from '../src/modules/shared/public-copy.mjs';
import {readPublicCopy} from '../src/modules/shared/public-copy.server.ts';
import {LocaleProvider,useLocale} from '../src/modules/shared/locale/index.tsx';
import {usePublicCopy} from '../src/modules/public-site/ui.tsx';
import {ChatMessages} from '../src/modules/chat/ui/Messages.tsx';
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

test('the real server copy crosses the React Server Components boundary',()=>{
 const result=spawnSync(process.execPath,['--conditions=react-server','--import','tsx','--input-type=module','-e',`
  import {createRequire} from 'node:module';import {Writable} from 'node:stream';
  import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
  import {readPublicCopy} from './src/modules/shared/public-copy.server.ts';
  import {PUBLIC_COPY_MODULES} from './src/modules/shared/public-copy.mjs';
  const require=createRequire(import.meta.url),{renderToPipeableStream}=require('next/dist/compiled/react-server-dom-webpack/server.node');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'lvd-rsc-copy-'));
  try{
   fs.mkdirSync(path.join(root,'content'));fs.writeFileSync(path.join(root,'release.json'),'{}');
   for(const name of PUBLIC_COPY_MODULES)fs.copyFileSync('public/content/'+name+'.json',path.join(root,'content',name+'.json'));
   const copy=readPublicCopy(root),errors=[];
   if(!Object.keys(copy).length)throw Error('Catalog did not load');
   await new Promise(resolve=>renderToPipeableStream({copy},{},{onError:error=>errors.push(error.message)}).pipe(new Writable({write(chunk,encoding,done){done();},final(done){done();resolve();}})));
   if(errors.length)throw Error(errors.join('; '));
  }finally{fs.rmSync(root,{recursive:true});}
 `],{cwd:process.cwd(),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr||result.stdout);
});

test('handoff copy is concise in both languages, with optional registration and phone only while queued',()=>{
 const copy=mergePublicCopy(PUBLIC_COPY_MODULES.map(name=>JSON.parse(fs.readFileSync('public/content/'+name+'.json','utf8'))));
 const state={messages:[{id:'1',role:'assistant',body:'Old handoff text',created_at:'2026-11-07T10:00:00Z',metadata:{kind:'handoff'}}],conversation:{state:'queued',aiEnabled:false},me:null,selected:'chat-1'};
 const render=(language)=>renderToStaticMarkup(React.createElement(LocaleProvider,{language,copy},React.createElement(ChatMessages,{state})));
 const vi=render('vi');assert.ok(vi.includes('Mình đã chuyển nội dung'));assert.ok(vi.includes('để lưu trao đổi'));assert.ok(!vi.includes('Old handoff text'));assert.equal(vi.match(/Để lại số điện thoại/g)?.length,1);
 const de=render('de');assert.ok(de.includes('Ich habe Ihr Anliegen'));assert.ok(de.includes('Konto erstellen'));assert.ok(!de.includes('Sie sich, um'));
 state.me={user:{id:'1'}};assert.ok(!render('vi').includes('để lưu trao đổi'));assert.ok(render('vi').includes('Để lại số điện thoại'));
 state.messages[0]={...state.messages[0],role:'staff',body:'Specialist original reply'};assert.ok(render('vi').includes('Specialist original reply'));assert.ok(!render('vi').includes('Mình đã chuyển nội dung'));
});

test('attachment handoff invites a guest once without requiring an assistant handoff message',()=>{
 const copy=mergePublicCopy(PUBLIC_COPY_MODULES.map(name=>JSON.parse(fs.readFileSync('public/content/'+name+'.json','utf8'))));
 const state={messages:[{id:'2',role:'user',body:'Tài liệu của tôi',created_at:'2026-11-08T10:00:00Z',attachments:[{id:'file-1',name:'sample.pdf',size:1000,url:'/service/chat-files/file-1'}]}],conversation:{state:'queued',aiEnabled:false},me:null,selected:'chat-1'};
 const render=(language='vi')=>renderToStaticMarkup(React.createElement(LocaleProvider,{language,copy},React.createElement(ChatMessages,{state})));
 assert.equal(render().match(/class="chat-login-message"/g)?.length,1);
 assert.ok(render('de').includes('Konto erstellen'));
 assert.ok(render().includes('sample.pdf'));
 state.me={user:{id:'1'}};assert.ok(!render().includes('class="chat-login-message"'));assert.equal(render().match(/Để lại số điện thoại/g)?.length,1);
 state.me=null;state.conversation.aiEnabled=true;assert.ok(!render().includes('class="chat-login-message"'));
 state.conversation.aiEnabled=false;state.conversation.state='human';assert.ok(!render().includes('class="chat-login-message"'));
 state.conversation.state='queued';state.messages=[];assert.ok(!render().includes('class="chat-login-message"'));
});

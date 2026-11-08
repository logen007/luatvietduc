import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {translate,LocaleDate,LocaleProvider} from '../src/modules/shared/locale/index.tsx';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const dictionary=JSON.parse(fs.readFileSync(new URL('../src/modules/shared/locale/de.json',import.meta.url)));
test('locale preserves original messages and interpolates names',()=>{
 assert.equal(translate('Xin chào, {name}','de',{name:'Nguyễn Văn A'}),'Hallo, Nguyễn Văn A');
 assert.equal(translate('Đăng nhập','vi'),'Đăng nhập');assert.equal(translate('Đăng nhập','de'),'Anmelden');
 assert.equal(translate('Original customer message','de'),'Original customer message');
});

test('many translated components share one locale cookie write, including after switching language',()=>{
 let cookie='other=value',writes=0;const effects=[],exports={};
 const document={documentElement:{lang:'vi'},get cookie(){return cookie;},set cookie(value){writes++;cookie='other=value; '+value.split(';')[0];},dispatchEvent(){}};
 const source=ts.transpileModule(fs.readFileSync(new URL('../src/modules/shared/locale/index.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(source,{exports,document,location:{protocol:'https:'},sessionStorage:{getItem:()=>null,setItem(){}},CustomEvent:class{},require:name=>({
  react:{createContext:value=>({value}),useContext:context=>context.value,useEffect:fn=>effects.push(fn),useSyncExternalStore:(_subscribe,get)=>get()},
  'react/jsx-runtime':{},'./de.json':{default:{}},'./vi.json':{default:{}},'./ascii-transition':{withAsciiTransition:update=>update()},
 }[name]??assert.fail(name))});
 const render=()=>{for(let i=0;i<50;i++)exports.useLocale();while(effects.length)effects.shift()();};
 render();assert.equal(writes,1);assert.match(cookie,/other=value; lvd-lang=vi/);
 render();assert.equal(writes,1,'Mounting more labels must not rewrite the same cookie');
 exports.setLanguage('de');render();assert.equal(writes,2);assert.equal(document.documentElement.lang,'de');assert.match(cookie,/lvd-lang=de/);
});
test('public interface has no Vietnamese text nodes or static labels outside translation calls',()=>{
 const files=['app/(frontend)/tai-khoan/page.tsx','modules/identity/AccountForm.tsx','modules/shared/Header.tsx','modules/shared/Footer.tsx','modules/shared/SocialLinks.tsx','modules/chat/CustomerWorkspace.tsx',...['Composer','History','Messages'].map(n=>'modules/chat/ui/'+n+'.tsx')];
 const brand=new Set(['Luật Việt Đức','LUẬT VIỆT ĐỨC','© Luật Việt Đức. · v','×']);
 for(const file of files){const ast=ts.createSourceFile(file,fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function visit(node){
   if(ts.isJsxText(node)){const text=node.text.replace(/\s+/g,' ').trim();if(/[À-ỹ]/.test(text))assert.ok(brand.has(text),file+': untranslated '+text);}
   if(ts.isJsxAttribute(node)&&['aria-label','placeholder','title'].includes(node.name.getText(ast))&&node.initializer&&ts.isStringLiteral(node.initializer))assert.ok(!/[À-ỹ]/.test(node.initializer.text),file+': untranslated attribute '+node.initializer.text);
   if(ts.isCallExpression(node)&&node.expression.getText(ast)==='t'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0]))assert.ok(dictionary[node.arguments[0].text],file+': missing translation '+node.arguments[0].text);
   ts.forEachChild(node,visit);
  }visit(ast);
 }
});

test('legacy build uses shared dictionary, translates dynamic counts and switches back cleanly',async()=>{
 const {augmentBilingual}=await import('../scripts/locale-build.mjs');const vm=await import('node:vm');
 const raw=fs.readFileSync(new URL('../../../assets/bilingual.js',import.meta.url),'utf8'),source=augmentBilingual(raw,dictionary);
 const nodes=['Hội thoại của tôi','12 bài viết','Trang 2 / 4'].map(nodeValue=>({nodeValue,parentElement:{closest:()=>null}})),storage=new Map([['lvd-lang','de']]);
 const doc={documentElement:{},body:{},querySelectorAll:()=>[],addEventListener:()=>{},dispatchEvent:()=>{},createTreeWalker:()=>{let i=0;return{nextNode:()=>nodes[i++]||null};}};
 const win={addEventListener:()=>{},dispatchEvent:()=>{}};const queue=[];
 vm.runInNewContext(source,{window:win,document:doc,sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},NodeFilter:{SHOW_TEXT:4},CustomEvent:class{},Event:class{},queueMicrotask:fn=>queue.push(fn),setTimeout:()=>{}});
 win.LVD_I18N.refresh();assert.deepEqual(nodes.map(n=>n.nodeValue),['Meine Gespräche','12 Beiträge','Seite 2 / 4']);
 win.LVD_I18N.set('vi');while(queue.length)queue.shift()();assert.deepEqual(nodes.map(n=>n.nodeValue),['Hội thoại của tôi','12 bài viết','Trang 2 / 4']);
 assert.equal(storage.get('lvd-lang'),'vi');assert.throws(()=>augmentBilingual('unexpected source',dictionary),/marker changed/);
});

test('both deployment and development prepare the shared legacy locale',()=>{
 for(const file of ['prepare-container.mjs','prepare-frontend.mjs'])assert.match(fs.readFileSync(new URL('../scripts/'+file,import.meta.url),'utf8'),/await writeInterfaceLocale\(pub\)/);
});


test('account rate-limit feedback is translated to German while preserving Vietnamese',()=>{
 const message='Bạn thao tác quá nhanh. Vui lòng thử lại sau một phút.';
 assert.equal(translate(message,'vi'),message);
 assert.equal(translate(message,'de'),'Sie führen zu viele Aktionen aus. Bitte versuchen Sie es in einer Minute erneut.');
});


test('article dates keep one calendar day across server and browser timezones',()=>{
 const original=process.env.TZ,value='2026-11-06T23:30:00.000Z';
 try{
  for(const language of ['vi','de']){
   const render=()=>renderToStaticMarkup(createElement(LocaleProvider,{language},createElement(LocaleDate,{value})));
   process.env.TZ='UTC';const server=render();
   for(const timezone of ['Asia/Tokyo','America/Los_Angeles','Europe/Berlin']){process.env.TZ=timezone;assert.equal(render(),server,language+' '+timezone);}
  }
 }finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
});

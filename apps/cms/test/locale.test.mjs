import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {translate} from '../src/modules/shared/locale/index.tsx';
const dictionary=JSON.parse(fs.readFileSync(new URL('../src/modules/shared/locale/de.json',import.meta.url)));
test('locale preserves original messages and interpolates names',()=>{
 assert.equal(translate('Xin chào, {name}','de',{name:'Nguyễn Văn A'}),'Hallo, Nguyễn Văn A');
 assert.equal(translate('Đăng nhập','vi'),'Đăng nhập');assert.equal(translate('Đăng nhập','de'),'Anmelden');
 assert.equal(translate('Original customer message','de'),'Original customer message');
});
test('public interface has no Vietnamese text nodes or static labels outside translation calls',()=>{
 const files=['app/(frontend)/tai-khoan/page.tsx','modules/shared/Header.tsx','modules/shared/Footer.tsx','modules/shared/SocialLinks.tsx','modules/chat/CustomerWorkspace.tsx',...['Composer','History','Messages'].map(n=>'modules/chat/ui/'+n+'.tsx')];
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

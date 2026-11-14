import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function harness(){
 const document={documentElement:{lang:'vi'},activeElement:null,querySelector:()=>null};
 class Element extends EventTarget{
  constructor(tag){super();this.tag=tag;this.children=[];this.isConnected=true;this.open=false;}
  set innerHTML(_){throw Error('Never inject dialog HTML');}
  setAttribute(key,value){this[key]=value;}
  append(...nodes){this.children.push(...nodes);}
  remove(){this.isConnected=false;}
  showModal(){this.open=true;}
  close(){this.open=false;this.dispatchEvent(new Event('close'));}
  focus(){document.activeElement=this;}
  getBoundingClientRect(){return {left:10,right:200,top:10,bottom:200};}
 }
 document.body=new Element('body');document.createElement=tag=>new Element(tag);
 const trigger=new Element('button');trigger.focus();
 const exports={},window=new EventTarget();
 const source=ts.transpileModule(fs.readFileSync(new URL('../src/modules/shared/confirm-dialog.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{exports,document,window,HTMLElement:Element,Promise});
 const dialog=()=>document.body.children.at(-1),accept=()=>dialog().children.at(-1).children[1],cancel=()=>dialog().children.at(-1).children[0];
 return {confirm:exports.confirmAction,dialog,accept,cancel,trigger,document,window};
}
test('confirm is explicit, cancellation gets focus, and message text cannot inject markup',async()=>{
 const h=harness(),pending=h.confirm({title:'Xóa hội thoại?',message:'<img src=x onerror=alert(1)>',confirmLabel:'Xóa hội thoại',danger:true});
 assert.equal(h.dialog().open,true);assert.equal(h.document.activeElement,h.cancel());assert.equal(h.dialog().children[2].textContent,'<img src=x onerror=alert(1)>');
 assert.equal(await h.confirm({title:'Second',message:'Must not overlap'}),false);
 h.accept().dispatchEvent(new Event('click'));assert.equal(await pending,true);assert.equal(h.document.activeElement,h.trigger);assert.equal(h.dialog().isConnected,false);
});
test('cancel, close, Escape, backdrop and page changes fail closed and release the modal',async()=>{
 for(const action of ['cancel','close','escape','backdrop','pagehide','popstate']){
  const h=harness(),pending=h.confirm({title:'Confirm',message:'Synthetic'});
  if(action==='cancel')h.cancel().dispatchEvent(new Event('click'));
  if(action==='close')h.dialog().children[0].dispatchEvent(new Event('click'));
  if(action==='escape')h.dialog().dispatchEvent(new Event('cancel',{cancelable:true}));
  if(action==='backdrop'){const e=new Event('click');Object.defineProperties(e,{clientX:{value:0},clientY:{value:0}});h.dialog().dispatchEvent(e);}
  if(action==='pagehide'||action==='popstate')h.window.dispatchEvent(new Event(action));
  assert.equal(await pending,false,action);assert.equal(h.document.activeElement,h.trigger);
  const next=h.confirm({title:'Next',message:'Allowed'});h.cancel().dispatchEvent(new Event('click'));assert.equal(await next,false);
 }
});

import {asciiFrame} from './ascii';

let cancelActive=()=>{};
const duration=350;
const excluded='script,style,noscript,template,svg,canvas,input,textarea,select,option,[contenteditable],[data-no-locale-animation],.sr-only,[aria-hidden="true"]';
type Visual={overlay:HTMLSpanElement;text:string;current:()=>boolean;measure:()=>DOMRect};
function paintStyle(style:CSSStyleDeclaration){return {fontFamily:style.fontFamily,fontSize:style.fontSize,fontWeight:style.fontWeight,fontStyle:style.fontStyle,lineHeight:style.lineHeight,letterSpacing:style.letterSpacing,textAlign:style.textAlign,textTransform:style.textTransform,whiteSpace:style.whiteSpace,color:style.color,opacity:style.opacity};}
type PaintStyle=ReturnType<typeof paintStyle>;
const visible=(box:DOMRect)=>box.width>0&&box.height>0&&box.bottom>0&&box.top<innerHeight&&box.right>0&&box.left<innerWidth;

// Range highlights mask only text glyphs: nested labels, icons, React nodes,
// accessible names and entered form values retain their original DOM and styles.
export function withAsciiTransition(update:()=>void){
 cancelActive();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 update();
 if(reduced.matches||document.hidden||typeof Highlight==='undefined'||!CSS.highlights)return;
 let frame=0,lastDraw=-Infinity,visuals:Visual[]=[];
 const layers=new Map<HTMLElement,HTMLSpanElement>(),fields=new Set<HTMLElement>();
 // A translated page can adjust its scroll anchor near the footer. Keep the
 // decorative copy aligned; only an actual user gesture cancels the effect.
 const align=()=>{for(const visual of visuals){if(!visual.current())continue;const box=visual.measure();Object.assign(visual.overlay.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px',visibility:visible(box)?'visible':'hidden'});}};
 const sheet=document.createElement('style');
 sheet.textContent='::highlight(lvd-ascii){color:transparent}[data-lvd-ascii-field="placeholder"]::placeholder{color:transparent!important;-webkit-text-fill-color:transparent!important}[data-lvd-ascii-field="label"]{color:transparent!important;-webkit-text-fill-color:transparent!important}';
 const stop=()=>{
  cancelAnimationFrame(frame);CSS.highlights.delete('lvd-ascii');sheet.remove();
  for(const layer of layers.values())layer.remove();
  for(const field of fields)field.removeAttribute('data-lvd-ascii-field');
  layers.clear();fields.clear();visuals=[];
  window.removeEventListener('scroll',align,true);window.removeEventListener('wheel',stop,true);window.removeEventListener('touchmove',stop,true);window.removeEventListener('resize',stop);
  window.removeEventListener('pagehide',stop);document.removeEventListener('pointerdown',stop,true);
  document.removeEventListener('keydown',stop,true);document.removeEventListener('input',stop,true);
  document.removeEventListener('visibilitychange',stop);reduced.removeEventListener('change',stop);
  if(cancelActive===stop)cancelActive=()=>{};
 };
 cancelActive=stop;
 window.addEventListener('scroll',align,{capture:true,passive:true});window.addEventListener('wheel',stop,{capture:true,passive:true});window.addEventListener('touchmove',stop,{capture:true,passive:true});window.addEventListener('resize',stop);
 window.addEventListener('pagehide',stop);document.addEventListener('pointerdown',stop,true);
 document.addEventListener('keydown',stop,true);document.addEventListener('input',stop,true);
 document.addEventListener('visibilitychange',stop);reduced.addEventListener('change',stop);
 frame=requestAnimationFrame(()=>{
  const ranges:Range[]=[],ready:{node:Node;box:DOMRect;style:PaintStyle;text:string;current:()=>boolean;measure:()=>DOMRect}[]=[];
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let next:Node|null;
  while((next=walker.nextNode())){
   const node=next as Text,element=node.parentElement,text=node.data;
   if(!element||element.closest(excluded)||!/[\p{L}\p{N}]/u.test(text))continue;
   const style=getComputedStyle(element);
   if(style.visibility!=='visible'||style.opacity==='0'||style.color==='transparent'||style.color==='rgba(0, 0, 0, 0)')continue;
   // Split only at actual browser line/bidi fragments. No tag whitelist, text
   // length limit or item cap, and no reconstruction of a parent's inline layout.
   function collect(start:number,end:number){
    const range=document.createRange();range.setStart(node,start);range.setEnd(node,end);
    const boxes=Array.from(range.getClientRects());if(!boxes.some(visible))return;
    if(boxes.length>1&&end-start>1){let middle=Math.floor((start+end)/2);if(middle<end&&/[\uDC00-\uDFFF]/.test(text[middle]))middle++;if(middle<end){collect(start,middle);collect(middle,end);return;}}
    const box=range.getBoundingClientRect(),content=text.slice(start,end);
    if(!visible(box)||!content.trim())return;
    ranges.push(range);ready.push({node,box,style:paintStyle(style),text:content,current:()=>node.isConnected&&node.data===text,measure:()=>range.getBoundingClientRect()});
   }
   collect(0,text.length);
  }
  // Native controls paint their labels outside the text-node tree. Animate only
  // empty-field placeholders or UI labels, never passwords or entered values.
  for(const field of document.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('input,textarea,select')){
   if(field.closest('[data-no-locale-animation],[aria-hidden="true"],.sr-only'))continue;
   let text='',kind='placeholder';
   if(field instanceof HTMLSelectElement){text=field.selectedOptions[0]?.textContent||'';kind='label';}
   else if(field instanceof HTMLInputElement&&['button','submit','reset'].includes(field.type)){text=field.value;kind='label';}
   else if(!field.value)text=field.placeholder;
   const box=field.getBoundingClientRect(),base=getComputedStyle(field);
   if(!text.trim()||!visible(box)||base.visibility!=='visible'||base.opacity==='0')continue;
   const style=kind==='placeholder'?getComputedStyle(field,'::placeholder'):base;
   const left=parseFloat(base.paddingLeft)+parseFloat(base.borderLeftWidth),right=parseFloat(base.paddingRight)+parseFloat(base.borderRightWidth);
   const top=parseFloat(base.paddingTop)+parseFloat(base.borderTopWidth),bottom=parseFloat(base.paddingBottom)+parseFloat(base.borderBottomWidth);
   const measure=()=>{const current=field.getBoundingClientRect();return new DOMRect(current.left+left,current.top+top,Math.max(0,current.width-left-right),Math.max(0,current.height-top-bottom));},contentBox=measure();
   const value=field.value;
   ready.push({node:field,box:contentBox,style:paintStyle(style),text,measure,current:()=>field.isConnected&&field.value===value&&(field instanceof HTMLSelectElement?(field.selectedOptions[0]?.textContent||'')===text:kind==='placeholder'?field.placeholder===text:field.value===text)});
   fields.add(field);field.dataset.lvdAsciiField=kind;
  }
  if(!ready.length){stop();return;}
  document.head.append(sheet);CSS.highlights.set('lvd-ascii',new Highlight(...ranges));
  for(const item of ready){
   const element=item.node instanceof HTMLElement?item.node:item.node.parentElement!;
   const host=element.closest<HTMLDialogElement>('dialog[open]')||document.body;
   let layer=layers.get(host);
   if(!layer){layer=document.createElement('span');layer.dataset.lvdAscii='';layer.setAttribute('aria-hidden','true');layer.inert=true;Object.assign(layer.style,{position:'fixed',inset:'0',overflow:'hidden',pointerEvents:'none',userSelect:'none',zIndex:'2147483000',contain:'strict'});layers.set(host,layer);host.append(layer);}
   const overlay=document.createElement('span'),style=item.style;
   Object.assign(overlay.style,{
    position:'absolute',left:item.box.left+'px',top:item.box.top+'px',width:item.box.width+'px',height:item.box.height+'px',
    fontFamily:style.fontFamily,fontSize:style.fontSize,fontWeight:style.fontWeight,fontStyle:style.fontStyle,
    lineHeight:item.node instanceof HTMLElement?style.lineHeight:item.box.height+'px',letterSpacing:style.letterSpacing,textAlign:item.node instanceof HTMLElement?style.textAlign:'left',textTransform:style.textTransform,
    whiteSpace:item.node instanceof HTMLTextAreaElement?'pre-wrap':style.whiteSpace==='pre'||style.whiteSpace==='pre-wrap'?'pre':'nowrap',overflow:'hidden',
    color:style.color,webkitTextFillColor:style.color,opacity:style.opacity,margin:'0',padding:'0',border:'0',
   });
   overlay.textContent=asciiFrame(item.text,0);layer.append(overlay);visuals.push({overlay,text:item.text,current:item.current,measure:item.measure});
  }
  const start=performance.now();
  const draw=(now:number)=>{
   const progress=(now-start)/duration;
   if(progress>=1){stop();return;}
   if(now-lastDraw>=30){for(const visual of visuals){if(!visual.current()){stop();return;}visual.overlay.textContent=asciiFrame(visual.text,progress);}lastDraw=now;}
   frame=requestAnimationFrame(draw);
  };
  frame=requestAnimationFrame(draw);
 });
}

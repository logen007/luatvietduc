import {asciiFrame} from './ascii';

let cancelActive=()=>{};
const duration=350;
const excluded='script,style,noscript,template,svg,canvas,input,textarea,select,option,[contenteditable],[data-no-locale-animation],.sr-only,[aria-hidden="true"]';
const visible=(box:DOMRect)=>box.width>0&&box.height>0&&box.bottom>0&&box.top<innerHeight&&box.right>0&&box.left<innerWidth;
type Target={read:()=>string;write:(text:string)=>void;text:string;painted:string;glyph:(character:string)=>string};

// Animate the existing text nodes. No copied text, positioned layer or glyph mask.
// Restore only values we still own, so a React update or incoming message wins.
export function withAsciiTransition(update:()=>void){
 cancelActive();update();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(reduced.matches||document.hidden)return;
 let frame=0,lastDraw=-Infinity;
 const targets:Target[]=[],restore:(()=>void)[]=[],marked=new Set<Element>();
 const ownAttribute=(element:Element,name:string,value:string)=>{
  const previous=element.getAttribute(name);element.setAttribute(name,value);
  restore.push(()=>{if(element.getAttribute(name)!==value)return;if(previous===null)element.removeAttribute(name);else element.setAttribute(name,previous);});
 };
 const stop=()=>{
  cancelAnimationFrame(frame);
  for(const target of targets)if(target.read()===target.painted)target.write(target.text);
  for(const reset of restore.reverse())reset();
  targets.length=0;restore.length=0;
  window.removeEventListener('wheel',stop,true);window.removeEventListener('touchmove',stop,true);window.removeEventListener('resize',stop);
  window.removeEventListener('pagehide',stop);document.removeEventListener('pointerdown',stop,true);
  document.removeEventListener('keydown',stop,true);document.removeEventListener('input',stop,true);
  document.removeEventListener('visibilitychange',stop);reduced.removeEventListener('change',stop);
  if(cancelActive===stop)cancelActive=()=>{};
 };
 cancelActive=stop;
 window.addEventListener('wheel',stop,{capture:true,passive:true});window.addEventListener('touchmove',stop,{capture:true,passive:true});window.addEventListener('resize',stop);
 window.addEventListener('pagehide',stop);document.addEventListener('pointerdown',stop,true);
 document.addEventListener('keydown',stop,true);document.addEventListener('input',stop,true);
 document.addEventListener('visibilitychange',stop);reduced.addEventListener('change',stop);
 frame=requestAnimationFrame(()=>{
  const context=document.createElement('canvas').getContext('2d');
  const fonts=new Map<string,{widths:{glyph:string;width:number}[];matches:Map<string,string[]>}>();
  // Similar glyph widths keep words close to their final measure while scrambling.
  const glyphsFor=(element:Element)=>{
   const style=getComputedStyle(element),font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
   if(context&&!fonts.has(font)){context.font=font;fonts.set(font,{widths:Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789').map(glyph=>({glyph,width:context.measureText(glyph).width})),matches:new Map()});}
   return (character:string)=>{
    if(!context)return character;
    const metrics=fonts.get(font)!;let matches=metrics.matches.get(character);
    if(!matches){context.font=font;const width=context.measureText(character).width,best=Math.min(...metrics.widths.map(item=>Math.abs(item.width-width)));matches=metrics.widths.filter(item=>Math.abs(item.width-width)<=best+.2).map(item=>item.glyph);metrics.matches.set(character,matches);}
    return matches[Math.floor(Math.random()*matches.length)]||character;
   };
  };
  const add=(element:Element,read:()=>string,write:(text:string)=>void,kind='text')=>{
   const text=read();if(!/[\p{L}\p{N}]/u.test(text)||!visible(element.getBoundingClientRect()))return;
   const style=getComputedStyle(element);if(style.visibility!=='visible'||style.opacity==='0')return;
   targets.push({read,write,text,painted:text,glyph:glyphsFor(element)});
   if(!marked.has(element)){
    marked.add(element);ownAttribute(element,kind==='text'?'data-lvd-ascii-text':'data-lvd-ascii-field',kind);
    // Keep semantic control/heading names stable while their visible glyphs move.
    const semantic=element.closest('a,button,h1,h2,h3,h4,h5,h6,summary,[role="button"]');
    if(semantic&&!semantic.hasAttribute('aria-label')&&!semantic.hasAttribute('aria-labelledby'))ownAttribute(semantic,'aria-label',semantic.textContent||text);
   }
  };
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes:Text[]=[];let next:Node|null;
  while((next=walker.nextNode())){const node=next as Text;if(node.parentElement&&!node.parentElement.closest(excluded))nodes.push(node);}
  for(const node of nodes){const range=document.createRange();range.selectNodeContents(node);if(!Array.from(range.getClientRects()).some(visible))continue;add(node.parentElement!,()=>node.isConnected?node.data:'',value=>{node.data=value;});}
  for(const field of document.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('input,textarea,select')){
   if(field.closest('[data-no-locale-animation],[aria-hidden="true"],.sr-only,[contenteditable]')||!visible(field.getBoundingClientRect()))continue;
   if(field instanceof HTMLSelectElement){
    const option=field.selectedOptions[0],node=option?.firstChild;
    if(!option||!(node instanceof Text)||option.childNodes.length!==1)continue;
    // An option without an explicit value derives it from its label. Freeze that
    // value until the original label is restored; never change the form selection.
    if(!option.hasAttribute('value'))ownAttribute(option,'value',option.value);
    add(field,()=>node.isConnected?node.data:'',value=>{node.data=value;},'label');
   }else if(field instanceof HTMLInputElement&&['button','submit','reset'].includes(field.type))add(field,()=>field.value,value=>{field.value=value;},'label');
   else if(!field.value)add(field,()=>field.placeholder,value=>{field.placeholder=value;},'placeholder');
  }
  if(!targets.length){stop();return;}
  const start=performance.now();
  const draw=(now:number)=>{
   const progress=(now-start)/duration;if(progress>=1){stop();return;}
   if(now-lastDraw>=30){for(const target of targets){if(target.read()!==target.painted)continue;target.painted=asciiFrame(target.text,progress,Math.random,target.glyph);target.write(target.painted);}lastDraw=now;}
   frame=requestAnimationFrame(draw);
  };
  draw(start);
 });
}

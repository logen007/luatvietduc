import {asciiFrame} from './ascii';

let cancelActive=()=>{};
const excluded='.chat-log,.operator-log,.native-story-text,.live-reading-layout,[contenteditable],[translate="no"],[data-no-locale-animation],.sr-only,[aria-hidden="true"]';
type Visual={element:HTMLElement;overlay:HTMLSpanElement;text:string;content:string;color:string;priority:string};

function candidates(){
 const before=new Map<HTMLElement,string>();
 for(const element of document.querySelectorAll<HTMLElement>('h1,h2,h3,h4,p,a,button,span,small,strong,label,legend,summary')){
  if(before.size>=40)break;
  if(element.closest(excluded)||Array.from(element.children).some(child=>child.tagName!=='BR'))continue;
  const text=element.textContent||'';if(!text.trim()||text.length>480)continue;
  const box=element.getBoundingClientRect();
  if(box.width&&box.height&&box.bottom>0&&box.top<innerHeight&&box.right>0&&box.left<innerWidth)before.set(element,text);
 }
 return before;
}

// A decorative overlay keeps the actual translated DOM, accessible names,
// inputs and React-owned text intact throughout the animation.
export function withAsciiTransition(update:()=>void){
 cancelActive();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(reduced.matches||document.hidden){update();return;}
 const before=candidates();update();
 let frame=0,visuals:Visual[]=[],lastDraw=-Infinity;
 const stop=()=>{
  cancelAnimationFrame(frame);
  for(const visual of visuals){
   visual.overlay.remove();
   if(visual.element.style.getPropertyValue('color')==='transparent'){
    if(visual.color)visual.element.style.setProperty('color',visual.color,visual.priority);else visual.element.style.removeProperty('color');
   }
  }
  visuals=[];window.removeEventListener('scroll',stop,true);window.removeEventListener('resize',stop);
  window.removeEventListener('pagehide',stop);document.removeEventListener('pointerdown',stop,true);
  document.removeEventListener('keydown',stop,true);document.removeEventListener('visibilitychange',stop);
  reduced.removeEventListener('change',stop);if(cancelActive===stop)cancelActive=()=>{};
 };
 cancelActive=stop;
 window.addEventListener('scroll',stop,{capture:true,passive:true});window.addEventListener('resize',stop);
 window.addEventListener('pagehide',stop);document.addEventListener('pointerdown',stop,true);
 document.addEventListener('keydown',stop,true);document.addEventListener('visibilitychange',stop);reduced.addEventListener('change',stop);
 frame=requestAnimationFrame(()=>{
  // Read layout first, then append overlays and mask text in a separate pass.
  const ready=[];
  for(const [element,oldText] of before){
   const content=element.textContent||'';if(!element.isConnected||content===oldText)continue;
   const box=element.getBoundingClientRect(),style=getComputedStyle(element);
   if(!box.width||!box.height||style.color==='transparent'||style.color==='rgba(0, 0, 0, 0)')continue;
   const horizontal=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight)+parseFloat(style.borderLeftWidth)+parseFloat(style.borderRightWidth);
   const vertical=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)+parseFloat(style.borderTopWidth)+parseFloat(style.borderBottomWidth);
   const overlay=document.createElement('span');overlay.dataset.lvdAscii='';overlay.setAttribute('aria-hidden','true');overlay.inert=true;
   Object.assign(overlay.style,{
    position:'fixed',left:box.left+parseFloat(style.paddingLeft)+parseFloat(style.borderLeftWidth)+'px',
    top:box.top+parseFloat(style.paddingTop)+parseFloat(style.borderTopWidth)+'px',
    width:Math.max(0,box.width-horizontal)+'px',height:Math.max(0,box.height-vertical)+'px',
    fontFamily:style.fontFamily,fontSize:style.fontSize,fontWeight:style.fontWeight,fontStyle:style.fontStyle,
    lineHeight:style.lineHeight,letterSpacing:style.letterSpacing,textAlign:style.textAlign,textTransform:style.textTransform,
    whiteSpace:element.querySelector('br')?'pre-wrap':style.whiteSpace,overflow:'hidden',overflowWrap:style.overflowWrap,
    color:style.color,pointerEvents:'none',userSelect:'none',zIndex:'2147483000',margin:'0',padding:'0',border:'0',
   });
   ready.push({element,overlay,content,text:element.innerText,color:element.style.getPropertyValue('color'),priority:element.style.getPropertyPriority('color')});
  }
  visuals=ready;
  for(const visual of visuals){visual.overlay.textContent=asciiFrame(visual.text,0);document.body.append(visual.overlay);visual.element.style.setProperty('color','transparent','important');}
  if(!visuals.length){stop();return;}
  const start=performance.now();
  const draw=(now:number)=>{
   const progress=(now-start)/1500;
   if(progress>=1||visuals.some(visual=>!visual.element.isConnected||visual.element.textContent!==visual.content)){stop();return;}
   if(now-lastDraw>=30){for(const visual of visuals)visual.overlay.textContent=asciiFrame(visual.text,progress);lastDraw=now;}
   frame=requestAnimationFrame(draw);
  };
  frame=requestAnimationFrame(draw);
 });
}

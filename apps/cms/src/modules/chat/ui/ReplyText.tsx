"use client";
import {useLayoutEffect,useRef,useState} from 'react';

/** Reveal new replies once; expose complete text to assistive technology. */
export function ReplyText({text,animate}:{text:string;animate:boolean}){
 const [visible,setVisible]=useState(text.length),started=useRef(false),root=useRef<HTMLDivElement>(null),following=useRef(false);
 useLayoutEffect(()=>{
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(!animate||started.current||motion.matches||typeof Intl.Segmenter!=='function'){setVisible(text.length);return;}
  started.current=true;
  const segments=Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text));
  const duration=Math.min(6500,Math.max(400,segments.length*18));
  const log=root.current?.closest<HTMLElement>('.chat-log');
  const track=()=>{following.current=Boolean(log&&log.scrollHeight-log.scrollTop-log.clientHeight<120);};
  track();log?.addEventListener('scroll',track,{passive:true});
  let frame=0,start:number|undefined;
  const cleanup=()=>{cancelAnimationFrame(frame);log?.removeEventListener('scroll',track);motion.removeEventListener('change',reduced);};
  const reduced=()=>{if(motion.matches){cleanup();setVisible(text.length);}};
  const tick=(now:number)=>{
   start??=now;
   const count=Math.min(segments.length,Math.floor((now-start)/duration*segments.length));
   setVisible(count===segments.length?text.length:(segments[count]?.index??0));
   if(count<segments.length)frame=requestAnimationFrame(tick);else cleanup();
  };
  setVisible(0);frame=requestAnimationFrame(tick);motion.addEventListener('change',reduced);
  return cleanup;
 },[animate,text]);
 useLayoutEffect(()=>{
  if(visible>=text.length||!animate||!started.current||!following.current)return;
  const log=root.current?.closest<HTMLElement>('.chat-log');
  if(log){const previous=log.style.scrollBehavior;log.style.scrollBehavior='auto';log.scrollTop=log.scrollHeight;log.style.scrollBehavior=previous;}
 },[animate,text.length,visible]);
 return <div ref={root} data-revealing={visible<text.length}>
  <span className="sr-only">{text}</span>
  <div aria-hidden="true">{text.slice(0,visible).split(/\n\n+/).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>
 </div>;
}

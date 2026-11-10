'use client';
import {useEffect,useRef,useState} from 'react';
import {usePublicSettings} from '../settings/client';
import {latestHeroBanner,type HeroBanner} from '../settings/hero-banner';
import {usePublicCopy} from './ui';
export function HeroVideo({initial}:{initial:HeroBanner}){
 const settings=usePublicSettings(true),banner=latestHeroBanner(initial,settings?.heroBanner),l=usePublicCopy();
 const video=useRef<HTMLVideoElement>(null),toggleButton=useRef<HTMLButtonElement>(null),choice=useRef<'play'|'pause'|null>(null),[paused,setPaused]=useState(true);
 useEffect(()=>{
  const el=video.current,button=toggleButton.current;if(!el)return;
  let visible=false,ready=false,timer:ReturnType<typeof setTimeout>|undefined;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),mobile=window.matchMedia('(max-width:760px)'),connection=(navigator as Navigator&{connection?:EventTarget&{saveData?:boolean}}).connection;
  const sync=()=>{
   if((!ready&&choice.current!=='play')||document.hidden||!visible||choice.current==='pause'||(choice.current!=='play'&&(reduced.matches||connection?.saveData))){el.pause();return;}
   const source=mobile.matches?banner.mobileVideo:banner.video;
   if(el.getAttribute('src')!==source){el.src=source;el.load();}
   void el.play().catch(()=>setPaused(true));
  };
  const loaded=()=>{timer=setTimeout(()=>{ready=true;sync();},mobile.matches?3000:250);};if(document.readyState==='complete')loaded();else window.addEventListener('load',loaded,{once:true});
  const onPlay=()=>setPaused(false),onPause=()=>setPaused(true),observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});
  observer.observe(el);el.addEventListener('play',onPlay);el.addEventListener('pause',onPause);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);mobile.addEventListener('change',sync);connection?.addEventListener('change',sync);
  const toggle=()=>{choice.current=el.paused?'play':'pause';sync();};button?.addEventListener('click',toggle);sync();
  return()=>{window.removeEventListener('load',loaded);clearTimeout(timer);observer.disconnect();el.pause();el.removeAttribute('src');el.load();el.removeEventListener('play',onPlay);el.removeEventListener('pause',onPause);document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);mobile.removeEventListener('change',sync);connection?.removeEventListener('change',sync);button?.removeEventListener('click',toggle);};
 },[banner.video,banner.mobileVideo]);
 return <><link rel="preload" as="image" href={banner.poster} fetchPriority="high"/><video ref={video} className="pm-hero-video" muted loop playsInline preload="none" poster={banner.poster} aria-hidden="true" tabIndex={-1}/><button ref={toggleButton} className="pm-video-toggle" type="button" aria-label={paused?l('Phát video','Video abspielen'):l('Tạm dừng video','Video anhalten')} aria-pressed={paused}><svg className="pm-video-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg><svg className="pm-video-play" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg></button></>;
}

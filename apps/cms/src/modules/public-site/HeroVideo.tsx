'use client';
import {useEffect,useRef,useState} from 'react';
import {usePublicSettings} from '../settings/client';
import {latestHeroBanner,type HeroBanner} from '../settings/hero-banner';
import {usePublicCopy} from './ui';
export function HeroVideo({initial}:{initial:HeroBanner}){
 const settings=usePublicSettings(true),banner=latestHeroBanner(initial,settings?.heroBanner),l=usePublicCopy();
 const video=useRef<HTMLVideoElement>(null),toggleButton=useRef<HTMLButtonElement>(null),choice=useRef<'play'|'pause'|null>(null),[paused,setPaused]=useState(true),[hasFrame,setHasFrame]=useState(false);
 useEffect(()=>{
  const el=video.current,button=toggleButton.current;if(!el)return;
  let visible=false,active=true,frame:number|undefined,paint:number|undefined;
  const cancelFrame=()=>{if(frame!==undefined)el.cancelVideoFrameCallback(frame);if(paint!==undefined)cancelAnimationFrame(paint);frame=paint=undefined;};
  const onPlaying=()=>{
   cancelFrame();const source=el.getAttribute('src');
   const reveal=()=>{frame=paint=undefined;if(active&&el.getAttribute('src')===source)setHasFrame(true);};
   if(typeof el.requestVideoFrameCallback==='function')frame=el.requestVideoFrameCallback(reveal);
   else paint=requestAnimationFrame(()=>{paint=requestAnimationFrame(reveal);});
  };
  const onError=()=>{cancelFrame();setHasFrame(false);setPaused(true);};
  setHasFrame(false);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),mobile=window.matchMedia('(max-width:760px)'),connection=(navigator as Navigator&{connection?:EventTarget&{saveData?:boolean}}).connection;
  const sync=()=>{
   if(document.hidden||!visible||choice.current==='pause'||(choice.current!=='play'&&(reduced.matches||connection?.saveData))){el.pause();return;}
   const source=mobile.matches?banner.mobileVideo:banner.video;
   if(el.getAttribute('src')!==source){cancelFrame();setHasFrame(false);el.preload='auto';el.src=source;el.load();}
   void el.play().catch(()=>setPaused(true));
  };
  const onPlay=()=>setPaused(false),onPause=()=>setPaused(true),observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});
  observer.observe(el);el.addEventListener('play',onPlay);el.addEventListener('pause',onPause);el.addEventListener('playing',onPlaying);el.addEventListener('error',onError);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);mobile.addEventListener('change',sync);connection?.addEventListener('change',sync);
  const toggle=()=>{choice.current=el.paused?'play':'pause';sync();};button?.addEventListener('click',toggle);sync();
  return()=>{active=false;cancelFrame();observer.disconnect();el.pause();el.preload='none';el.removeAttribute('src');el.load();el.removeEventListener('play',onPlay);el.removeEventListener('pause',onPause);el.removeEventListener('playing',onPlaying);el.removeEventListener('error',onError);document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);mobile.removeEventListener('change',sync);connection?.removeEventListener('change',sync);button?.removeEventListener('click',toggle);};
 },[banner.video,banner.mobileVideo]);
 return <><link rel="preload" as="image" href={banner.poster} fetchPriority="high"/><video ref={video} className="pm-hero-video" muted loop playsInline preload="none" poster={banner.poster} aria-hidden="true" tabIndex={-1}/><img className="pm-hero-poster" src={banner.poster} alt="" fetchPriority="high" data-ready={hasFrame} aria-hidden="true"/><button ref={toggleButton} className="pm-video-toggle" type="button" aria-label={paused?l('Phát video','Video abspielen'):l('Tạm dừng video','Video anhalten')} aria-pressed={paused}><svg className="pm-video-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg><svg className="pm-video-play" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg></button></>;
}

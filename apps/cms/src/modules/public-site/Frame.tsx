'use client';
import {useEffect,useRef,useState} from 'react';
import {Header} from '../shared/Header';
import {Footer} from '../shared/Footer';
import {usePublicCopy} from './ui';
import {useScrollReveal} from './useScrollReveal';
export function PublicFrame({children,revision,scriptRevision=revision,home=false,section='',articleHero=false}:{children:React.ReactNode;revision:string;scriptRevision?:string;home?:boolean;section?:string;articleHero?:boolean}){
 const frame=useRef<HTMLDivElement>(null),[scrolled,setScrolled]=useState(false),l=usePublicCopy();
 useScrollReveal(frame,children);
 useEffect(()=>{
  if(!home&&!articleHero){setScrolled(false);return;}
  const root=frame.current,hero=root?.querySelector(home?'.pm-hero':'.live-reading-hero'),header=root?.querySelector('.site-header');
  if(!hero||!header)return;
  let pending=0;
  // Follow the actual dark-to-light boundary, including responsive hero height.
  const update=()=>{pending=0;setScrolled(hero.getBoundingClientRect().bottom<=header.getBoundingClientRect().bottom+48);};
  const schedule=()=>{if(!pending)pending=requestAnimationFrame(update);};
  const observer=new ResizeObserver(schedule);observer.observe(hero);observer.observe(header);
  update();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});
  return()=>{cancelAnimationFrame(pending);observer.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
 },[home,articleHero]);
 return <div ref={frame} className={'lvd-public-site lvd-redesign'+(home?' pm-home':'')+(articleHero?' pm-article-hero':'')+(scrolled?' pm-scrolled':'')}>
  <link rel="stylesheet" href="/assets/catalog.css" precedence="public-base"/>
  <link rel="stylesheet" href="/assets/features.css" precedence="public-base"/>
  <link rel="stylesheet" href="/assets/contact-legal.css" precedence="public-base"/>
  <link rel="stylesheet" href={'/editorial-ui.css?v='+revision} precedence="public"/>
  <a className="skip-link" href="#main">{l('Đi đến nội dung','Zum Inhalt')}</a>
  <Header publicMode activeSection={section}/><main id="main">{children}</main><Footer/>
  <script src={'/editorial-ui.js?v='+scriptRevision} defer/>
 </div>;
}

'use client';
import {useEffect,useState} from 'react';
import {Header} from '../shared/Header';
import {Footer} from '../shared/Footer';
import {usePublicCopy} from './ui';
export function PublicFrame({children,revision,home=false,section=''}:{children:React.ReactNode;revision:string;home?:boolean;section?:string}){
 const [scrolled,setScrolled]=useState(false),l=usePublicCopy();
 useEffect(()=>{if(!home)return;const update=()=>setScrolled(window.scrollY>80);update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update);},[home]);
 return <div className={'lvd-public-site lvd-redesign'+(home?' pm-home':'')+(scrolled?' pm-scrolled':'')}>
  <link rel="stylesheet" href="/assets/catalog.css" precedence="public-base"/>
  <link rel="stylesheet" href="/assets/features.css" precedence="public-base"/>
  <link rel="stylesheet" href="/assets/contact-legal.css" precedence="public-base"/>
  <link rel="stylesheet" href={'/editorial-ui.css?v='+revision} precedence="public"/>
  <a className="skip-link" href="#main">{l('Đi đến nội dung','Zum Inhalt')}</a>
  <Header publicMode activeSection={section}/><main id="main">{children}</main><Footer/>
  <script src={'/editorial-ui.js?v='+revision} defer/>
 </div>;
}

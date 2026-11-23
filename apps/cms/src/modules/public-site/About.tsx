'use client';
import type {ReactNode} from 'react';
import information from '../../../public/content/information.json';
import {useLocale} from '../shared/locale';
import {AppLink} from '../shared/AppLink';
import {Arrow,Breadcrumb} from './ui';

type CopyKey=keyof typeof information.text;
const missionIds=['knowledge','life','business','connection','community'] as const;
function Chapter({title,id,children}:{title:string;id:string;children:ReactNode}){
 return <section className="lvd-about-chapter" id={id} aria-labelledby={id+'-title'}><header><h2 id={id+'-title'}>{title}</h2></header><div className="lvd-about-chapter-body">{children}</div></section>;
}
export function About(){
 const {language,copy,t}=useLocale();
 const text=(key:CopyKey)=>copy[key]?.[language]??information.text[key][language];
 const paragraphs=(keys:readonly CopyKey[])=>keys.map(key=><p key={key}>{text(key)}</p>);
 return <div className="lvd-about-page">
  <div className="container page lvd-about-intro">
   <Breadcrumb title={t('Giới thiệu')}/>
   <header className="lvd-about-hero">
    <div className="lvd-about-hero-copy"><span className="lvd-about-eyebrow">{text('about.label')}</span><h1>{text('about.title')}</h1><p className="lvd-about-tagline">{text('about.tagline')}</p><div className="button-row"><AppLink className="button" href="/hoi-dap">{t('Mở trò chuyện')} <Arrow/></AppLink><AppLink className="lvd-about-text-link" href="/thu-vien">{t('Khám phá thư viện')} <Arrow/></AppLink></div></div>
    <figure className="lvd-about-hero-photo"><img src="/media/about/frankfurt-riverfront.webp" width={1440} height={960} alt={text('about.hero.photo')} decoding="async"/></figure>
   </header>
   <div className="lvd-about-opening">
    <div>{paragraphs(['about.intro.1','about.intro.2','about.intro.3'])}</div>
   </div>
  </div>
  <div className="container lvd-about-chapters">
   <Chapter id="gia-tri-cong-dong" title={text('about.community.title')}>
    {paragraphs(['about.community.2'])}
    <ul className="lvd-about-missions">{missionIds.map(id=><li key={id}><div><h3>{text(`about.mission.${id}.title`)}</h3><p>{text(`about.mission.${id}.body`)}</p></div></li>)}</ul>
   </Chapter>
   <div className="lvd-about-closing">
    <figure className="lvd-about-network-photo">
     <img src="/media/about/berlin-museum-island.webp" width={720} height={1080} alt={text('about.berlin.photo')} loading="lazy" decoding="async"/>
    </figure>
    <Chapter id="chat-luong-tri-thuc" title={text('about.quality.title')}>
     {paragraphs(['about.quality.3'])}
     <blockquote className="lvd-about-belief">{paragraphs(['about.belief.1'])}</blockquote>
     <p className="lvd-about-signature">{text('about.signature')}</p>
     <div className="button-row"><AppLink className="button" href="/hoi-dap">{t('Mở trò chuyện')} <Arrow/></AppLink><AppLink className="lvd-about-text-link" href="/lien-he">{t('Liên hệ')} <Arrow/></AppLink></div>
    </Chapter>
   </div>
  </div>
 </div>;
}

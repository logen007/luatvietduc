'use client';
import type {ReactNode} from 'react';
import information from '../../../public/content/information.json';
import {useLocale} from '../shared/locale';
import {AppLink} from '../shared/AppLink';
import {Arrow,Breadcrumb} from './ui';

type CopyKey=keyof typeof information.text;
const partnerIds=['bizlawyer','atsumi','michael','g2g','ami','frankfurt'] as const;
const missionIds=['knowledge','life','business','connection','community'] as const;
function Chapter({number,title,id,children}:{number:string;title:string;id:string;children:ReactNode}){
 return <section className="lvd-about-chapter" id={id} aria-labelledby={id+'-title'}><header><span className="lvd-about-chapter-number" aria-hidden="true">{number}</span><h2 id={id+'-title'}>{title}</h2></header><div className="lvd-about-chapter-body">{children}</div></section>;
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
    <figure className="lvd-about-hero-photo"><img src="/media/about/bizlawyer-exchange.webp" width={1440} height={1080} alt={text('Hoạt động trao đổi chuyên môn tại Bizlawyer & Partners')} decoding="async"/><figcaption>{text('Hoạt động trao đổi chuyên môn tại Bizlawyer & Partners')}</figcaption></figure>
   </header>
   <div className="lvd-about-opening">{paragraphs(['about.intro.1','about.intro.2','about.intro.3'])}</div>
  </div>
  <div className="container lvd-about-chapters">
   <Chapter number="01" id="nen-tang-chuyen-mon" title={text('about.foundation.title')}>
    <span id="doi-ngu" className="lvd-about-anchor" aria-hidden="true"/>
    {paragraphs(['about.foundation.1','about.foundation.2','about.foundation.3'])}
    <ul className="lvd-about-partners">{partnerIds.map(id=><li key={id}><strong>{text(`about.partner.${id}.name`)}</strong><p>{text(`about.partner.${id}.description`)}</p></li>)}</ul>
    {paragraphs(['about.foundation.4'])}
    <figure className="lvd-about-network-photo"><img src="/media/about/bizlawyer-consultation.webp" width={1168} height={288} alt="" loading="lazy" decoding="async"/></figure>
   </Chapter>
   <Chapter number="02" id="gia-tri-cong-dong" title={text('about.community.title')}>
    {paragraphs(['about.community.1','about.community.2'])}
    <ul className="lvd-about-missions">{missionIds.map((id,index)=><li key={id}><span aria-hidden="true">{String(index+1).padStart(2,'0')}</span><div><h3>{text(`about.mission.${id}.title`)}</h3><p>{text(`about.mission.${id}.body`)}</p></div></li>)}</ul>
    {paragraphs(['about.community.3'])}
   </Chapter>
   <Chapter number="03" id="chat-luong-tri-thuc" title={text('about.quality.title')}>
    {paragraphs(['about.quality.1','about.quality.2','about.quality.3','about.quality.intro'])}
    <ul className="lvd-about-criteria">{(['1','2','3','4'] as const).map(id=><li key={id}><span aria-hidden="true">✓</span>{text(`about.quality.criterion.${id}`)}</li>)}</ul>
    {paragraphs(['about.quality.4'])}
   </Chapter>
   <Chapter number="04" id="dong-hanh-ket-noi" title={text('about.support.title')}>
    {paragraphs(['about.support.1','about.support.2','about.support.3','about.belief.intro'])}
    <blockquote className="lvd-about-belief">{paragraphs(['about.belief.1','about.belief.2','about.belief.3'])}</blockquote>
    <p className="lvd-about-signature">{text('about.signature')}</p>
    <div className="button-row"><AppLink className="button" href="/hoi-dap">{t('Mở trò chuyện')} <Arrow/></AppLink><AppLink className="lvd-about-text-link" href="/lien-he">{t('Liên hệ')} <Arrow/></AppLink></div>
   </Chapter>
  </div>
 </div>;
}

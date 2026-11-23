'use client';
import {AppLink} from '../shared/AppLink';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import type {ArticleList,GroupSummary,Partner} from './types';
import {Arrow,ArticleCards,GroupGrid,usePublicCopy} from './ui';
import {HomeServices,HomeBenefits} from './HomeServices';
import {HeroVideo} from './HeroVideo';
import type {HeroBanner} from '../settings/hero-banner';
function Partners({items}:{items:Partner[]}){
 const l=usePublicCopy();
 const label=l('Đơn vị liên kết','Kooperationspartner');
 if(!items.length)return null;
 return (
  <section className="pm-partners pm-partners-color" aria-label={label}>
   <div className="container pm-partners-inner">
    <div className="pm-partner-marquee" tabIndex={0} role="group" aria-label={label}>
     <div className="pm-partner-track">
      {[false,true].map(duplicate=>(
       <ul className="pm-partner-group" key={String(duplicate)} aria-hidden={duplicate||undefined}>
        {items.map(({name,logo})=>(
         <li className="pm-partner-item" key={name}>
          <img className="pm-partner-logo" src={logo} width={140} height={38} alt={duplicate?'':name} decoding="async"/>
         </li>
        ))}
       </ul>
      ))}
     </div>
    </div>
   </div>
  </section>
 );
}
export function Home({groups,partners,news,revision,benefitPhotos,banner}:{banner:HeroBanner;groups:GroupSummary[];partners:Partner[];news:ArticleList;revision:string;benefitPhotos:string[]}){
 const l=usePublicCopy(),router=useRouter(),[error,setError]=useState(''),[warmed,setWarmed]=useState(false),prefetched=useRef(false);
 const warmChat=()=>{if(prefetched.current)return;prefetched.current=true;setWarmed(true);router.prefetch('/hoi-dap');};
 function focusQuestion(event:React.FocusEvent<HTMLTextAreaElement>){
  const input=event.currentTarget;
  // WebKit scrolls a visible focused field toward the keyboard's center, even
  // when it already fits. Suppress that focus snapshot without moving the form.
  if(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)){
   const opacity=input.style.opacity;input.style.opacity='0';
   window.setTimeout(()=>{input.style.opacity=opacity;},0);
  }
  warmChat();
 }
 function ask(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const question=String(new FormData(event.currentTarget).get('question')||'').trim();if(!question)return;try{sessionStorage.setItem('lvd-question',question);sessionStorage.setItem('lvd-question-submit',question);router.push('/hoi-dap');}catch{setError(l('Không thể lưu câu hỏi trong trình duyệt. Vui lòng mở trò chuyện để gửi.','Die Frage konnte im Browser nicht gespeichert werden. Bitte öffnen Sie den Chat.'));}}
 return <>{warmed&&<link rel="preload" as="style" href={'/customer-chat.css?v='+revision}/>}<section className="pm-hero" aria-labelledby="pm-title"><HeroVideo initial={banner}/><div className="container pm-hero-inner"><div className="pm-hero-copy"><div className="pm-hero-links"><AppLink href="/hoi-dap">{l('Hội thoại','Gespräche')} <Arrow/></AppLink></div><h1 id="pm-title">{l('Giải đáp pháp luật','Recht in Vietnam')}<br/>{l('Việt Nam và Đức.','und Deutschland.')}</h1><p className="pm-hero-description">{l('Được tư vấn bởi chuyên gia giàu kinh nghiệm, giải thích rõ ràng và đề xuất hướng xử lý thiết thực.','Erfahrene Fachleute beraten Sie, erklären Zusammenhänge verständlich und schlagen praktikable Lösungswege vor.')}</p><div className="pm-ask-slot"><form className="pm-ask ask-box" method="post" onSubmit={ask}><label className="sr-only" htmlFor="home-question">{l('Bạn cần làm rõ vấn đề gì?','Was möchten Sie klären?')}</label><div className="pm-ask-row"><textarea id="home-question" name="question" onFocus={focusQuestion} onPointerEnter={warmChat} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing&&event.nativeEvent.keyCode!==229){event.preventDefault();event.currentTarget.form?.requestSubmit();}}} maxLength={2000} required placeholder={l('Bạn cần làm rõ vấn đề gì?','Was möchten Sie klären?')} rows={1}/><button className="button" type="submit">{l('Gửi câu hỏi','Frage senden')} <Arrow/></button></div></form></div>{error&&<p role="alert">{error}</p>}</div></div><Partners items={partners}/></section>
 <section className="pm-countries container" aria-label={l('Thư viện','Bibliothek')}>{[['vn','viet-nam','Pháp luật Việt Nam','Vietnamesisches Recht'],['de','duc','Pháp luật Đức','Deutsches Recht']].map(([flag,path,vi,de])=><AppLink className="pm-country" key={flag} href={'/phap-luat/'+path}><img className="pm-country-flag" src={'/assets/flags/'+flag+'.svg'} width={30} height={20} alt=""/><div className="pm-country-copy"><h2>{l(vi,de)}</h2></div><Arrow/></AppLink>)}</section>
 <HomeServices/><HomeBenefits photos={benefitPhotos}/>
 <section className="pm-news chat-news"><div className="container"><div className="pm-section-head"><h2>{l('Tin tức & đời sống','Nachrichten & Alltag')}</h2><AppLink className="lvd-link" href="/tin-tuc">{l('Xem tất cả tin tức','Alle Nachrichten')} <Arrow/></AppLink></div><ArticleCards list={news}/></div></section>
 <section className="pm-fields"><div className="container"><div className="pm-section-head"><h2>{l('Chủ đề đang được quan tâm','Themen im Fokus')}</h2><AppLink className="lvd-link" href="/thu-vien">{l('Xem tất cả lĩnh vực','Alle Rechtsgebiete')} <Arrow/></AppLink></div><GroupGrid home groups={groups}/></div></section></>;
}

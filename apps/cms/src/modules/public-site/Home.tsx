'use client';
import {AppLink} from '../shared/AppLink';
import {useEffect,useId,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import type {ArticleList,GroupSummary,Partner} from './types';
import {Arrow,ArticleCards,GroupGrid,usePublicCopy} from './ui';
import {HomeServices,HomeBenefits} from './HomeServices';
function HeroVideo(){
 const l=usePublicCopy(),video=useRef<HTMLVideoElement>(null),choice=useRef<'play'|'pause'|null>(null),[paused,setPaused]=useState(true);
 useEffect(()=>{
  const el=video.current;if(!el)return;let visible=false,ready=document.readyState==='complete',timer:ReturnType<typeof setTimeout>|undefined;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),connection=(navigator as Navigator&{connection?:EventTarget&{saveData?:boolean}}).connection;
  const sync=()=>{if((!ready&&choice.current!=='play')||document.hidden||!visible||choice.current==='pause'||(choice.current!=='play'&&(reduced.matches||connection?.saveData))){el.pause();return;}if(!el.getAttribute('src')){el.src=window.matchMedia('(max-width:760px)').matches?'/media/legal-hero-stock-mobile-v9.mp4':'/media/legal-hero-stock-v9.mp4';el.load();}void el.play().catch(()=>setPaused(true));};
  const loaded=()=>{timer=setTimeout(()=>{ready=true;sync();},250);};if(!ready)window.addEventListener('load',loaded,{once:true});
  const onPlay=()=>setPaused(false),onPause=()=>setPaused(true),observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});
  observer.observe(el);el.addEventListener('play',onPlay);el.addEventListener('pause',onPause);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);connection?.addEventListener('change',sync);sync();
  const toggle=()=>{choice.current=el.paused?'play':'pause';sync();};el.parentElement?.querySelector('button')?.addEventListener('click',toggle);
  return()=>{window.removeEventListener('load',loaded);clearTimeout(timer);observer.disconnect();el.pause();el.removeEventListener('play',onPlay);el.removeEventListener('pause',onPause);document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);connection?.removeEventListener('change',sync);el.parentElement?.querySelector('button')?.removeEventListener('click',toggle);};
 },[]);
 return <><link rel="preload" as="image" href="/media/legal-hero-stock-poster-v9.webp" fetchPriority="high"/><video ref={video} className="pm-hero-video" muted loop playsInline preload="none" poster="/media/legal-hero-stock-poster-v9.webp" aria-hidden="true" tabIndex={-1}/><button className="pm-video-toggle" type="button" aria-label={paused?l('Phát video','Video abspielen'):l('Tạm dừng video','Video anhalten')} aria-pressed={paused}><svg className="pm-video-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg><svg className="pm-video-play" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg></button></>;
}
function Partners({items}:{items:Partner[]}){
 const l=usePublicCopy(),id=useId().replace(/[^a-zA-Z0-9_-]/g,'');
 return <section className="pm-partners" aria-label={l('Logo đối tác','Partnerlogos')}><div className="container pm-partners-inner"><div className="pm-partner-marquee" tabIndex={0} aria-label={l('Logo đối tác','Partnerlogos')}><div className="pm-partner-track">{[0,1].map(copy=><div className="pm-partner-group" key={copy} aria-hidden={copy===1?true:undefined}>{items.map((item,index)=>{const filter=id+'-'+copy+'-'+index;return <svg className="pm-partner-logo" key={item.logo} viewBox="0 0 220 60" width={140} height={38} role="img" aria-label={copy?'':item.source} focusable="false"><defs><filter id={filter} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -.2126 -.7152 -.0722 0 1"/><feComponentTransfer><feFuncA type="linear" slope="1.1" intercept="-.05"/></feComponentTransfer><feComposite operator="in" in2="SourceGraphic"/></filter></defs><image href={item.logo} width={220} height={60} preserveAspectRatio="xMidYMid meet" filter={'url(#'+filter+')'}/></svg>;})}</div>)}</div></div></div></section>;
}
export function Home({groups,partners,news,revision,benefitPhotos}:{groups:GroupSummary[];partners:Partner[];news:ArticleList;revision:string;benefitPhotos:string[]}){
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
 return <>{warmed&&<link rel="preload" as="style" href={'/customer-chat.css?v='+revision}/>}<section className="pm-hero" aria-labelledby="pm-title"><HeroVideo/><div className="container pm-hero-inner"><div className="pm-hero-copy"><div className="pm-hero-links"><AppLink href="/hoi-dap">{l('Hội thoại','Gespräche')} <Arrow/></AppLink></div><h1 id="pm-title">{l('Giải đáp pháp luật','Recht in Vietnam')}<br/>{l('Việt Nam và Đức.','und Deutschland.')}</h1><p className="pm-hero-description">{l('Được tư vấn bởi chuyên gia giàu kinh nghiệm, giải thích rõ ràng và đề xuất hướng xử lý thiết thực.','Erfahrene Fachleute beraten Sie, erklären Zusammenhänge verständlich und schlagen praktikable Lösungswege vor.')}</p><div className="pm-ask-slot"><form className="pm-ask ask-box" method="post" onSubmit={ask}><label className="sr-only" htmlFor="home-question">{l('Bạn cần làm rõ vấn đề gì?','Was möchten Sie klären?')}</label><div className="pm-ask-row"><textarea id="home-question" name="question" onFocus={focusQuestion} onPointerEnter={warmChat} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing&&event.nativeEvent.keyCode!==229){event.preventDefault();event.currentTarget.form?.requestSubmit();}}} maxLength={2000} required placeholder={l('Bạn cần làm rõ vấn đề gì?','Was möchten Sie klären?')} rows={1}/><button className="button" type="submit">{l('Gửi câu hỏi','Frage senden')} <Arrow/></button></div></form></div>{error&&<p role="alert">{error}</p>}</div></div><Partners items={partners}/></section>
 <section className="pm-countries container" aria-label={l('Thư viện','Bibliothek')}>{[['vn','viet-nam','Pháp luật Việt Nam','Vietnamesisches Recht'],['de','duc','Pháp luật Đức','Deutsches Recht']].map(([flag,path,vi,de])=><AppLink className="pm-country" key={flag} href={'/phap-luat/'+path}><img className="pm-country-flag" src={'/assets/flags/'+flag+'.svg'} width={30} height={20} alt=""/><div className="pm-country-copy"><h2>{l(vi,de)}</h2></div><Arrow/></AppLink>)}</section>
 <HomeServices/><HomeBenefits photos={benefitPhotos}/>
 <section className="pm-news chat-news"><div className="container"><div className="pm-section-head"><h2>{l('Tin tức & đời sống','Nachrichten & Alltag')}</h2><AppLink className="lvd-link" href="/tin-tuc">{l('Xem tất cả tin tức','Alle Nachrichten')} <Arrow/></AppLink></div><ArticleCards list={news}/></div></section>
 <section className="pm-fields"><div className="container"><div className="pm-section-head"><h2>{l('Chủ đề đang được quan tâm','Themen im Fokus')}</h2><AppLink className="lvd-link" href="/thu-vien">{l('Xem tất cả lĩnh vực','Alle Rechtsgebiete')} <Arrow/></AppLink></div><GroupGrid home groups={groups}/></div></section></>;
}

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
  const sync=()=>{if((!ready&&choice.current!=='play')||document.hidden||!visible||choice.current==='pause'||(choice.current!=='play'&&(reduced.matches||connection?.saveData))){el.pause();return;}if(!el.getAttribute('src')){el.src=window.matchMedia('(max-width:760px)').matches?'/media/legal-hero-mobile-v3.mp4':'/media/legal-hero-montage-v2.mp4';el.load();}void el.play().catch(()=>setPaused(true));};
  const loaded=()=>{timer=setTimeout(()=>{ready=true;sync();},250);};if(!ready)window.addEventListener('load',loaded,{once:true});
  const onPlay=()=>setPaused(false),onPause=()=>setPaused(true),observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});
  observer.observe(el);el.addEventListener('play',onPlay);el.addEventListener('pause',onPause);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);connection?.addEventListener('change',sync);sync();
  const toggle=()=>{choice.current=el.paused?'play':'pause';sync();};el.parentElement?.querySelector('button')?.addEventListener('click',toggle);
  return()=>{window.removeEventListener('load',loaded);clearTimeout(timer);observer.disconnect();el.pause();el.removeEventListener('play',onPlay);el.removeEventListener('pause',onPause);document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);connection?.removeEventListener('change',sync);el.parentElement?.querySelector('button')?.removeEventListener('click',toggle);};
 },[]);
 return <><link rel="preload" as="image" href="/media/legal-hero-montage-poster-v2.webp" fetchPriority="high"/><video ref={video} className="pm-hero-video" muted loop playsInline preload="none" poster="/media/legal-hero-montage-poster-v2.webp" aria-hidden="true" tabIndex={-1}/><button className="pm-video-toggle" type="button" aria-label={paused?l('Phát video','Video abspielen'):l('Tạm dừng video','Video anhalten')} aria-pressed={paused}><svg className="pm-video-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg><svg className="pm-video-play" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg></button></>;
}
function Partners({items}:{items:Partner[]}){
 const l=usePublicCopy(),id=useId().replace(/[^a-zA-Z0-9_-]/g,'');
 return <section className="pm-partners" aria-label={l('Logo đối tác','Partnerlogos')}><div className="container pm-partners-inner"><div className="pm-partner-marquee" tabIndex={0} aria-label={l('Logo đối tác','Partnerlogos')}><div className="pm-partner-track">{[0,1].map(copy=><div className="pm-partner-group" key={copy} aria-hidden={copy===1?true:undefined}>{items.map((item,index)=>{const filter=id+'-'+copy+'-'+index;return <svg className="pm-partner-logo" key={item.logo} viewBox="0 0 220 60" width={140} height={38} role="img" aria-label={copy?'':item.source} focusable="false"><defs><filter id={filter} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -.2126 -.7152 -.0722 0 1"/><feComponentTransfer><feFuncA type="linear" slope="1.1" intercept="-.05"/></feComponentTransfer><feComposite operator="in" in2="SourceGraphic"/></filter></defs><image href={item.logo} width={220} height={60} preserveAspectRatio="xMidYMid meet" filter={'url(#'+filter+')'}/></svg>;})}</div>)}</div></div></div></section>;
}
export function Home({groups,partners,news,revision}:{groups:GroupSummary[];partners:Partner[];news:ArticleList;revision:string}){
 const l=usePublicCopy(),router=useRouter(),[error,setError]=useState(''),[warmed,setWarmed]=useState(false),prefetched=useRef(false);
 const questionForm=useRef<HTMLFormElement>(null);
 useEffect(()=>{
  const viewport=window.visualViewport,form=questionForm.current;if(!viewport||!form)return;
  const mobile=window.matchMedia('(max-width:760px)');let restingHeight=viewport.height,frame=0;
  const measure=()=>{
   const editing=form.contains(document.activeElement);
   if(!editing)restingHeight=viewport.height;
   const dock=mobile.matches&&editing&&viewport.scale===1&&Math.max(restingHeight,document.documentElement.clientHeight)-viewport.height>120;
   if(dock){
    if(form.dataset.docked!=='true')form.parentElement?.style.setProperty('--pm-ask-height',form.getBoundingClientRect().height+'px');
    form.style.setProperty('--pm-ask-bottom',viewport.offsetTop+viewport.height-8+'px');
   }else{form.parentElement?.style.removeProperty('--pm-ask-height');form.style.removeProperty('--pm-ask-bottom');}
   form.dataset.docked=String(dock);
  };
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
  viewport.addEventListener('resize',schedule);viewport.addEventListener('scroll',schedule);window.addEventListener('resize',schedule);document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);
  return()=>{cancelAnimationFrame(frame);viewport.removeEventListener('resize',schedule);viewport.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);document.removeEventListener('focusin',schedule);document.removeEventListener('focusout',schedule);};
 },[]);
 const warmChat=()=>{if(prefetched.current)return;prefetched.current=true;setWarmed(true);router.prefetch('/hoi-dap');};
 function ask(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const question=String(new FormData(event.currentTarget).get('question')||'').trim();if(!question)return;try{sessionStorage.setItem('lvd-question',question);sessionStorage.setItem('lvd-question-submit',question);router.push('/hoi-dap');}catch{setError(l('Không thể lưu câu hỏi trong trình duyệt. Vui lòng mở trò chuyện để gửi.','Die Frage konnte im Browser nicht gespeichert werden. Bitte öffnen Sie den Chat.'));}}
 return <>{warmed&&<link rel="preload" as="style" href={'/customer-chat.css?v='+revision}/>}<section className="pm-hero" aria-labelledby="pm-title"><HeroVideo/><div className="container pm-hero-inner"><div className="pm-hero-copy"><h1 id="pm-title">{l('Giải đáp pháp luật','Recht in Vietnam')}<br/>{l('Việt Nam và Đức.','und Deutschland.')}</h1><p className="pm-hero-description">{l('Được tư vấn bởi chuyên gia giàu kinh nghiệm, giải thích rõ ràng và đề xuất hướng xử lý thiết thực.','Erfahrene Fachleute beraten Sie, erklären Zusammenhänge verständlich und schlagen praktikable Lösungswege vor.')}</p><div className="pm-ask-slot"><form ref={questionForm} className="pm-ask ask-box" method="post" onSubmit={ask}><label className="sr-only" htmlFor="home-question">{l('Bạn cần làm rõ vấn đề gì?','Was möchten Sie klären?')}</label><div className="pm-ask-row"><textarea id="home-question" name="question" onFocus={warmChat} onPointerEnter={warmChat} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing&&event.nativeEvent.keyCode!==229){event.preventDefault();event.currentTarget.form?.requestSubmit();}}} maxLength={2000} required placeholder={l('Bạn cần làm rõ vấn đề gì?','Was möchten Sie klären?')} rows={1}/><button className="button" type="submit">{l('Gửi câu hỏi','Frage senden')} <Arrow/></button></div></form></div>{error&&<p role="alert">{error}</p>}<div className="pm-hero-links"><AppLink href="/thu-vien">{l('Thư viện','Bibliothek')} <Arrow/></AppLink></div></div></div><Partners items={partners}/></section>
 <section className="pm-countries container" aria-label={l('Thư viện','Bibliothek')}>{[['vn','viet-nam','Pháp luật Việt Nam','Vietnamesisches Recht'],['de','duc','Pháp luật Đức','Deutsches Recht']].map(([flag,path,vi,de])=><AppLink className="pm-country" key={flag} href={'/phap-luat/'+path}><img className="pm-country-flag" src={'/assets/flags/'+flag+'.svg'} width={30} height={20} alt=""/><div className="pm-country-copy"><h2>{l(vi,de)}</h2></div><Arrow/></AppLink>)}</section>
 <HomeServices/><HomeBenefits/>
 <section className="pm-news chat-news"><div className="container"><div className="pm-section-head"><h2>{l('Tin tức & đời sống','Nachrichten & Alltag')}</h2><AppLink className="lvd-link" href="/tin-tuc">{l('Xem tất cả tin tức','Alle Nachrichten')} <Arrow/></AppLink></div><ArticleCards list={news}/></div></section>
 <section className="pm-fields"><div className="container"><div className="pm-section-head"><h2>{l('Chủ đề đang được quan tâm','Themen im Fokus')}</h2><AppLink className="lvd-link" href="/thu-vien">{l('Xem tất cả lĩnh vực','Alle Rechtsgebiete')} <Arrow/></AppLink></div><GroupGrid home groups={[0,1,2,3,4,9,11,12].map(index=>groups[index])}/></div></section></>;
}

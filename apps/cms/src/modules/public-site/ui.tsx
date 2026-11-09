'use client';
import {useEffect,useRef,useState} from 'react';
import {Photo} from './Photo';
import {AppLink} from '../shared/AppLink';
import {useLocale} from '../shared/locale';
import type {ArticleList,Card,GroupSummary} from './types';
export const Arrow=()=> <svg className="lvd-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>;
function TopicCount({value}:{value:number}){
 const ref=useRef<HTMLElement>(null),[shown,setShown]=useState(value);
 useEffect(()=>{
  const node=ref.current,motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(!node||motion.matches||!('IntersectionObserver' in window))return;
  let frame=0,started=false,disposed=false;
  setShown(0);
  const observer=new IntersectionObserver(entries=>{
   if(started||!entries.some(entry=>entry.isIntersecting))return;
   started=true;observer.disconnect();const start=performance.now();
   const tick=(now:number)=>{
    if(disposed)return;
    const progress=Math.min(1,Math.max(0,(now-start)/1100));
    setShown(Math.round(value*(1-Math.pow(1-progress,3))));
    if(progress<1)frame=requestAnimationFrame(tick);
   };
   frame=requestAnimationFrame(tick);
  },{threshold:0.25});
  observer.observe(node);
  const finish=()=>{if(motion.matches){disposed=true;observer.disconnect();cancelAnimationFrame(frame);setShown(value);}};
  motion.addEventListener('change',finish);
  return()=>{disposed=true;observer.disconnect();cancelAnimationFrame(frame);motion.removeEventListener('change',finish);};
 },[value]);
 return <b ref={ref} className="pm-topic-number" style={{display:'inline-block',minWidth:String(value).length+'ch',fontVariantNumeric:'tabular-nums'}}><span className="sr-only">{value}</span><span aria-hidden="true">{shown}</span></b>;
}
function FieldIcon({name}:{name:string}){
 const paths:Record<string,string>={"hon-nhan-gia-dinh":"M3 21v-3a5 5 0 0 1 10 0v3M16 21v-3a5 5 0 0 1 5-5M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M17 3a4 4 0 0 1 0 8","quoc-tich":"M4 21V3m0 1c5-4 10 4 16 0v10c-6 4-11-4-16 0M8 6v5","khai-sinh-ho-tich-giam-ho":"M6 3h12v18H6zM9 7h6M9 16h6M10 11a2 2 0 1 0 4 0 2 2 0 0 0-4 0M9 19h6","giay-to-tuy-than":"M3 5h18v14H3zM6 10a2 2 0 1 0 4 0 2 2 0 0 0-4 0M5 16a3 3 0 0 1 6 0M14 9h4M14 13h4","thua-ke":"M10 3h4v4h-4zM3 17h4v4H3zM10 17h4v4h-4zM17 17h4v4h-4zM12 7v10M5 17v-5h14v5","hop-dong-giao-dich-dan-su":"M13 3H4v18h15v-8M7 7h3M7 11h2M7 17h5M13 13l7-7-3-3-7 7-1 4z","tranh-chap-dan-su":"M12 3v18M6 21h12M4 7h16M4 7l-3 7h6zM20 7l-3 7h6zM9 5l3-2 3 2","lao-dong-viec-lam-bhxh":"M3 7h18v14H3zM8 7V3h8v4M3 12c6 4 12 4 18 0M10 12h4v4h-4z","xuat-nhap-canh-cu-tru":"m3 12 7 2 3 7 2-2-1-6 6-6c3-3 1-5-2-2l-6 6-6-1zM3 21h5","nha-o-dat-dai":"M3 11 12 3l9 8M5 9v12h14V9M9 21v-8h6v8","dau-tu-kinh-doanh-thuong-mai":"M3 3v18h18M7 16l5-5 4 3 5-8M16 6h5v5","tai-chinh-ngan-hang-bao-hiem":"M21 8H4V5a2 2 0 0 1 2-2h13v5M4 8v13h17V8M21 12h-7v5h7","thue":"M5 2h14v20H5zM8 5h8v4H8zM8 13h1M12 13h1M16 13h0M8 17h1M12 17h1M16 17h0","so-huu-tri-tue":"M8 15a7 7 0 1 1 8 0l-1 3H9zM9 21h6M12 6v4M10 8h4","hinh-su":"m13 3 8 8-3 3-8-8zM5 9l4-4 8 8-4 4zM10 14l-7 7M15 21h7M17 18h3v3","to-tung-hanh-chinh":"M7 3h10v3H7zM7 4H4v17h16V4h-3M8 11l2 2 5-5M8 17h8","file":"M5 3h9l5 5v13H5ZM14 3v6h5M8 13h8M8 17h8"};
 return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]||paths.file}/></svg>;
}
export function usePublicCopy(){const {language,copy}=useLocale();return (vi:string,de:string)=>copy[vi]?.[language]??(language==='de'?de:vi);}
export function Breadcrumb({title,parent,showCurrent=true}:{title:string;parent?:{href:string;label:string};showCurrent?:boolean}){const l=usePublicCopy();return <nav className="breadcrumb" aria-label={l('Đường dẫn','Brotkrumennavigation')}><AppLink href="/">{l('Trang chủ','Startseite')}</AppLink>{parent&&<><span aria-hidden="true">/</span><AppLink href={parent.href}>{parent.label}</AppLink></>}{showCurrent&&<><span aria-hidden="true">/</span><span aria-current="page">{title}</span></>}</nav>;}
export function CountryTabs({country}:{country?:string}){const l=usePublicCopy(),selected=country==='DE'?'DE':'VN';return <nav className="lvd-country-tabs" aria-label={l('Thư viện','Bibliothek')}>{[['VN','vn','viet-nam','Pháp luật Việt Nam','Vietnamesisches Recht'],['DE','de','duc','Pháp luật Đức','Deutsches Recht']].map(([code,flag,path,vi,de])=><AppLink key={code} href={'/phap-luat/'+path} aria-current={selected===code?'page':undefined}><img src={'/assets/flags/'+flag+'.svg'} width={30} height={20} alt=""/><span>{l(vi,de)}</span></AppLink>)}</nav>;}
export function GroupGrid({groups,country,home=false}:{groups:GroupSummary[];country?:string;home?:boolean}){
 const l=usePublicCopy();
 return <div className="pm-fields-grid">{groups.map(group=><AppLink key={group.id} href={(home||!country?'/chu-de/':'/phap-luat/'+(country==='DE'?'duc':'viet-nam')+'/')+group.id}><span className="pm-field-icon"><FieldIcon name={group.id}/></span><h3>{l(group.title,group.titleDe)}</h3><span className="pm-field-bottom">{country!=='DE'&&<span className="pm-topic-stat"><TopicCount value={group.count}/><span className="pm-topic-unit">{l('chủ đề','Themen')}</span></span>}<Arrow/></span></AppLink>)}</div>;
}
export function StoryCard({article,priority=false}:{article:Card;priority?:boolean}){
 const l=usePublicCopy(),href=article.href||'/bai-viet/'+encodeURIComponent(article.slug),published=article.published?new Date(article.published):null;
 const validDate=published&&Number.isFinite(published.getTime());
 return <article className="press-card pm-story pm-story-cms"><AppLink className="press-image-link" href={href} aria-label={article.title}><Photo name={article.photo} width={480} card className="press-photo" sizes="(max-width:760px) calc(100vw - 40px), (max-width:1100px) 45vw, 30vw" alt="" loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async"/></AppLink><div className="press-copy"><div className="pm-story-meta">{validDate&&<time dateTime={article.published!}>{new Intl.DateTimeFormat(l('vi-VN','de-DE'),{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'}).format(published)}</time>}{Boolean(article.readingMinutes)&&<span>{l(article.readingMinutes+' phút đọc',article.readingMinutes+' Min. Lesezeit')}</span>}</div><h3><AppLink href={href} lang={article.language}>{article.title}</AppLink></h3>{article.category&&<AppLink className="pm-story-category" href={article.category.href}>{l(article.category.name,article.category.nameDe||article.category.name)}</AppLink>}</div></article>;
}
export function ArticleCards({list,priority=false}:{list:ArticleList;priority?:boolean}){return <div className="pm-news-grid press-grid">{list.docs.map((article,index)=><StoryCard key={article.id} article={article} priority={priority&&index===0}/>)}</div>;}
export function Pagination({page,pages,path,query=''}:{page:number;pages:number;path:string;query?:string}){
 const l=usePublicCopy();if(pages<=1)return null;
 const link=(value:number)=>{const q=new URLSearchParams(query);q.set('trang',String(value));return path+'?'+q;};
 return <nav className="pagination" aria-label={l('Phân trang','Seitennavigation')}>{page>1&&<AppLink href={link(page-1)}>{l('Trước','Zurück')}</AppLink>}<span>{page} / {pages}</span>{page<pages&&<AppLink href={link(page+1)}>{l('Sau','Weiter')}</AppLink>}</nav>;
}

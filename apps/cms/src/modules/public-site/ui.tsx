'use client';
import {photo,photoSet} from './photos';
import {AppLink} from '../shared/AppLink';
import {useLocale} from '../shared/locale';
import type {ArticleList,Card,GroupSummary} from './types';
export const Arrow=()=> <svg className="lvd-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>;
function FieldIcon({name}:{name:string}){
 const paths:Record<string,string>={family:'M3 21v-3a5 5 0 0 1 10 0v3M16 21v-3a5 5 0 0 1 5-5M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M17 3a4 4 0 0 1 0 8',globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18',home:'M3 11 12 3l9 8M5 9v12h14V9M9 21v-8h6v8',wallet:'M21 8H4V5a2 2 0 0 1 2-2h13v5M4 8v13h17V8M21 12h-7v5h7',file:'M5 3h9l5 5v13H5ZM14 3v6h5M8 13h8M8 17h8',book:'M3 3h7l2 2 2-2h7v17h-7l-2 2-2-2H3ZM12 5v17'};
 return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]||paths.file}/></svg>;
}
export function usePublicCopy(){const {language,copy}=useLocale();return (vi:string,de:string)=>copy[vi]?.[language]??(language==='de'?de:vi);}
export function Breadcrumb({title,parent,showCurrent=true}:{title:string;parent?:{href:string;label:string};showCurrent?:boolean}){const l=usePublicCopy();return <nav className="breadcrumb" aria-label={l('Đường dẫn','Brotkrumennavigation')}><AppLink href="/">{l('Trang chủ','Startseite')}</AppLink>{parent&&<><span aria-hidden="true">/</span><AppLink href={parent.href}>{parent.label}</AppLink></>}{showCurrent&&<><span aria-hidden="true">/</span><span aria-current="page">{title}</span></>}</nav>;}
export function CountryTabs({country}:{country?:string}){const l=usePublicCopy(),selected=country==='DE'?'DE':'VN';return <nav className="lvd-country-tabs" aria-label={l('Thư viện','Bibliothek')}>{[['VN','vn','viet-nam','Pháp luật Việt Nam','Vietnamesisches Recht'],['DE','de','duc','Pháp luật Đức','Deutsches Recht']].map(([code,flag,path,vi,de])=><AppLink key={code} href={'/phap-luat/'+path} aria-current={selected===code?'page':undefined}><img src={'/assets/flags/'+flag+'.svg'} width={30} height={20} alt=""/><span>{l(vi,de)}</span></AppLink>)}</nav>;}
export function GroupGrid({groups,country,home=false}:{groups:GroupSummary[];country?:string;home?:boolean}){
 const l=usePublicCopy();
 return <div className="pm-fields-grid">{groups.map(group=><AppLink key={group.id} href={(home||!country?'/chu-de/':'/phap-luat/'+(country==='DE'?'duc':'viet-nam')+'/')+group.id}><span className="pm-field-icon"><FieldIcon name={group.icon}/></span><h3>{l(group.title,group.titleDe)}</h3><span className="pm-field-bottom">{country!=='DE'&&<span className="pm-topic-stat"><b className="pm-topic-number">{group.count}</b><span className="pm-topic-unit">{l('chủ đề','Themen')}</span></span>}<Arrow/></span></AppLink>)}</div>;
}
export function StoryCard({article,priority=false}:{article:Card;priority?:boolean}){
 const l=usePublicCopy(),href=article.href||'/bai-viet/'+encodeURIComponent(article.slug),published=article.published?new Date(article.published):null;
 const validDate=published&&Number.isFinite(published.getTime()),image=photo(article.photo,480,true);
 return <article className="press-card pm-story pm-story-cms"><AppLink className="press-image-link" href={href} aria-label={article.title}><img className="press-photo" src={image.src} srcSet={photoSet(article.photo,true)} sizes="(max-width:760px) calc(100vw - 40px), (max-width:1100px) 45vw, 30vw" width={image.width} height={image.height} alt="" loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async"/></AppLink><div className="press-copy"><div className="pm-story-meta">{validDate&&<time dateTime={article.published!}>{new Intl.DateTimeFormat(l('vi-VN','de-DE'),{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'}).format(published)}</time>}{Boolean(article.readingMinutes)&&<span>{l(article.readingMinutes+' phút đọc',article.readingMinutes+' Min. Lesezeit')}</span>}</div><h3><AppLink href={href} lang={article.language}>{article.title}</AppLink></h3>{article.category&&<AppLink className="pm-story-category" href={article.category.href}>{l(article.category.name,article.category.nameDe||article.category.name)}</AppLink>}</div></article>;
}
export function ArticleCards({list,priority=false}:{list:ArticleList;priority?:boolean}){return <div className="pm-news-grid press-grid">{list.docs.map((article,index)=><StoryCard key={article.id} article={article} priority={priority&&index===0}/>)}</div>;}
export function Pagination({page,pages,path,query=''}:{page:number;pages:number;path:string;query?:string}){
 const l=usePublicCopy();if(pages<=1)return null;
 const link=(value:number)=>{const q=new URLSearchParams(query);q.set('trang',String(value));return path+'?'+q;};
 return <nav className="pagination" aria-label={l('Phân trang','Seitennavigation')}>{page>1&&<AppLink href={link(page-1)}>{l('Trước','Zurück')}</AppLink>}<span>{page} / {pages}</span>{page<pages&&<AppLink href={link(page+1)}>{l('Sau','Weiter')}</AppLink>}</nav>;
}

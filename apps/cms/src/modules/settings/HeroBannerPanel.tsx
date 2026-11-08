'use client';
import {useEffect,useRef,useState} from 'react';
import {useFormFields} from '@payloadcms/ui';
import {heroBanner} from './hero-banner';
import archive from './hero-video-archive.json';
type Preview={url:string;label:string;image?:boolean;poster?:string};
const fields=['heroVideo','heroMobileVideo','heroPoster'] as const;
const labels=['Máy tính','Điện thoại','Ảnh chờ'];
const mediaId=(value:unknown)=>typeof value==='object'&&value!==null?'id' in value?Number(value.id):0:Number(value)||0;
export function HeroBannerPanel(){
 const values=useFormFields(([state])=>state),ids=fields.map(key=>mediaId(values[key]?.value)),key=ids.join(':'),previewBox=useRef<HTMLDivElement>(null);
 const [media,setMedia]=useState<Record<string,unknown>>({}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[preview,setPreview]=useState<Preview|null>(null),[copied,setCopied]=useState(''),[copyError,setCopyError]=useState(''),[archivedIndex,setArchivedIndex]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('');setPreview(null);
  Promise.all(fields.map(async(field,index)=>{
   if(!ids[index])return [field,null] as const;
   const response=await fetch('/api/media/'+ids[index]+'?depth=0',{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});
   if(!response.ok)throw Error('Chưa tải được video. Thử lại hoặc chọn tệp khác.');
   return [field,await response.json()] as const;
  })).then(rows=>{if(!controller.signal.aborted)setMedia(Object.fromEntries(rows));}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Chưa tải được video.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[key,attempt]);
 const banner=heroBanner(media),current=preview||{url:banner.video,label:'Lựa chọn hiện tại',poster:banner.poster};
 const archived=archive[archivedIndex];
 const absolute=(url:string)=>url.startsWith('/')?'https://luatvietduc.com'+url:url;
 function show(item:Preview){setPreview(item);previewBox.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});}
 function link(url:string,label:string,image=false,poster?:string,context='Lựa chọn hiện tại'){
  const full=absolute(url),name=context+' · '+label;return <div className="lvd-banner-link" key={label+url}><button type="button" title={'Xem '+name} aria-label={'Xem '+name} onClick={()=>show({url,label:name,image,poster})}>{label}</button><input aria-label={'Link '+name} readOnly value={full} onFocus={e=>e.target.select()}/><button type="button" aria-label={'Sao chép link '+name} onClick={async()=>{try{await navigator.clipboard.writeText(full);setCopied(full);setCopyError('');}catch{setCopied('');setCopyError('Chưa sao chép được. Chọn đường dẫn rồi sao chép thủ công.');}}}>{copied===full?'Đã chép':'Sao chép'}</button></div>;
 }
 return <section className="lvd-banner-panel" aria-label="Xem trước banner">
  <div className="lvd-banner-preview-heading"><h3>Xem trước</h3>{preview&&<button type="button" onClick={()=>setPreview(null)}>Lựa chọn hiện tại</button>}</div>
  {error?<p role="alert">{error} <button type="button" onClick={()=>setAttempt(n=>n+1)}>Thử lại</button></p>:loading?<p role="status">Đang tải…</p>:<>
   <div ref={previewBox} className="lvd-banner-preview">{current.image?<img src={current.url} alt={current.label}/>:<video key={current.url} src={current.url} poster={current.poster} controls playsInline preload="none" aria-label={current.label}/>}</div>
   <p className="lvd-banner-preview-caption">{current.label}</p>
   <div className="lvd-banner-links">{link(banner.video,labels[0],false,banner.poster)}{link(banner.mobileVideo,labels[1],false,banner.poster)}{link(banner.poster,labels[2],true)}</div>
  </>}
  {copyError&&<p className="lvd-banner-copy-feedback" role="alert">{copyError}</p>}
  <p className="lvd-banner-save-note">Chọn tệp bên dưới, bấm Lưu để áp dụng. Điện thoại để trống sẽ dùng video chính.</p>
  <details className="lvd-banner-archive"><summary>Video trước đây</summary><div className="lvd-banner-archive-selector"><select aria-label="Chọn bản video cũ" value={archivedIndex} onChange={e=>setArchivedIndex(Number(e.target.value))}>{archive.map((item,index)=><option key={item.label} value={index}>{item.label}</option>)}</select><span>Xem trước không thay đổi banner đang dùng.</span></div>{archived.video&&link(archived.video,'Máy tính',false,archived.poster,archived.label)}{archived.mobileVideo&&link(archived.mobileVideo,'Điện thoại',false,archived.poster,archived.label)}{archived.poster&&link(archived.poster,'Ảnh chờ',true,undefined,archived.label)}</details>
 </section>;
}

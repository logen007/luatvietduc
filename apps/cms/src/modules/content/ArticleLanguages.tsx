'use client';
import {useRouter} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useDocumentInfo,useField,useForm,useFormModified,useFormProcessing} from '@payloadcms/ui';
import {translationList,translationTarget,translationText,type ArticleLanguage as Language,type LanguageSibling as Sibling} from './translation-client';
const names={vi:'Tiếng Việt',de:'Tiếng Đức'};
export function ArticleLanguages(){
 const router=useRouter();
 const {id,data,documentIsLocked}=useDocumentInfo(),{getData,submit}=useForm(),modified=useFormModified(),processing=useFormProcessing();
 const {value:language='vi',setValue:setLanguage}=useField<Language>({path:'language'}),{value:title='',setValue:setTitle}=useField<string>({path:'title'}),{setValue:setBody}=useField<string>({path:'body'});
 const [titleHost,setTitleHost]=useState<Element|null>(null),[host,setHost]=useState<Element|null>(null),[siblings,setSiblings]=useState<Sibling[]|null>(null),[ready,setReady]=useState(false),[busy,setBusy]=useState<'switch'|'translation'|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[attempt,setAttempt]=useState(0);
 const flight=useRef<AbortController|null>(null),mounted=useRef(true),root=useRef<HTMLDivElement>(null);
 useEffect(()=>{mounted.current=true;setHost(root.current?.closest('.collection-edit--articles')?.querySelector('.doc-controls__controls')||null);setTitleHost(root.current?.closest('.collection-edit--articles')?.querySelector('.doc-controls__wrapper')||null);return()=>{mounted.current=false;flight.current?.abort();};},[]);
 useEffect(()=>{
  const controller=new AbortController();setSiblings(null);setReady(false);setError('');setMessage('');
  fetch('/service/articles/translations'+(id?'?id='+encodeURIComponent(id):''),{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])}).then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error||'Chưa tải được bản ngôn ngữ.');return translationList(body,controller.signal);}).then(body=>{if(!controller.signal.aborted){setSiblings(body.articles);setReady(body.translationReady);}}).catch(e=>{if(!controller.signal.aborted)setError(e.message||'Chưa tải được bản ngôn ngữ.');});
  return()=>controller.abort();
 },[id,attempt,data?.updatedAt]);
 const disabled=Boolean(busy||processing||documentIsLocked),other:Language=language==='vi'?'de':'vi',source=siblings?.find(a=>a.language===other);
 async function select(){
  if(disabled||flight.current)return;setError('');setMessage('');
  if(!id){setLanguage(other);return;}
  const controller=new AbortController();flight.current=controller;setBusy('switch');
  try{
   let updatedAt=data?.updatedAt;
   if(modified){
    const saved=await submit({action:'/api/articles/'+id+'?depth=0&draft=true',method:'PATCH',overrides:{_status:'draft'},skipValidation:true,disableSuccessStatus:true});
    if(!saved?.res.ok)throw new Error('Chưa lưu được bản nháp. Kiểm tra các ô đang báo lỗi.');
    if(!mounted.current||controller.signal.aborted)return;
    const latest=await fetch('/api/articles/'+id+'?draft=true&depth=0',{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});
    if(!latest.ok)throw new Error('Đã lưu bản nháp nhưng chưa mở được bản ngôn ngữ. Thử lại.');
    updatedAt=(await latest.json()).updatedAt;
   }
   const sibling=siblings?.find(a=>a.language===other);
   if(sibling){if(mounted.current&&!controller.signal.aborted)router.push('/admin/collections/articles/'+sibling.id);return;}
   const response=await fetch('/service/articles/translations',{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)]),body:JSON.stringify({id:Number(id),updatedAt,language:other,mode:'manual'})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Chưa mở được bản ngôn ngữ.');
   if(mounted.current&&!controller.signal.aborted)router.push('/admin/collections/articles/'+translationTarget(result,controller.signal));
  }catch(e){if(mounted.current&&!controller.signal.aborted)setError(e instanceof Error&&e.name==='Error'?e.message:'Chưa mở được bản ngôn ngữ. Thử lại.');}
  finally{if(flight.current===controller)flight.current=null;if(mounted.current)setBusy(null);}
 }
 async function translate(){
  if(disabled||flight.current)return;
  const controller=new AbortController();flight.current=controller;const current=getData(),snapshot=JSON.stringify(current);
  setBusy('translation');setError('');setMessage('');
  try{
   let input:Record<string,unknown>={mode:'draft',language,title:current.title,body:current.body};
   if(source){
    const response=await fetch('/api/articles/'+source.id+'?draft=true&depth=0',{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});
    const article=await response.json();if(!response.ok)throw new Error('Chưa đọc được bản nguồn.');
    input={id:source.id,updatedAt:article.updatedAt,language,mode:'preview'};
   }
   const response=await fetch('/service/articles/translations',{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(75000)]),body:JSON.stringify(input)});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Chưa dịch được. Thử lại sau.');
   if(!mounted.current||controller.signal.aborted)return;
   if(JSON.stringify(getData())!==snapshot)throw new Error('Bài đang sửa đã thay đổi. Nội dung mới của anh được giữ nguyên.');
   const translated=translationText(result,controller.signal);
   setTitle(translated.title);setBody(translated.body);setMessage('Đã dịch. Lưu bản nháp sau khi đọc lại.');
  }catch(e){if(mounted.current&&!controller.signal.aborted)setError(e instanceof Error&&e.name==='Error'?e.message:'Chưa hoàn tất bản dịch. Thử lại sau.');}
  finally{if(flight.current===controller)flight.current=null;if(mounted.current)setBusy(null);}
 }
 const controls=<div className="lvd-article-language-actions"><button type="button" className="lvd-article-language-toggle" aria-label={'Chuyển bài viết sang '+names[other]} title={'Chuyển sang '+names[other]} disabled={disabled||(Boolean(id)&&!siblings)} onClick={()=>void select()}><img src={'/assets/flags/'+(language==='vi'?'vn':'de')+'.svg'} width="20" height="14" alt=""/>{language.toUpperCase()}</button><button type="button" className="lvd-article-translate" disabled={disabled||!ready} title={ready?'Dịch sang '+names[language]:'Chưa bật kết nối AI dịch bài viết'} onClick={()=>void translate()}>Dịch bằng AI</button></div>;
 return <div ref={root} className="lvd-article-languages" aria-label="Ngôn ngữ bài viết" aria-busy={Boolean(busy)}>
  {titleHost&&createPortal(<div className="lvd-inline-article-title"><label className="sr-only" htmlFor="lvd-article-title">Tiêu đề bài viết</label><input id="lvd-article-title" aria-label="Tiêu đề bài viết" placeholder="Thêm tiêu đề" maxLength={240} value={title||''} onChange={event=>setTitle(event.target.value)} disabled={Boolean(busy||documentIsLocked)} autoComplete="off"/></div>,titleHost)}
  {host&&createPortal(<div className="lvd-article-language-slot">{controls}</div>,host)}
  {busy&&<div className="lvd-translation-loading" role="status"><span>{busy==='translation'?'Đang dịch…':'Đang mở bản '+other.toUpperCase()+'…'}</span><div className="lvd-translation-progress" role="progressbar" aria-label={busy==='translation'?'Đang dịch bài viết':'Đang mở bản ngôn ngữ'}><i/></div></div>}
  {message&&<p role="status">{message}</p>}
  {error&&<div className="lvd-translation-error" role="alert">{error}{!siblings&&<button type="button" onClick={()=>setAttempt(a=>a+1)}>Thử lại</button>}</div>}
 </div>;
}

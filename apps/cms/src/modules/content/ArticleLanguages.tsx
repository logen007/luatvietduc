'use client';
import {useEffect,useRef,useState} from 'react';
import {useDocumentInfo,useField,useForm,useFormModified,useFormProcessing} from '@payloadcms/ui';
type Language='vi'|'de';
type Sibling={id:number;language:Language};
const names={vi:'Tiếng Việt',de:'Tiếng Đức'};
export function ArticleLanguages(){
 const {id,data,documentIsLocked}=useDocumentInfo(),{getData}=useForm(),modified=useFormModified(),processing=useFormProcessing();
 const {value:language='vi',setValue:setLanguage}=useField<Language>({path:'language'}),{setValue:setTitle}=useField<string>({path:'title'}),{setValue:setBody}=useField<string>({path:'body'});
 const [selected,setSelected]=useState<Language>(language),[siblings,setSiblings]=useState<Sibling[]|null>(null),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[created,setCreated]=useState<number|null>(null),[attempt,setAttempt]=useState(0);
 const flight=useRef<AbortController|null>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;flight.current?.abort();};},[]);
 useEffect(()=>{setSelected(language);setError('');setMessage('');setCreated(null);},[id,language]);
 useEffect(()=>{
  if(!id)return;const controller=new AbortController();setSiblings(null);setError('');
  fetch('/service/articles/translations?id='+encodeURIComponent(id),{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])}).then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error||'Chưa tải được bản ngôn ngữ.');return body;}).then(body=>{if(!controller.signal.aborted){setSiblings(body.articles);setReady(body.translationReady);}}).catch(e=>{if(!controller.signal.aborted)setError(e.message||'Chưa tải được bản ngôn ngữ.');});
  return()=>controller.abort();
 },[id,attempt,data?.updatedAt]);
 const other=language==='vi'?'de':'vi',source=siblings?.find(a=>a.language===other),target=siblings?.find(a=>a.language===selected),disabled=busy||processing||documentIsLocked;
 function select(next:Language){
  setError('');setMessage('');setCreated(null);
  if(!id){setLanguage(next);setSelected(next);return;}
  if(next!==language&&modified){setError('Lưu thay đổi trước khi chuyển ngôn ngữ.');return;}
  const sibling=siblings?.find(a=>a.language===next);
  if(sibling&&sibling.id!==Number(id)){window.location.assign('/admin/collections/articles/'+sibling.id);return;}
  setSelected(next);
 }
 async function run(mode:'copy'|'ai'|'preview'){
  if(disabled||flight.current)return;
  if(modified){setError('Lưu thay đổi trước khi dịch.');return;}
  const controller=new AbortController();flight.current=controller;const snapshot=JSON.stringify(getData());
  setBusy(true);setError('');setMessage('');setCreated(null);
  try{
   let sourceId=id,updatedAt=data?.updatedAt;
   if(mode==='preview'){
    if(!source)throw new Error('Chưa có bản ngôn ngữ nguồn.');
    sourceId=source.id;
    const response=await fetch('/api/articles/'+sourceId+'?draft=true&depth=0',{cache:'no-store',signal:controller.signal});
    const article=await response.json();if(!response.ok)throw new Error('Chưa đọc được bản nguồn.');updatedAt=article.updatedAt;
   }
   const response=await fetch('/service/articles/translations',{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(75000)]),body:JSON.stringify({id:Number(sourceId),updatedAt,language:mode==='preview'?language:selected,mode})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Chưa dịch được. Thử lại sau.');
   if(!mounted.current||controller.signal.aborted)return;
   if(JSON.stringify(getData())!==snapshot){if(result.id)setCreated(result.id);throw new Error('Bài đang sửa đã thay đổi. Nội dung mới của anh được giữ nguyên.');}
   if(mode==='preview'){
    setTitle(result.translation.title);setBody(result.translation.body);setMessage('Đã dịch. Lưu bản nháp sau khi đọc lại.');
   }else window.location.assign('/admin/collections/articles/'+result.id);
  }catch(e){if(mounted.current&&!controller.signal.aborted)setError((e as Error).message||'Chưa hoàn tất bản dịch. Thử lại sau.');}
  finally{if(flight.current===controller)flight.current=null;if(mounted.current)setBusy(false);}
 }
 return <section className="lvd-article-languages" aria-label="Ngôn ngữ bài viết" aria-busy={busy}>
  <div className="lvd-article-languages__row">
   <div className="lvd-article-languages__tabs" role="group" aria-label="Bản ngôn ngữ">{(['vi','de'] as const).map(code=><button key={code} type="button" aria-pressed={language===code} disabled={Boolean(disabled)||(Boolean(id)&&!siblings)} onClick={()=>select(code)}><span aria-hidden="true">{code==='vi'?'🇻🇳':'🇩🇪'}</span> {code.toUpperCase()}</button>)}</div>
   <span>{names[language]}</span>
   {id&&selected===language&&source&&<button className="lvd-article-translate" type="button" disabled={Boolean(disabled)||modified||!ready} onClick={()=>void run('preview')}>Dịch từ {other.toUpperCase()} bằng AI</button>}
  </div>
  {!id&&<p>Lưu bản nháp để thêm ngôn ngữ khác.</p>}
  {id&&siblings&&selected!==language&&!target&&<div className="lvd-article-languages__empty"><p>Chưa có bản {names[selected].toLowerCase()}.</p><div className="lvd-article-languages__actions"><button type="button" disabled={Boolean(disabled)||!ready} onClick={()=>void run('ai')}>Dịch bằng AI</button><button type="button" disabled={Boolean(disabled)} onClick={()=>void run('copy')}>Tạo bản nháp từ bản gốc</button></div></div>}
  {id&&siblings&&!ready&&<p>Chưa bật AI dịch bài viết. <a href="/admin/settings/connections">Cài đặt kết nối</a></p>}
  {busy&&<div className="lvd-translation-loading" role="status"><span>{selected===language?'Đang dịch…':'Đang tạo bản '+names[selected].toLowerCase()+'…'}</span><div className="lvd-translation-progress" role="progressbar" aria-label="Đang dịch bài viết"><i/></div></div>}
  {message&&<p role="status">{message}</p>}
  {error&&<div className="lvd-translation-error" role="alert">{error}{!siblings&&id&&<button type="button" onClick={()=>setAttempt(a=>a+1)}>Thử lại</button>}</div>}
  {created&&<a href={'/admin/collections/articles/'+created}>Mở bản nháp đã tạo ↗</a>}
 </section>;
}

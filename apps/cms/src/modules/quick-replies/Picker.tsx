'use client';
import {AppLink} from '../shared/AppLink';
import {useEffect,useRef,useState} from 'react';
import {invalidatePublicSession,isPublicSessionCurrent} from '../shared/session-client';
type Reply={id:number;title:string;body:string};
export function QuickReplyPicker({disabled,revision,owner,onInsert}:{disabled:boolean;revision:number;owner:boolean;onInsert:(body:string)=>boolean}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[page,setPage]=useState(1),[retry,setRetry]=useState(0);
 const [result,setResult]=useState<{docs:Reply[];totalPages:number;revision:number;key:string}|null>(null),[error,setError]=useState('');
 const root=useRef<HTMLDivElement>(null),key=JSON.stringify([query,page,retry]);
 useEffect(()=>{if(!open)return;function dismiss(e:PointerEvent){if(!root.current?.contains(e.target as Node))setOpen(false);}document.addEventListener('pointerdown',dismiss);return()=>document.removeEventListener('pointerdown',dismiss);},[open]);
 useEffect(()=>{
  if(!open||disabled)return;
  const controller=new AbortController();let current=true;setError('');
  const timer=setTimeout(async()=>{
   try{
    const params=new URLSearchParams({limit:'20',page:String(page),sort:'title',depth:'0','where[enabled][equals]':'true','select[title]':'true','select[body]':'true'});
    if(query.trim()){params.set('where[or][0][title][contains]',query.trim());params.set('where[or][1][body][contains]',query.trim());}
    const response=await fetch('/api/quick-replies?'+params,{cache:'no-store',credentials:'same-origin',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});
    if(!current||!isPublicSessionCurrent(revision))return;
    if(response.status===401){invalidatePublicSession();return;}
    if(!response.ok)throw new Error();
    const data=await response.json();
    if(!Array.isArray(data.docs)||!Number.isInteger(data.totalPages))throw new Error();
    if(current&&isPublicSessionCurrent(revision))setResult({docs:data.docs,totalPages:data.totalPages,revision,key});
   }catch{if(current&&isPublicSessionCurrent(revision))setError('Không tải được mẫu.');}
  },query?200:0);
  return()=>{current=false;clearTimeout(timer);controller.abort();};
 },[open,disabled,revision,key]);
 const ready=result?.revision===revision&&result.key===key;
 return <div className="operator-quick-replies" ref={root} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);root.current?.querySelector('button')?.focus();}}}>
  <button className="operator-compose-action" type="button" disabled={disabled} aria-label="Chèn câu mẫu" title="Chèn câu mẫu" aria-expanded={open} aria-controls="operator-quick-reply-panel" onClick={()=>{setOpen(!open);setRetry(v=>v+1);}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h14v13H9l-4 4V4Z M9 8h6M9 12h4"/></svg></button>
  {open&&!disabled&&<section id="operator-quick-reply-panel" className="operator-quick-panel" aria-label="Câu trả lời nhanh">
   <header><strong>Câu trả lời nhanh</strong>{owner&&<AppLink href="/admin/collections/quick-replies">Quản lý mẫu</AppLink>}<button type="button" aria-label="Đóng câu trả lời nhanh" onClick={()=>setOpen(false)}>×</button></header>
   <input type="search" aria-label="Tìm câu trả lời nhanh" placeholder="Tìm mẫu…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}} onKeyDown={event=>{if(event.key==='Enter')event.preventDefault();}} autoFocus/>
   <div className="operator-quick-list" aria-busy={!ready&&!error}>
    {error?<p role="alert">{error} <button type="button" onClick={()=>setRetry(v=>v+1)}>Thử lại</button></p>:!ready?<p role="status">Đang tải…</p>:!result.docs.length?<p>{query?'Không tìm thấy mẫu.':'Chưa có mẫu trả lời.'}</p>:result.docs.map(reply=><button type="button" key={reply.id} onClick={()=>{if(onInsert(reply.body))setOpen(false);}}><strong>{reply.title}</strong><span>{reply.body}</span></button>)}
   </div>
   {ready&&result.totalPages>1&&<footer><button type="button" aria-label="Trang mẫu trước" disabled={page===1} onClick={()=>setPage(v=>v-1)}>‹</button><span>{page}/{result.totalPages}</span><button type="button" aria-label="Trang mẫu sau" disabled={page>=result.totalPages} onClick={()=>setPage(v=>v+1)}>›</button></footer>}
  </section>}
 </div>;
}

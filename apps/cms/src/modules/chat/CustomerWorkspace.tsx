"use client";
import {useLocale} from "../shared/locale";
import {useEffect,useRef,useState} from 'react';
import {Header} from '../shared/Header';
import type {Card} from '../public-site/types';
import {AppLink} from '../shared/AppLink';
import {ArticlePhoto} from '../public-site/ArticlePhoto';
import {useWorkspace} from './useWorkspace';
import {ChatComposer} from './ui/Composer';
import {ChatHistory} from './ui/History';
import {ChatMessages} from './ui/Messages';
import {ChatIcon} from './ui/Icons';
export function CustomerWorkspace({articles=[]}:{articles?:Card[]}){
 const {t,language}=useLocale();
 const state=useWorkspace(),dialog=useRef<HTMLDialogElement>(null),[historyOpen,setHistoryOpen]=useState(false),[entryReady,setEntryReady]=useState(false);
 // Re-enter gently when a browser restores this page from its back/forward cache.
 useEffect(()=>{
  const enter=(event:PageTransitionEvent)=>{if(!event.persisted||matchMedia('(prefers-reduced-motion: reduce)').matches)return;state.shell.current?.animate([{opacity:0},{opacity:1}],{duration:650,easing:'cubic-bezier(.22,1,.36,1)'});};
  window.addEventListener('pageshow',enter);return()=>window.removeEventListener('pageshow',enter);
 },[state.shell]);
 const close=()=>dialog.current?.close();
 const choose=(id:string)=>{if(state.setSelected(id))close();};
 const startNew=()=>{if(state.startNew())close();};
 const accountNavigate=(event:React.MouseEvent<HTMLAnchorElement>)=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();void state.openAccount();};
 const empty=!state.selected&&!state.homepageSubmitting,loading=(!state.loaded&&!state.initializationFailed)||state.homepageSubmitting||Boolean(state.selected&&!state.conversation&&!state.connectionError);
 // Reveal the settled entry once, without replaying on polling or new messages.
 useEffect(()=>{if(!loading||state.initializationFailed||state.connectionError)setEntryReady(true);},[loading,state.initializationFailed,state.connectionError]);
 const human=state.preferHuman||Boolean(state.conversation&&!state.conversation.aiEnabled);
 const mode=state.conversation?.state==='closed'?'Đã hoàn tất':state.conversation?.state==='human'?'Đang trao đổi với chuyên viên':human?'Đang chờ chuyên viên':'';
 return <><Header onAccountNavigate={accountNavigate}/><main ref={state.shell} data-entry-ready={entryReady} className={'chat-shell live-shell live-customer-shell lvd-chat'+(empty&&!loading?' is-empty':'')}>
  <aside className="chat-sidebar"><ChatHistory state={state} onSelect={choose} onNew={startNew}/></aside>
  <section className="chat-main" aria-label={t("Nội dung trò chuyện")}>
   <header className="chat-top"><div className="chat-top-title"><button type="button" className="chat-history-toggle" aria-label={t("Mở lịch sử hội thoại")} aria-expanded={historyOpen} onClick={()=>{dialog.current?.showModal();setHistoryOpen(true);}}><ChatIcon name="history"/></button>{mode&&<h1>{t(mode)}</h1>}</div>
    <div className="chat-top-actions">{state.conversation?.state==='closed'&&<button type="button" onClick={()=>void state.act('reopen')} disabled={state.busy||state.uploading||!state.loaded}>{t("Mở lại")}</button>}<button type="button" className="chat-new-mobile" aria-label={t("Cuộc trò chuyện mới")} onClick={startNew} disabled={state.busy||state.uploading||!state.loaded}><ChatIcon name="new"/></button></div>
   </header>
   <div className="chat-log" ref={state.log} role="log" aria-live="polite" aria-busy={loading}>{loading?<div className="chat-welcome" role="status"><span className="live-spinner" aria-hidden="true"/><p>{t("Đang mở cuộc trò chuyện…")}</p></div>:state.initializationFailed?null:empty?<div className="chat-welcome"><span className="chat-welcome-mark" aria-hidden="true"><ChatIcon name="spark"/></span><h2>{t("Bạn cần giải đáp điều gì?")}</h2></div>:<ChatMessages key={state.sessionRevision+":"+state.selected} state={state}/>}</div>
   {(state.error||state.connectionError)&&<p role="alert" className="chat-error">{t(state.error||state.connectionError)}{(state.initializationFailed||state.connectionError)&&<button type="button" onClick={state.retry} disabled={state.busy||state.uploading}>{t("Thử lại")}</button>}</p>}
   <ChatComposer state={state}/>
   {empty&&articles.length>0&&<section className="chat-latest-articles" aria-label={t("Bài viết mới")}>{articles.slice(0,4).map(article=>{
    const date=article.published?new Date(article.published):null;
    return <AppLink key={article.id} href={article.href||'/bai-viet/'+encodeURIComponent(article.slug)} className="chat-latest-article"><ArticlePhoto image={article.image} name={article.photo} width={480} card responsive={false} alt="" loading="lazy" decoding="async"/><span className="chat-latest-article-copy"><strong lang={article.language}>{article.title}</strong>{date&&Number.isFinite(date.getTime())&&<time dateTime={article.published!}>{date.toLocaleDateString(language==='de'?'de-DE':'vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'})}</time>}</span><ChatIcon name="arrow"/></AppLink>;
   })}</section>}
  </section>
 </main><dialog ref={dialog} className="chat-history-dialog" aria-label={t("Lịch sử hội thoại")} onClose={()=>setHistoryOpen(false)} onClick={event=>{if(event.target===event.currentTarget)close();}}><div className="chat-history-dialog-heading"><strong>{t("Cuộc trò chuyện")}</strong><button type="button" aria-label={t("Đóng lịch sử")} onClick={close}><ChatIcon name="close"/></button></div><ChatHistory state={state} onSelect={choose} onNew={startNew}/></dialog></>;
}

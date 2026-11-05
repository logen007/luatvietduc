"use client";
import {useLocale} from "../shared/locale";
import {useEffect,useRef,useState} from 'react';
import {Header} from '../shared/Header';
import {api} from '../shared/client-api';
import {useWorkspace} from './useWorkspace';
import {ChatComposer} from './ui/Composer';
import {ChatHistory} from './ui/History';
import {ChatMessages} from './ui/Messages';
import {ChatIcon} from './ui/Icons';
export function CustomerWorkspace(){
 const {t,language}=useLocale();
 const state=useWorkspace(),dialog=useRef<HTMLDialogElement>(null),[historyOpen,setHistoryOpen]=useState(false),[questions,setQuestions]=useState<{id:number;title:string}[]>([]);
 const close=()=>dialog.current?.close();
 const choose=(id:string)=>{if(state.setSelected(id))close();};
 const startNew=()=>{if(state.startNew())close();};
 const accountNavigate=(event:React.MouseEvent<HTMLAnchorElement>)=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();void state.openAccount();};
 const empty=!state.selected,loading=(!state.loaded&&!state.initializationFailed)||Boolean(state.selected&&!state.conversation&&!state.connectionError);
 useEffect(()=>{let active=true;setQuestions([]);void api('assistant/questions').then(value=>{if(active)setQuestions(value.questions||[]);}).catch(()=>{});return()=>{active=false;};},[]);
 const human=state.preferHuman||Boolean(state.conversation&&!state.conversation.aiEnabled);
 const mode=state.conversation?.state==='closed'?'Đã hoàn tất':state.conversation?.state==='human'?'Đang trao đổi với chuyên viên':human?'Đang chờ chuyên viên':'Trợ lý pháp luật';
 return <><Header onAccountNavigate={accountNavigate}/><main ref={state.shell} className={'chat-shell live-shell live-customer-shell lvd-chat'+(empty?' is-empty':'')}>
  <aside className="chat-sidebar"><ChatHistory state={state} onSelect={choose} onNew={startNew}/></aside>
  <section className="chat-main" aria-label={t("Nội dung trò chuyện")}>
   <header className="chat-top"><div className="chat-top-title"><button type="button" className="chat-history-toggle" aria-label={t("Mở lịch sử hội thoại")} aria-expanded={historyOpen} onClick={()=>{dialog.current?.showModal();setHistoryOpen(true);}}><ChatIcon name="history"/></button><h1>{t(mode)}</h1></div>
    <div className="chat-top-actions">{state.conversation?.state==='closed'&&<button type="button" onClick={()=>void state.act('reopen')} disabled={state.busy||state.uploading||!state.loaded}>{t("Mở lại")}</button>}<button type="button" className="chat-new-mobile" aria-label={t("Cuộc trò chuyện mới")} onClick={startNew} disabled={state.busy||state.uploading||!state.loaded}><ChatIcon name="new"/></button></div>
   </header>
   <div className="chat-log" ref={state.log} role="log" aria-live="polite" aria-busy={loading}>{loading?<div className="chat-welcome" role="status"><span className="live-spinner" aria-hidden="true"/><p>{t("Đang mở cuộc trò chuyện…")}</p></div>:state.initializationFailed?null:empty?<div className="chat-welcome"><span className="chat-welcome-mark" aria-hidden="true"><ChatIcon name="spark"/></span><h2>{t("Bạn cần giải đáp điều gì?")}</h2></div>:<ChatMessages state={state}/>}</div>
   {(state.error||state.connectionError)&&<p role="alert" className="chat-error">{t(state.error||state.connectionError)}{(state.initializationFailed||state.connectionError)&&<button type="button" onClick={state.retry} disabled={state.busy||state.uploading}>{t("Thử lại")}</button>}</p>}
   {!state.me?.user&&state.conversation?.state==='queued'&&state.conversation.aiEnabled===false&&<div className="chat-login-priority" role="status"><div><strong>{t("Đăng nhập để chuyên viên ưu tiên hỗ trợ")}</strong><p>{t("Lưu cuộc trò chuyện và tài liệu vào tài khoản. Yêu cầu chưa đăng nhập được xếp sau nhóm đã đăng nhập.")}</p></div><a href={'/auth/google?conversation='+encodeURIComponent(state.selected)} aria-disabled={state.busy||state.uploading} onClick={event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();void state.openAccount('/auth/google');}}>{t("Đăng nhập bằng Google")} <ChatIcon name="arrow"/></a></div>}
   <ChatComposer state={state}/>
   {empty&&questions.length>0&&<div className="chat-suggestions" aria-label={t("Câu hỏi trong kho kiến thức")}>{questions.slice(0,4).map(question=><button type="button" key={question.id} onClick={()=>state.setText(question.title)}>{question.title}<ChatIcon name="arrow"/></button>)}</div>}
  </section>
 </main><dialog ref={dialog} className="chat-history-dialog" aria-label={t("Lịch sử hội thoại")} onClose={()=>setHistoryOpen(false)} onClick={event=>{if(event.target===event.currentTarget)close();}}><div className="chat-history-dialog-heading"><strong>{t("Cuộc trò chuyện")}</strong><button type="button" aria-label={t("Đóng lịch sử")} onClick={close}><ChatIcon name="close"/></button></div><ChatHistory state={state} onSelect={choose} onNew={startNew}/></dialog></>;
}

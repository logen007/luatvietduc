"use client";
import {useEffect,useRef,useState} from 'react';
import {Header} from '../shared/Header';
import {api} from '../shared/client-api';
import {useWorkspace} from './useWorkspace';
import {ChatComposer} from './ui/Composer';
import {ChatHistory} from './ui/History';
import {ChatMessages} from './ui/Messages';
import {ChatIcon} from './ui/Icons';
export function CustomerWorkspace(){
 const state=useWorkspace(),dialog=useRef<HTMLDialogElement>(null),[historyOpen,setHistoryOpen]=useState(false),[questions,setQuestions]=useState<{id:number;title:string}[]>([]);
 const close=()=>dialog.current?.close();
 const choose=(id:string)=>{state.setSelected(id);state.setError('');close();};
 const startNew=()=>{state.startNew();close();};
 const empty=!state.selected;
 useEffect(()=>{let active=true;setQuestions([]);if(state.country)void api('assistant/questions?jurisdiction='+encodeURIComponent(state.country)).then(value=>{if(active)setQuestions(value.questions||[]);}).catch(()=>{});return()=>{active=false;};},[state.country]);
 const human=state.preferHuman||Boolean(state.conversation&&!state.conversation.aiEnabled);
 const mode=state.conversation?.state==='closed'?'Đã hoàn tất':state.conversation?.state==='human'?'Đang trao đổi với chuyên viên':human?'Chuyên viên':'Trợ lý pháp luật';
 return <><Header/><main ref={state.shell} className={'chat-shell live-shell live-customer-shell lvd-chat'+(empty?' is-empty':'')}>
  <aside className="chat-sidebar"><ChatHistory state={state} onSelect={choose} onNew={startNew}/></aside>
  <section className="chat-main" aria-label="Nội dung trò chuyện">
   <header className="chat-top"><div className="chat-top-title"><button type="button" className="chat-history-toggle" aria-label="Mở lịch sử hội thoại" aria-expanded={historyOpen} onClick={()=>{dialog.current?.showModal();setHistoryOpen(true);}}><ChatIcon name="history"/></button><h1>{mode}</h1></div>
    <div className="chat-top-actions">{state.conversation?.state==='closed'?<button type="button" onClick={()=>void state.act('reopen')} disabled={state.busy}>Mở lại</button>:<button type="button" className="chat-human" onClick={()=>void state.requestHuman()} disabled={state.busy||human}><ChatIcon name="person"/><span>{human?'Chuyên viên':'Gặp chuyên viên'}</span></button>}<button type="button" className="chat-new-mobile" aria-label="Cuộc trò chuyện mới" onClick={startNew} disabled={state.busy}><ChatIcon name="new"/></button></div>
   </header>
   <div className="chat-log" ref={state.log} role="log" aria-live="polite">{empty?<div className="chat-welcome"><span className="chat-welcome-mark" aria-hidden="true"><ChatIcon name="spark"/></span><h2>Bạn cần giải đáp điều gì?</h2></div>:<ChatMessages state={state}/>}</div>
   {(state.error||state.connectionError)&&<p role="alert" className="chat-error">{state.error||state.connectionError}</p>}
   <ChatComposer state={state}/>
   {empty&&questions.length>0&&<div className="chat-suggestions" aria-label="Câu hỏi trong kho kiến thức">{questions.slice(0,4).map(question=><button type="button" key={question.id} onClick={()=>state.setText(question.title)}>{question.title}<ChatIcon name="arrow"/></button>)}</div>}
  </section>
 </main><dialog ref={dialog} className="chat-history-dialog" aria-label="Lịch sử hội thoại" onClose={()=>setHistoryOpen(false)} onClick={event=>{if(event.target===event.currentTarget)close();}}><div className="chat-history-dialog-heading"><strong>Cuộc trò chuyện</strong><button type="button" aria-label="Đóng lịch sử" onClick={close}><ChatIcon name="close"/></button></div><ChatHistory state={state} onSelect={choose} onNew={startNew}/></dialog></>;
}

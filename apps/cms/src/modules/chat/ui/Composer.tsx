"use client";
import {useEffect,useId,useRef} from 'react';
import type {WorkspaceState} from '../useWorkspace';
import {ChatIcon} from './Icons';
export function ChatComposer({state}:{state:WorkspaceState}){
 const input=useRef<HTMLTextAreaElement>(null),id=useId();
 const disabled=!state.loaded||state.busy||state.conversation?.state==='closed';
 useEffect(()=>{const element=input.current;if(!element)return;element.style.height='auto';element.style.height=Math.min(176,Math.max(52,element.scrollHeight))+'px';},[state.text]);
 return <div className="chat-compose-wrap">
  <form className="chat-compose" onSubmit={state.send} aria-busy={state.busy}>
   <label className="sr-only" htmlFor={id}>Câu hỏi của bạn</label>
   <textarea ref={input} id={id} rows={1} maxLength={state.maxLength} value={state.text} onChange={e=>state.setText(e.target.value)} disabled={disabled} placeholder={state.conversation?.state==='closed'?'Mở lại hội thoại để tiếp tục.':'Nhập câu hỏi của bạn…'} required onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing&&!disabled){event.preventDefault();event.currentTarget.form?.requestSubmit();}}}/>
   <div className="chat-compose-tools">
    <label className="sr-only" htmlFor={id+'-country'}>Pháp luật áp dụng</label>
    <select id={id+'-country'} value={state.conversation?.jurisdiction||state.country} onChange={e=>state.setCountry(e.target.value)} disabled={Boolean(state.selected)||state.busy} required aria-label="Pháp luật áp dụng"><option value="">Chọn pháp luật</option><option value="VN">🇻🇳 Việt Nam</option><option value="DE">🇩🇪 Đức</option></select>
    <button className="chat-submit" type="submit" aria-label="Gửi câu hỏi" disabled={disabled||!state.text.trim()}>{state.busy?<span className="live-spinner"/>:<ChatIcon name="send"/>}</button>
   </div>
  </form>
  <a className="chat-privacy" href="/#/chinh-sach-thong-tin">Quyền riêng tư</a>
 </div>;
}

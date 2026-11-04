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
    <button className="chat-submit" type="submit" aria-label="Gửi câu hỏi" disabled={disabled||!state.text.trim()}>{state.busy?<span className="live-spinner"/>:<ChatIcon name="send"/>}</button>
   </div>
  </form>
  <p className="chat-ai-notice">Khi gửi, bạn đồng ý để Google Gemini xử lý câu hỏi. Bản miễn phí có thể dùng nội dung để cải thiện AI. Không gửi giấy tờ hoặc thông tin nhạy cảm. <a href="/#/chinh-sach-thong-tin">Quyền riêng tư</a></p>
 </div>;
}

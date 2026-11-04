"use client";
import {useLocale} from "../../shared/locale";
import {useEffect,useId,useRef} from 'react';
import type {WorkspaceState} from '../useWorkspace';
import {ChatIcon} from './Icons';
export function ChatComposer({state}:{state:WorkspaceState}){
 const {t,language}=useLocale();
 const input=useRef<HTMLTextAreaElement>(null),fileInput=useRef<HTMLInputElement>(null),id=useId();
 const disabled=!state.loaded||state.busy||state.uploading||state.conversation?.state==='closed';
 useEffect(()=>{const element=input.current;if(!element)return;element.style.height='auto';element.style.height=Math.min(176,Math.max(52,element.scrollHeight))+'px';},[state.text]);
 return <div className="chat-compose-wrap" onDragOver={event=>{if(event.dataTransfer.types.includes('Files'))event.preventDefault();}} onDrop={event=>{if(event.dataTransfer.files.length){event.preventDefault();if(!disabled)void state.attachFiles(Array.from(event.dataTransfer.files));}}}>
  {(state.attachments.length>0||state.uploading)&&<div className="chat-file-tray">{state.attachments.map(file=><div className="chat-file-chip" key={file.id}><span aria-hidden="true">▤</span><span><strong>{file.name}</strong><small>{(file.size/1024).toFixed(0)} KB</small></span><button type="button" aria-label={t('Bỏ tệp {name}',{name:file.name})} onClick={()=>state.removeAttachment(file.id)} disabled={state.busy||state.uploading}>×</button></div>)}{state.uploading&&<div className="chat-file-chip" role="status"><span className="live-spinner"/>{t("Đang tải tệp…")}</div>}</div>}
  <form className="chat-compose" onSubmit={state.send} aria-busy={state.busy}>
   <label className="sr-only" htmlFor={id}>{t("Câu hỏi của bạn")}</label>
   <textarea ref={input} id={id} rows={1} maxLength={state.maxLength} value={state.text} onChange={e=>state.setText(e.target.value)} disabled={disabled} onPaste={event=>{const files=Array.from(event.clipboardData.files);if(files.length){event.preventDefault();void state.attachFiles(files);}}} placeholder={t(state.conversation?.state==='closed'?'Mở lại hội thoại để tiếp tục.':'Nhập câu hỏi của bạn…')} required={!state.attachments.length} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing&&!disabled){event.preventDefault();event.currentTarget.form?.requestSubmit();}}}/>
   <div className="chat-compose-tools">
    <input ref={fileInput} type="file" multiple accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp" className="sr-only" tabIndex={-1} onChange={event=>{const files=Array.from(event.target.files||[]);event.target.value='';void state.attachFiles(files);}}/>
    <button className="chat-attach" type="button" aria-label={t("Đính kèm tệp")} title={t("Đính kèm PDF, DOCX, TXT, ảnh · tối đa 10 MB/tệp")} disabled={disabled||state.attachments.length>=4} onClick={()=>fileInput.current?.click()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>
    <button className="chat-submit" type="submit" aria-label={t("Gửi câu hỏi")} disabled={disabled||(!state.text.trim()&&!state.attachments.length)}>{state.busy?<span className="live-spinner"/>:<ChatIcon name="send"/>}</button>
   </div>
  </form>
  {!state.attachments.length&&<p className="chat-provider-label">{t("Gửi câu hỏi qua")} <a href="/#/chinh-sach-thong-tin">Google Gemini</a></p>}
 </div>;
}

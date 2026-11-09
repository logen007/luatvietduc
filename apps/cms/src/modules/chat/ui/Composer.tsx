"use client";
import {validDocumentBatch} from '../document-consent';
import {useLocale} from "../../shared/locale";
import {useEffect,useId,useRef} from 'react';
import type {WorkspaceState} from '../useWorkspace';
import {ChatIcon} from './Icons';
export function ChatComposer({state}:{state:WorkspaceState}){
 const {t,language}=useLocale();
 const docCopy=(vi:string,de:string)=>language==='de'?de:vi;
 const consentDialog=useRef<HTMLDialogElement>(null);
 const input=useRef<HTMLTextAreaElement>(null),fileInput=useRef<HTMLInputElement>(null),id=useId();
 useEffect(()=>{consentDialog.current?.close();},[state.selected,state.sessionRevision]);
 const documentReady=validDocumentBatch(state.attachments);
 function submit(event:React.FormEvent){
  if(state.attachments.length&&state.conversation?.aiEnabled!==false&&state.conversation?.state!=='human'){event.preventDefault();if(!disabled)consentDialog.current?.showModal();}
  else void state.send(event);
 }
 const disabled=!state.loaded||state.busy||state.uploading||state.conversation?.state==='closed';
 useEffect(()=>{const element=input.current;if(!element)return;element.style.height='auto';element.style.height=Math.min(176,Math.max(52,element.scrollHeight))+'px';},[state.text]);
 useEffect(()=>{
  if(disabled)return;
  const editable='input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]';
  const blocked=()=>document.hidden||Boolean(document.querySelector('dialog[open],[aria-modal="true"]'));
  const focus=()=>{
   const element=input.current,active=document.activeElement;
   if(!element||blocked()||active!==element&&active?.closest(editable))return;
   element.focus({preventScroll:true});
  };
  const type=(event:KeyboardEvent)=>{
   const element=input.current,target=event.target;
   if(!element||blocked()||event.defaultPrevented||event.isComposing||event.ctrlKey||event.metaKey||event.altKey||event.key.length!==1||target instanceof Element&&target.closest(editable+',button,a,[role="button"],[role="menu"],[role="tablist"]'))return;
   event.preventDefault();
   focus();
   if(document.activeElement!==element)return;
   const start=element.selectionStart,end=element.selectionEnd;
   if(element.value.length-(end-start)+event.key.length>element.maxLength)return;
   element.setRangeText(event.key,start,end,'end');
   state.setText(element.value);
  };
  focus();
  window.addEventListener('focus',focus);
  document.addEventListener('keydown',type);
  return()=>{window.removeEventListener('focus',focus);document.removeEventListener('keydown',type);};
 },[disabled,state.selected,state.setText]);
 return <div className="chat-compose-wrap" onDragOver={event=>{if(event.dataTransfer.types.includes('Files'))event.preventDefault();}} onDrop={event=>{if(event.dataTransfer.files.length){event.preventDefault();if(!disabled)void state.attachFiles(Array.from(event.dataTransfer.files));}}}>
  {(state.attachments.length>0||state.uploading)&&<div className="chat-file-tray">{state.attachments.map(file=><div className="chat-file-chip" key={file.id}><span aria-hidden="true">▤</span><span><strong>{file.name}</strong><small>{(file.size/1024).toFixed(0)} KB</small></span><button type="button" aria-label={t('Bỏ tệp {name}',{name:file.name})} onClick={()=>state.removeAttachment(file.id)} disabled={state.busy||state.uploading}>×</button></div>)}{state.uploading&&<div className="chat-file-chip" role="status"><span className="live-spinner"/>{t("Đang tải tệp…")}</div>}</div>}
  <form className="chat-compose" onSubmit={submit} aria-busy={state.busy}>
   <label className="sr-only" htmlFor={id}>{t("Câu hỏi của bạn")}</label>
   <textarea ref={input} id={id} rows={1} maxLength={state.maxLength} value={state.text} onChange={e=>state.setText(e.target.value)} disabled={disabled} onPaste={event=>{const files=Array.from(event.clipboardData.files);if(files.length){event.preventDefault();void state.attachFiles(files);}}} placeholder={t(state.conversation?.state==='closed'?'Mở lại hội thoại để tiếp tục.':'Nhập câu hỏi của bạn…')} required={!state.attachments.length} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing&&!disabled){event.preventDefault();event.currentTarget.form?.requestSubmit();}}}/>
   <div className="chat-compose-tools">
    <input ref={fileInput} type="file" multiple accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp" hidden tabIndex={-1} onChange={event=>{const files=Array.from(event.target.files||[]);event.target.value='';void state.attachFiles(files);}}/>
    <button className="chat-attach" type="button" aria-label={t("Đính kèm tệp")} title={t("Đính kèm PDF, DOCX, TXT, ảnh · tối đa 10 MB/tệp")} disabled={disabled||state.attachments.length>=4} onClick={()=>fileInput.current?.click()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>
    <button className="chat-submit" type="submit" aria-label={t("Gửi câu hỏi")} disabled={disabled||(!state.text.trim()&&!state.attachments.length)}>{state.busy?<span className="live-spinner"/>:<ChatIcon name="send"/>}</button>
   </div>
  </form>
  <dialog ref={consentDialog} className="chat-document-consent" aria-labelledby={id+'-document-consent'}>
   <h2 id={id+'-document-consent'}>{docCopy('Cho AI đọc tài liệu?','Dokumente mit KI lesen?')}</h2>
   <p>{docCopy('Nếu đồng ý, các tệp dưới đây và nội dung trao đổi liên quan sẽ được gửi đến Google Gemini để đọc và hỗ trợ trong cuộc hội thoại này. Tệp không được đưa vào kho kiến thức hoặc chỉ mục tìm kiếm.','Mit Ihrer Zustimmung werden die folgenden Dateien und der zugehörige Gesprächskontext an Google Gemini gesendet, um Sie in diesem Gespräch zu unterstützen. Die Dateien werden nicht in die Wissensdatenbank oder den Suchindex aufgenommen.')}</p>
   <ul>{state.attachments.map(file=><li key={file.id}>{file.name}</li>)}</ul>
   <p>{docCopy('Chỉ gửi tài liệu bạn có quyền chia sẻ. Bạn có thể che thông tin không cần thiết. AI có thể đọc sai; hãy đối chiếu nội dung quan trọng với bản gốc.','Senden Sie nur Dokumente, die Sie teilen dürfen. Unnötige Angaben können Sie schwärzen. Die KI kann Lesefehler machen; vergleichen Sie wichtige Angaben mit dem Original.')}</p>
   {!documentReady&&<p role="status">{docCopy('AI hỗ trợ ảnh JPG, PNG, WebP và PDF: tối đa 4 tệp, tổng 12 MB. Các tệp này có thể gửi cho chuyên viên.','Die KI unterstützt JPG, PNG, WebP und PDF: höchstens 4 Dateien mit zusammen 12 MB. Sie können diese Dateien an eine Fachkraft senden.')}</p>}
   <div className="chat-document-consent-actions">
    <button type="button" disabled={disabled||!documentReady} onClick={()=>{consentDialog.current?.close();void state.sendDocuments();}}>{docCopy('Đồng ý, gửi AI','Zustimmen und an KI senden')}</button>
    <button type="button" disabled={disabled} onClick={()=>{consentDialog.current?.close();void state.send();}}>{docCopy('Chỉ gửi chuyên viên','Nur an Fachkraft senden')}</button>
    <button type="button" onClick={()=>consentDialog.current?.close()}>{docCopy('Quay lại','Zurück')}</button>
   </div>
  </dialog>
 </div>;
}

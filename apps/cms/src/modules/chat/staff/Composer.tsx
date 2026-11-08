'use client';
import {useEffect,useRef,useState} from 'react';
import {QuickReplyPicker} from '../../quick-replies/Picker';
import type {WorkspaceState} from '../useWorkspace';
import {ChatIcon} from '../ui/Icons';
// Reply templates only insert text; they never send or create AI knowledge.
export function Composer({state,canReply,onSent,onClaim}:{state:WorkspaceState;canReply:boolean;onSent:()=>void;onClaim?:()=>void}){
 const [templateError,setTemplateError]=useState('');
 const picker=useRef<HTMLInputElement>(null),input=useRef<HTMLTextAreaElement>(null),loadedDraft=useRef(''),draftKey=`lvd-staff-draft:${state.me?.user?.id}:${state.selected}:reply`,restricted=Boolean(state.conversation?.restricted);
 const disabled=!canReply||state.internal||state.busy||state.uploading,hasContent=!restricted&&Boolean(state.text.trim()||state.attachments.length);
 useEffect(()=>{const element=input.current;if(element){element.style.height='auto';element.style.height=Math.min(176,Math.max(52,element.scrollHeight))+'px';}},[state.text]);
 useEffect(()=>{if(canReply&&!state.busy&&!state.uploading)input.current?.focus({preventScroll:true});},[canReply,state.busy,state.uploading]);
 useEffect(()=>{if(restricted){loadedDraft.current='';try{sessionStorage.removeItem(draftKey);}catch{}return;}if(state.internal){state.setText('');state.setInternal(false);}if(!canReply||loadedDraft.current===draftKey)return;loadedDraft.current=draftKey;if(state.text)return;try{state.setText(sessionStorage.getItem(draftKey)||'');}catch{}},[draftKey,canReply,state.sessionRevision,state.internal,restricted]);
 function edit(value:string){setTemplateError('');state.setText(value);try{if(value)sessionStorage.setItem(draftKey,value);else sessionStorage.removeItem(draftKey);}catch{}}
 async function submit(e:React.FormEvent){if(!canReply||state.internal){e.preventDefault();return;}if(await state.send(e)){try{sessionStorage.removeItem(draftKey);}catch{}onSent();}}
 return <div className="operator-composer-shell"><form className={'operator-composer'+(!canReply?' is-locked':'')} onSubmit={submit} aria-disabled={!canReply} aria-busy={state.busy||state.uploading}>
  <input ref={picker} hidden type="file" multiple disabled={disabled} accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp" onChange={e=>{void state.attachFiles(Array.from(e.target.files||[]));e.target.value='';}}/>
  {!restricted&&state.attachments.length>0&&<div className="operator-pending-files">{state.attachments.map(file=><span key={file.id}>{file.name}<button type="button" aria-label={'Bỏ tệp '+file.name} disabled={disabled} onClick={()=>state.removeAttachment(file.id)}>×</button></span>)}</div>}
  <button className="operator-compose-attach" type="button" disabled={disabled} onClick={()=>picker.current?.click()} aria-label="Đính kèm tài liệu" title="Đính kèm tài liệu"><ChatIcon name="new"/></button>
  <textarea ref={input} rows={1} aria-label="Nội dung trả lời khách" value={restricted?'':state.text} maxLength={state.maxLength} disabled={disabled} onChange={e=>edit(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing&&!disabled){e.preventDefault();if(hasContent)e.currentTarget.form?.requestSubmit();}}} placeholder={canReply?'Viết phản hồi cho khách…':state.connectionError?'Thử lại để kiểm tra hội thoại.':state.conversation?.state==='closed'?'Mở lại hội thoại để trả lời.':'Nhận xử lý để trả lời.'}/>
  <div className="operator-compose-action-slot">{hasContent?<button className="operator-compose-action operator-send" type="submit" disabled={disabled} aria-label={state.busy?'Đang gửi phản hồi':'Gửi phản hồi'} title="Gửi phản hồi"><ChatIcon name="send"/></button>:<QuickReplyPicker key={state.sessionRevision} disabled={disabled} revision={state.sessionRevision} owner={state.me?.user?.role==='owner'} onInsert={body=>{if(body.length>state.maxLength){setTemplateError(`Nội dung vượt giới hạn ${state.maxLength} ký tự. Rút gọn bản nháp trước khi chèn mẫu.`);return false;}edit(body);requestAnimationFrame(()=>input.current?.focus({preventScroll:true}));return true;}}/>}</div>
  {templateError&&canReply&&<p className="operator-template-error" role="alert">{templateError}</p>}
 </form>{!canReply&&state.conversation?.state==='queued'&&state.staffAllowed&&<div className="operator-claim-overlay"><button className="operator-primary" type="button" disabled={!state.loaded||state.busy||state.uploading||Boolean(state.connectionError)} onClick={onClaim}>Nhận xử lý</button></div>}</div>;
}

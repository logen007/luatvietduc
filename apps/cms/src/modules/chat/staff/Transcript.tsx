'use client';
import {useState} from 'react';
import {isAdmin} from '../../identity/permissions';
import {useLocale} from '../../shared/locale';
import type {WorkspaceState} from '../useWorkspace';
import type {Attachment} from '../contracts';
import {date} from './InboxList';
export function FileLink({file}:{file:Attachment}){return <a className="operator-file" href={file.url} download><span aria-hidden="true">▤</span><span><strong>{file.name}</strong><small>{Math.max(1,Math.ceil(file.size/1024))} KB</small></span><span aria-hidden="true">↓</span></a>;}
function DeleteMessageButton({state,id}:{state:WorkspaceState;id:string|number}){
 const [confirm,setConfirm]=useState(false),{t}=useLocale();
 if(!isAdmin(state.me?.user))return null;
 const disabled=state.busy||state.uploading;
 return confirm?<span className="operator-delete-confirm"><span>{t('Xóa tin nhắn này?')}</span><button type="button" disabled={disabled} onClick={async()=>{if(await state.deleteMessage(id))setConfirm(false);}}>{t('Xóa')}</button><button type="button" disabled={disabled} onClick={()=>setConfirm(false)}>{t('Hủy')}</button></span>:<button className="operator-delete-message" type="button" disabled={disabled} title={t('Xóa tin nhắn')} aria-label={t('Xóa tin nhắn')} onClick={()=>setConfirm(true)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button>;
}
export function Transcript({state,onClaim}:{state:WorkspaceState;onClaim:()=>void}){
 return <div className="operator-log" ref={state.log} role="log" aria-label="Nội dung hội thoại" aria-live="polite">{state.conversation?.restricted?<div className="operator-welcome"><span aria-hidden="true">◇</span><h2>{state.conversation.state==='queued'?'Hội thoại chờ tiếp nhận':'Đang mở hội thoại…'}</h2>{state.conversation.state==='queued'&&<p>Nhận xử lý để xem nội dung và tài liệu.</p>}{state.conversation.state==='queued'&&<button className="operator-primary" disabled={state.busy||state.uploading} onClick={onClaim}>Nhận xử lý</button>}</div>:!state.conversation?<div className="operator-welcome"><h2>{state.selected?'Đang mở hội thoại…':'Chọn hội thoại'}</h2></div>:!state.messages.length?<p className="operator-empty">Chưa có tin nhắn.</p>:state.messages.map(m=><article key={m.id} className={'operator-message '+(m.internal?'is-note':m.role==='user'?'from-customer':'from-team')}><div className="operator-avatar" aria-hidden="true">{m.internal?'✎':m.role==='user'?'K':m.role==='assistant'?'AI':(m.author_name||'C').slice(0,1)}</div><div className="operator-message-content"><header><strong>{m.internal?'Ghi chú nội bộ':m.role==='user'?state.conversation?.customer?.name||'Khách':m.role==='assistant'?(m.metadata?.kind==='ai'?'Trợ lý AI':'Luật Việt Đức'):m.author_name||'Chuyên viên'}</strong><time dateTime={m.created_at}>{date(m.created_at)}</time><DeleteMessageButton state={state} id={m.id}/></header>{m.internal&&<small>Chỉ đội ngũ nội bộ nhìn thấy</small>}{m.body&&<p>{m.body}</p>}{m.attachments?.map(file=><FileLink key={file.id} file={file}/>)}</div></article>)}</div>;
}

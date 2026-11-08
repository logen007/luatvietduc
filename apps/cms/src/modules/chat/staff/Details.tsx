'use client';
import type {WorkspaceState} from '../useWorkspace';
import {date,labels} from './InboxList';
import {FileLink} from './Transcript';
import {CustomerAvatar} from './CustomerAvatar';
import {shortConversationId} from '../display';
import {approximateLocation} from '../browser-context';
import {isAdmin} from '../../identity/permissions';
import {DeleteConversationButton} from './DeleteConversationButton';
const factLabels={name:'Tên khách',email:'Email',phone:'Số điện thoại',location:'Khách đang ở',caseLocation:'Nơi liên quan vụ việc',request:'Yêu cầu'};
export function Details({state,onAction,onClose,onDeleted}:{state:WorkspaceState;onAction:(action:string)=>void;onClose:()=>void;onDeleted?:()=>void}){
 const c=state.conversation,files=state.messages.flatMap(m=>(m.attachments||[]).map(f=>({...f,internal:m.internal})));
 const facts=c?.info?.facts||[],fact=(field:string)=>facts.find(item=>item.field===field)?.value;
 const name=c?.registered?c.customer?.name:fact('name')||c?.customer?.name;
 const email=c?.customer?.email||fact('email'),phone=c?.customer?.phone||fact('phone'),location=approximateLocation(c?.info?.browser);
 return <aside className="operator-details" aria-label="Thông tin hội thoại">
  <header><h2>Thông tin hội thoại</h2><button onClick={onClose} aria-label="Đóng thông tin">×</button></header>
  <div className="operator-details-scroll">{!c?<p className="operator-empty">Chọn một hội thoại để xem thông tin.</p>:<>
   <section><div className="operator-customer-avatar" aria-hidden="true"><CustomerAvatar customer={{name:name||'Khách',email:email||null,avatarURL:c.customer?.avatarURL}}/></div><h3>{c.restricted?'Chờ tiếp nhận':name||'Khách'}</h3></section>
   {!c.restricted&&<dl className="operator-contact-list">
    <div><dt>Email</dt><dd>{email?<a href={'mailto:'+email}>{email}</a>:'Chưa có'}</dd></div>
    <div><dt>Số điện thoại</dt><dd>{phone?<a href={'tel:'+phone.replace(/[^+\d]/g,'')}>{phone}</a>:'Chưa có'}</dd></div>
    <div><dt>Vị trí ước tính</dt><dd>{location||'Chưa xác định'}</dd></div>
    {c.customer?.createdAt&&<div><dt>Tham gia</dt><dd>{date(c.customer.createdAt)}</dd></div>}
   </dl>}
   {facts.length>0&&<section className="operator-extracted-info"><h3>Từ cuộc trò chuyện</h3><dl>{facts.map(item=><div key={item.field}><dt>{factLabels[item.field]}</dt><dd><a href={'#operator-message-'+item.messageId} title={item.quote} onClick={event=>{event.preventDefault();onClose();requestAnimationFrame(()=>document.getElementById('operator-message-'+item.messageId)?.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));}}>{item.value}</a></dd></div>)}</dl></section>}
   <dl><div><dt>Trạng thái</dt><dd>{labels[c.state]}</dd></div><div><dt>Phụ trách</dt><dd>{c.assignedName||'Chưa tiếp nhận'}</dd></div><div><dt>Tạo lúc</dt><dd>{date(c.createdAt)}</dd></div><div><dt>Mã hội thoại</dt><dd className="operator-id" title={c.id}>{shortConversationId(c.id)}</dd></div></dl>
   <section className="operator-files"><h3>Tài liệu <span>{files.length}</span></h3>{c.restricted?<p>Nhận xử lý để xem tài liệu.</p>:files.length?files.map(f=><div key={f.id}>{f.internal&&<small>Nội bộ</small>}<FileLink file={f}/></div>):<p>Chưa có tài liệu đính kèm.</p>}</section>
   {c.state==='human'&&state.staffAllowed&&<button className="operator-release" disabled={state.busy||state.uploading} onClick={()=>onAction('release')}>Trả về hàng chờ</button>}
  </>}</div>
  {c&&isAdmin(state.me?.user)&&<footer className="operator-details-footer"><DeleteConversationButton state={state} onDeleted={onDeleted||onClose}/></footer>}
 </aside>;
}

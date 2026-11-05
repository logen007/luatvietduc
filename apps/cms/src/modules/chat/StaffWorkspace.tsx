'use client';
import {useEffect,useState} from 'react';
import {Header} from '../shared/Header';
import {useWorkspace} from './useWorkspace';
import {useInbox} from './staff/useInbox';
import {InboxList,labels} from './staff/InboxList';
import {Transcript} from './staff/Transcript';
import {Composer} from './staff/Composer';
import {Details} from './staff/Details';
export function StaffWorkspace({embedded=false}:{embedded?:boolean}){
 const state=useWorkspace(true,false),inbox=useInbox(state.staffAllowed?state.me?.user?.id:undefined,state.sessionRevision),[pane,setPane]=useState('list'),[details,setDetails]=useState(false);
 useEffect(()=>{setPane('list');setDetails(false);},[state.sessionRevision]);
 // Opening a conversation link should reveal that conversation on phones too.
 useEffect(()=>{if(state.selected)setPane('chat');},[state.selected]);
 const c=state.conversation,canReply=c?.state==='human'&&!c.restricted&&!state.connectionError&&(c.assignedTo===state.me?.user?.id||state.me?.user?.role==='owner');
 async function action(value:string){if(await state.act(value)){if(value==='claim')inbox.setView('active');else if(value==='release')inbox.setView('queue');else void inbox.refresh(true);}}
 if(state.loaded&&!state.staffAllowed)return <>{!embedded&&<Header/>}<main className="live-page container"><h1>Hộp thư chuyên viên</h1><p>Đăng nhập bằng tài khoản được phân quyền để tiếp nhận hội thoại.</p><a href="/tai-khoan">Đăng nhập →</a></main></>;
 return <>{!embedded&&<Header/>}<main ref={state.shell} className={'operator-workspace'+(embedded?' is-embedded':'')+(details?' has-details':'')} data-pane={pane}><InboxList inbox={inbox} selected={state.selected} onSelect={id=>{if(state.setSelected(id))setPane('chat');}}/><section className="operator-conversation" aria-label="Hội thoại đang mở"><header className="operator-conversation-header"><button className="operator-back" aria-label="Về danh sách hội thoại" onClick={()=>setPane('list')}>‹</button><div><h2>{c?.restricted?'Yêu cầu chờ tiếp nhận':c?.customer?.name||'Hội thoại'}</h2>{c&&<p>{labels[c.state]}{!c.restricted&&' · #'+c.id.slice(0,8)}</p>}</div><div className="operator-actions">{c?.state==='queued'&&<button className="operator-primary" disabled={state.busy||state.uploading} onClick={()=>action('claim')}>Nhận xử lý</button>}{canReply&&<button disabled={state.busy||state.uploading} onClick={()=>action('close')}>✓ Hoàn tất</button>}{c?.state==='closed'&&<button disabled={state.busy||state.uploading} onClick={()=>action('reopen')}>Mở lại</button>}{c&&<button aria-label="Thông tin hội thoại" aria-expanded={details} onClick={()=>{setDetails(!details);setPane(details?'chat':'details');}}>ⓘ</button>}</div></header><Transcript state={state} onClaim={()=>void action('claim')}/>{(state.error||state.connectionError)&&<div className="operator-error" role="alert">{state.error||state.connectionError}{state.connectionError&&<button type="button" disabled={state.busy||state.uploading} onClick={state.retry}>Thử lại</button>}</div>}{state.selected&&<Composer key={state.selected} state={state} canReply={Boolean(canReply)} onSent={()=>void inbox.refresh(true)}/>}</section>{details&&<Details state={state} onAction={action} onClose={()=>{setDetails(false);setPane('chat');}}/>}</main></>;
}

'use client';
import {AppLink} from '../shared/AppLink';
import {useEffect,useRef,useState} from 'react';
import {Header} from '../shared/Header';
import {useWorkspace} from './useWorkspace';
import {useInbox} from './staff/useInbox';
import {DeleteConversationButton} from './staff/DeleteConversationButton';
import {InboxList,labels} from './staff/InboxList';
import {Transcript} from './staff/Transcript';
import {Composer} from './staff/Composer';
import {conversationDisplayTitle,shortConversationId} from './display';
import {Details} from './staff/Details';
export function StaffWorkspace({embedded=false}:{embedded?:boolean}){
 const state=useWorkspace(true,false),inbox=useInbox(state.staffAllowed?state.me?.user?.id:undefined,state.sessionRevision),[pane,setPane]=useState('list'),[details,setDetails]=useState(false),deleted=useRef('');
 useEffect(()=>{deleted.current='';setPane('list');setDetails(false);},[state.sessionRevision]);
 useEffect(()=>{
  if(!state.loaded||!state.staffAllowed||state.selected||state.busy||state.uploading||inbox.loading||inbox.error)return;
  const latest=inbox.rows.filter(row=>row.id!==deleted.current).reduce<(typeof inbox.rows)[number]|undefined>((current,row)=>!current||Date.parse(row.updated_at)>Date.parse(current.updated_at)?row:current,undefined);
  if(latest)state.setSelected(latest.id);
 },[state.loaded,state.staffAllowed,state.selected,state.busy,state.uploading,state.setSelected,inbox.loading,inbox.error,inbox.rows]);
 // Opening a conversation link should reveal that conversation on phones too.
 useEffect(()=>{if(state.selected)setPane('chat');},[state.selected]);
 const c=state.conversation,canReply=c?.state==='human'&&!c.restricted&&!state.connectionError&&state.staffAllowed;
 async function action(value:string){if(await state.act(value)){if(value==='claim')inbox.setView('active');else if(value==='release')inbox.setView('queue');else void inbox.refresh(true);}}
 if(state.loaded&&!state.staffAllowed)return <>{!embedded&&<Header/>}<main className="live-page container"><h1>Hộp thư chuyên viên</h1><p>Đăng nhập bằng tài khoản được phân quyền để tiếp nhận hội thoại.</p><AppLink href="/tai-khoan">Đăng nhập →</AppLink></main></>;
 return <>{!embedded&&<Header/>}<main ref={state.shell} aria-busy={!state.loaded} className={'operator-workspace'+(embedded?' is-embedded':'')+(details?' has-details':'')} data-pane={pane}><InboxList inbox={inbox} selected={state.selected} workspaceError={state.initializationFailed?{message:state.error,retry:state.retry,busy:state.busy||state.uploading}:undefined} onSelect={id=>{if(state.setSelected(id))setPane('chat');}}/><section className="operator-conversation" aria-label="Hội thoại đang mở"><header className="operator-conversation-header"><button className="operator-back" aria-label="Về danh sách hội thoại" onClick={()=>setPane('list')}>‹</button><div><h2>{c?.restricted?'Yêu cầu chờ tiếp nhận':c?conversationDisplayTitle(c.id,c.title):'Hội thoại'}</h2>{c&&<p>{labels[c.state]}{!c.restricted&&conversationDisplayTitle(c.id,c.title)!==shortConversationId(c.id)&&' · '+shortConversationId(c.id)}</p>}</div><div className="operator-actions"><DeleteConversationButton state={state} onDeleted={()=>{deleted.current=state.selected;setPane('list');setDetails(false);void inbox.refresh(true);}}/>{c?.state==='queued'&&<button className="operator-primary" disabled={state.busy||state.uploading} onClick={()=>action('claim')}>Nhận xử lý</button>}{canReply&&<button disabled={state.busy||state.uploading} onClick={()=>action('close')}>✓ Hoàn tất</button>}{c?.state==='closed'&&<button disabled={state.busy||state.uploading} onClick={()=>action('reopen')}>Mở lại</button>}{c&&<button aria-label="Thông tin hội thoại" aria-expanded={details} onClick={()=>{setDetails(!details);setPane(details?'chat':'details');}}>ⓘ</button>}</div></header><Transcript state={state} onClaim={()=>void action('claim')}/>{!state.initializationFailed&&(state.error||state.connectionError)&&<div className="operator-error" role="alert">{state.error||state.connectionError}{(state.initializationFailed||state.connectionError)&&<button type="button" disabled={state.busy||state.uploading} onClick={state.retry}>Thử lại</button>}</div>}{state.selected&&<Composer key={state.selected} state={state} canReply={Boolean(canReply)} onSent={()=>void inbox.refresh(true)}/>}</section>{details&&<Details state={state} onAction={action} onClose={()=>{setDetails(false);setPane('chat');}}/>}</main></>;
}

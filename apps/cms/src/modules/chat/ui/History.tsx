"use client";
import {confirmAction} from '../../shared/confirm-dialog';
import {useLocale} from "../../shared/locale";
import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import type {WorkspaceState} from '../useWorkspace';
import {conversationDisplayTitle} from '../display';
import {ChatIcon} from './Icons';
export function ChatHistory({state,onSelect,onNew}:{state:WorkspaceState;onSelect:(id:string)=>void;onNew:()=>void}){
 const {t}=useLocale();
 const [search,setSearch]=useState(''),id=useId();
 const [menu,setMenu]=useState(''),[renaming,setRenaming]=useState(''),[name,setName]=useState(''),menuRoot=useRef<HTMLDivElement>(null),actions=useRef<HTMLDivElement>(null),renameDialog=useRef<HTMLDialogElement>(null),nameInput=useRef<HTMLInputElement>(null),trigger=useRef<HTMLButtonElement|null>(null);
 useEffect(()=>{setMenu('');setRenaming('');renameDialog.current?.close();},[state.sessionRevision]);
 useLayoutEffect(()=>{
  const panel=actions.current,button=trigger.current;if(!menu||!panel||!button)return;
  panel.showPopover();
  const place=()=>{
   const anchor=button.getBoundingClientRect(),width=panel.offsetWidth,height=panel.offsetHeight,viewport=document.documentElement;
   panel.style.left=Math.max(8,Math.min(anchor.right-width,viewport.clientWidth-width-8))+'px';
   panel.style.top=Math.max(8,anchor.bottom+6+height<=viewport.clientHeight-8?anchor.bottom+6:anchor.top-height-6)+'px';
  };
  place();window.addEventListener('resize',place);document.addEventListener('scroll',place,true);
  return()=>{window.removeEventListener('resize',place);document.removeEventListener('scroll',place,true);if(panel.matches(':popover-open'))panel.hidePopover();};
 },[menu]);
 useEffect(()=>{
  if(!menu)return;
  const dismiss=(event:PointerEvent)=>{if(!menuRoot.current?.contains(event.target as Node))setMenu('');};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();setMenu('');trigger.current?.focus({preventScroll:true});}};
  const frame=requestAnimationFrame(()=>menuRoot.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus());
  document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};
 },[menu]);
 const rows=state.rows.map(row=>({...row,displayTitle:conversationDisplayTitle(row.id,row.title,t('Cuộc hội thoại mới'),row.customTitle)})).filter(row=>row.displayTitle.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
 return <>
  <button type="button" className="chat-create" onClick={onNew} disabled={state.busy||state.uploading||!state.loaded}><ChatIcon name="new"/>{t("Cuộc trò chuyện mới")}</button>
  <label htmlFor={id} className="sr-only">{t("Tìm cuộc trò chuyện")}</label><input id={id} className="chat-history-search" value={search} onChange={e=>setSearch(e.target.value)} type="search" placeholder={t("Tìm cuộc trò chuyện")}/>
  <div className="chat-history-list" aria-label={t("Lịch sử hội thoại")}>
   {state.initializationFailed?<p className="chat-history-error" role="alert">{t("Chưa tải được lịch sử hội thoại.")} <button type="button" onClick={state.retry} disabled={state.busy||state.uploading}>{t("Thử lại")}</button></p>:!state.loaded?<p role="status">{t("Đang tải…")}</p>:rows.length?rows.map(row=><div key={row.id} ref={menu===row.id?menuRoot:undefined} className={'chat-history-row'+(state.selected===row.id?' is-selected':'')+(menu===row.id?' is-menu-open':'')}>
    <button className="chat-history-select" type="button" aria-current={state.selected===row.id?'page':undefined} disabled={state.busy||state.uploading||!state.loaded} onClick={()=>{setMenu('');onSelect(row.id);}}><span title={row.displayTitle}>{row.displayTitle}</span></button>
    <button className="chat-history-more" type="button" aria-label={t('Tùy chọn hội thoại')} aria-haspopup="menu" aria-expanded={menu===row.id} disabled={state.busy||state.uploading||!state.loaded} onClick={event=>{trigger.current=event.currentTarget;setMenu(menu===row.id?'':row.id);}}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>
    {menu===row.id&&<div ref={actions} popover="manual" className="chat-history-actions" role="menu" aria-label={t('Tùy chọn hội thoại')} onKeyDown={event=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();const items=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')),index=items.indexOf(document.activeElement as HTMLButtonElement),next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next]?.focus();}}><button type="button" role="menuitem" onClick={()=>{setMenu('');state.setError('');setRenaming(row.id);setName(row.displayTitle);renameDialog.current?.showModal();requestAnimationFrame(()=>nameInput.current?.select());}}><ChatIcon name="edit"/>{t('Đổi tên')}</button><button type="button" role="menuitem" className="is-danger" onClick={()=>{setMenu('');void state.deleteCustomerConversation(row.id,()=>confirmAction({title:t('Xóa hội thoại'),message:t('Xóa hội thoại này cùng toàn bộ tin nhắn và tệp đính kèm? Không thể hoàn tác.'),confirmLabel:t('Xóa hội thoại'),cancelLabel:t('Hủy'),danger:true}));}}><ChatIcon name="trash"/>{t('Xóa')}</button></div>}
   </div>):<p>{t(search?'Chưa tìm thấy hội thoại.':'Hội thoại của bạn sẽ ở đây.')}</p>}
  </div>
  <dialog ref={renameDialog} className="chat-rename-dialog" aria-labelledby={id+'-rename-title'} onClose={()=>setRenaming('')} onCancel={event=>{if(state.busy)event.preventDefault();}}>
   <form onSubmit={async event=>{event.preventDefault();if(renaming&&!state.busy&&await state.renameCustomerConversation(renaming,name))renameDialog.current?.close();}}>
    <h2 id={id+'-rename-title'}>{t('Đổi tên hội thoại')}</h2><label htmlFor={id+'-name'}>{t('Tên hội thoại')}</label><input ref={nameInput} id={id+'-name'} value={name} onChange={event=>setName(event.target.value)} required maxLength={100} disabled={state.busy}/>
    {renaming&&state.error&&<p role="alert">{t(state.error)}</p>}<div><button type="button" disabled={state.busy} onClick={()=>renameDialog.current?.close()}>{t('Hủy')}</button><button type="submit" disabled={state.busy||!name.trim()}>{t(state.busy?'Đang lưu…':'Lưu')}</button></div>
   </form>
  </dialog>
 </>;
}

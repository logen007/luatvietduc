"use client";
import {useLocale} from "../../shared/locale";
import {useId,useState} from 'react';
import type {WorkspaceState} from '../useWorkspace';
import {ChatIcon} from './Icons';
export function ChatHistory({state,onSelect,onNew}:{state:WorkspaceState;onSelect:(id:string)=>void;onNew:()=>void}){
 const {t,language}=useLocale();
 const [search,setSearch]=useState(''),id=useId();
 const rows=state.rows.filter(row=>String(row.title||'').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
 return <>
  <button type="button" className="chat-create" onClick={onNew} disabled={state.busy||state.uploading||!state.loaded}><ChatIcon name="new"/>{t("Cuộc trò chuyện mới")}</button>
  <label htmlFor={id} className="sr-only">{t("Tìm cuộc trò chuyện")}</label><input id={id} className="chat-history-search" value={search} onChange={e=>setSearch(e.target.value)} type="search" placeholder={t("Tìm cuộc trò chuyện")}/>
  <div className="chat-history-list" aria-label={t("Lịch sử hội thoại")}>
   {!state.loaded?<p role="status">{t("Đang tải…")}</p>:rows.length?rows.map(row=><button type="button" key={row.id} className={state.selected===row.id?'is-selected':''} aria-current={state.selected===row.id?'page':undefined} disabled={state.busy||state.uploading||!state.loaded} onClick={()=>onSelect(row.id)}><span>{row.title==='Cuộc trò chuyện mới'?t(row.title):row.title}</span><small>{t(row.state==='closed'?'Đã hoàn tất':row.state==='human'?'Chuyên viên đang hỗ trợ':'Cuộc trò chuyện')}</small></button>):<p>{t(search?'Chưa tìm thấy hội thoại.':'Hội thoại của bạn sẽ ở đây.')}</p>}
  </div>
  <a className="chat-account" href="/tai-khoan"><span aria-hidden="true">{state.me?.user?.name?.charAt(0)||'L'}</span><strong>{state.me?.user?.name||t(state.sessionStatus==='ready'&&!state.me?.user?'Đăng nhập':'Tài khoản')}</strong><ChatIcon name="arrow"/></a>
 </>;
}

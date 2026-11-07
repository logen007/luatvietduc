"use client";
import {useLocale} from "../../shared/locale";
import {useId,useState} from 'react';
import type {WorkspaceState} from '../useWorkspace';
import {ChatIcon} from './Icons';
export function ChatHistory({state,onSelect,onNew}:{state:WorkspaceState;onSelect:(id:string)=>void;onNew:()=>void}){
 const {t}=useLocale();
 const [search,setSearch]=useState(''),id=useId();
 const rows=state.rows.map(row=>({...row,displayTitle:!row.title||row.title==='Cuộc trò chuyện mới'||/^(hi|hello|hallo|chào|xin chào)[.!?\s]*$/i.test(row.title)||row.title.trim().length<4?t('Cuộc trò chuyện mới'):row.title})).filter(row=>row.displayTitle.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
 return <>
  <button type="button" className="chat-create" onClick={onNew} disabled={state.busy||state.uploading||!state.loaded}><ChatIcon name="new"/>{t("Cuộc trò chuyện mới")}</button>
  <label htmlFor={id} className="sr-only">{t("Tìm cuộc trò chuyện")}</label><input id={id} className="chat-history-search" value={search} onChange={e=>setSearch(e.target.value)} type="search" placeholder={t("Tìm cuộc trò chuyện")}/>
  <div className="chat-history-list" aria-label={t("Lịch sử hội thoại")}>
   {state.initializationFailed?<p className="chat-history-error" role="alert">{t("Chưa tải được lịch sử hội thoại.")} <button type="button" onClick={state.retry} disabled={state.busy||state.uploading}>{t("Thử lại")}</button></p>:!state.loaded?<p role="status">{t("Đang tải…")}</p>:rows.length?rows.map(row=><button type="button" key={row.id} className={state.selected===row.id?'is-selected':''} aria-current={state.selected===row.id?'page':undefined} disabled={state.busy||state.uploading||!state.loaded} onClick={()=>onSelect(row.id)}><span title={row.displayTitle}>{row.displayTitle}</span></button>):<p>{t(search?'Chưa tìm thấy hội thoại.':'Hội thoại của bạn sẽ ở đây.')}</p>}
  </div>
 </>;
}

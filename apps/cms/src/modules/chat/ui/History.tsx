"use client";
import {useId,useState} from 'react';
import type {WorkspaceState} from '../useWorkspace';
import {ChatIcon} from './Icons';
export function ChatHistory({state,onSelect,onNew}:{state:WorkspaceState;onSelect:(id:string)=>void;onNew:()=>void}){
 const [search,setSearch]=useState(''),id=useId();
 const rows=state.rows.filter(row=>String(row.title||'').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
 return <>
  <button type="button" className="chat-create" onClick={onNew} disabled={state.busy}><ChatIcon name="new"/>Cuộc trò chuyện mới</button>
  <label htmlFor={id} className="sr-only">Tìm cuộc trò chuyện</label><input id={id} className="chat-history-search" value={search} onChange={e=>setSearch(e.target.value)} type="search" placeholder="Tìm cuộc trò chuyện"/>
  <div className="chat-history-list" aria-label="Lịch sử hội thoại">
   {!state.loaded?<p role="status">Đang tải…</p>:rows.length?rows.map(row=><button type="button" key={row.id} className={state.selected===row.id?'is-selected':''} aria-current={state.selected===row.id?'page':undefined} disabled={state.busy} onClick={()=>onSelect(row.id)}><span>{row.title}</span><small>{row.jurisdiction==='DE'?'Đức':'Việt Nam'}</small></button>):<p>{search?'Chưa tìm thấy hội thoại.':'Hội thoại của bạn sẽ ở đây.'}</p>}
  </div>
  <a className="chat-account" href="/tai-khoan"><span aria-hidden="true">{state.me?.user?.name?.charAt(0)||'L'}</span><strong>{state.me?.user?.name||'Đăng nhập'}</strong><ChatIcon name="arrow"/></a>
 </>;
}

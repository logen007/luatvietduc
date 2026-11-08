'use client';
import {useEffect,useRef,useState} from 'react';
import {conversationDisplayTitle} from '../display';
import type {InboxState} from './useInbox';
export const labels:Record<string,string>={queue:'Hàng chờ',active:'Đang xử lý',done:'Hoàn tất',all:'Tất cả',low:'Ưu tiên thấp',queued:'Chờ tiếp nhận',human:'Đang xử lý',closed:'Đã hoàn tất'};
export const date=(value?:string)=>value?new Date(value).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
const expiryTime=(value?:string|null)=>{const time=typeof value==='string'&&value?Date.parse(value):NaN;return Number.isFinite(time)?time:null;};
const countdown=(expires:number,now:number)=>{const seconds=Math.max(0,Math.ceil((expires-now)/1000));return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(value=>String(value).padStart(2,'0')).join(':');};
export function InboxList({inbox,selected,onSelect,workspaceError}:{inbox:InboxState;selected:string;onSelect:(id:string)=>void;workspaceError?:{message:string;retry:()=>void;busy:boolean}}){
 const error=workspaceError?.message||inbox.error;
 const [now,setNow]=useState(()=>Date.now()),refreshed=useRef(new Set<string>()),refresh=useRef(inbox.refresh);refresh.current=inbox.refresh;
 const expiryKey=JSON.stringify(inbox.rows.map(row=>[row.id,row.expires_at]));
 useEffect(()=>{
  const deadlines=(JSON.parse(expiryKey) as [string,string|null|undefined][]).flatMap(([id,value])=>{const time=expiryTime(value);return time===null?[]:[{key:id+':'+time,time}];});
  const tick=()=>{
   const time=Date.now();setNow(time);let expired=false;
   // Mark before refreshing: stale rows or paging back cannot create a request loop.
   for(const item of deadlines)if(item.time<=time&&!refreshed.current.has(item.key)){refreshed.current.add(item.key);expired=true;}
   if(expired)void refresh.current(true);
   return deadlines.some(item=>item.time>time);
  };
  if(!tick())return;
  const timer=setInterval(()=>{if(!tick())clearInterval(timer);},1000);
  return()=>clearInterval(timer);
 },[expiryKey]);
 return <aside className="operator-inbox" aria-label="Danh sách hội thoại"><header><h1>Hộp thư <span>{inbox.counts.all||0}</span></h1><label className="operator-search"><span aria-hidden="true">⌕</span><input aria-label="Tìm hội thoại theo tiêu đề hoặc mã" placeholder="Tìm tiêu đề hoặc mã hội thoại…" maxLength={120} value={inbox.query} onChange={e=>inbox.setQuery(e.target.value)}/></label></header><label className="operator-inbox-filter"><span className="sr-only">Lọc hội thoại</span><select value={inbox.view} onChange={event=>inbox.setView(event.target.value)}>{['all','queue','active','done','low'].map(view=><option key={view} value={view}>{labels[view]} ({inbox.counts[view]||0})</option>)}</select></label><div className="operator-threads" aria-busy={inbox.loading}>{error&&<p role="alert" className={workspaceError?'operator-error':undefined}>{error} <button type="button" disabled={workspaceError?.busy} onClick={()=>workspaceError?workspaceError.retry():inbox.refresh()}>Thử lại</button></p>}{inbox.loading&&!inbox.rows.length?<p className="operator-empty">Đang tải hội thoại…</p>:!inbox.rows.length?<p className="operator-empty">{inbox.query?'Không tìm thấy hội thoại phù hợp.':'Chưa có hội thoại trong mục này.'}</p>:inbox.rows.map(row=>{const expires=expiryTime(row.expires_at);return <button className={'operator-thread'+(selected===row.id?' is-selected':'')} key={row.id} onClick={()=>onSelect(row.id)} aria-current={selected===row.id?'true':undefined}><span className="operator-thread-top"><span className={'operator-status '+row.state}>{labels[row.state]}</span><time dateTime={row.updated_at}>{date(row.updated_at)}</time></span><strong>{conversationDisplayTitle(row.id,row.title,undefined,row.customTitle)}</strong>{(row.qualification==='low'||expires!==null)&&<span className="operator-thread-triage">{row.qualification==='low'&&<span className="operator-low-badge">Ưu tiên thấp</span>}{expires!==null&&<time className="operator-expiry" dateTime={row.expires_at!} aria-label={'Tự xóa sau '+countdown(expires,now)}>{countdown(expires,now)}</time>}</span>}<span className="operator-thread-bottom"><span>{'#'+row.id.slice(0,8)}</span><span aria-hidden="true">→</span></span></button>;})}</div><footer><span>{inbox.total} hội thoại</span><div><button aria-label="Trang trước" disabled={inbox.page<=1} onClick={()=>inbox.setPage(inbox.page-1)}>‹</button><span>{inbox.page}/{inbox.totalPages}</span><button aria-label="Trang sau" disabled={inbox.page>=inbox.totalPages} onClick={()=>inbox.setPage(inbox.page+1)}>›</button></div></footer></aside>;
}

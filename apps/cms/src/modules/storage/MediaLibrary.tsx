'use client';
import {useRouter} from 'next/navigation';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {DefaultListView,useAuth,useListDrawerContext,useListQuery,useSelection,useRouteTransition} from '@payloadcms/ui';
import type {ListViewClientProps} from 'payload';
import {MediaDetails,type MediaItem} from './MediaDetails';
import {MediaUploader} from './MediaUploader';
import {useUnsavedChanges} from '../shared/unsaved-changes';
import {mediaEditable,mediaFilters,mediaName,mediaReadOnly,mediaURL,mediaWhere,type MediaKind} from './media-view';
type Mode='grid'|'list';
type MediaDoc=MediaItem;
const ViewContext=createContext<{mode:Mode;setMode:(mode:Mode)=>void;bulk:boolean;setBulk:(value:boolean)=>void;busy:boolean;setBusy:(value:boolean)=>void}>({mode:'grid',setMode:()=>{},bulk:false,setBulk:()=>{},busy:false,setBusy:()=>{}});
function ViewIcon({grid}:{grid?:boolean}){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{grid?<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>:<><path d="M9 5h12M9 12h12M9 19h12"/><rect x="3" y="4" width="2" height="2"/><rect x="3" y="11" width="2" height="2"/><rect x="3" y="18" width="2" height="2"/></>}</svg>;}
function FilePreview({doc}:{doc:MediaDoc}){
 const [failed,setFailed]=useState(false),src=mediaURL(doc.thumbnailURL||doc.sizes?.thumbnail?.url||doc.url),image=doc.mimeType?.startsWith('image/');
 useEffect(()=>setFailed(false),[src]);
 return <span className={'lvd-media-preview'+(doc.mimeType==='image/svg+xml'?' is-svg':'')}>
  {image&&src&&!failed?<img src={src} alt="" loading="lazy" decoding="async" onError={()=>setFailed(true)}/>:<span className="lvd-media-file-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true"><path d="M6 2h8l5 5v15H5V2h1ZM14 2v6h5M8 13h8M8 17h6"/></svg><small>{doc.mimeType?.split('/')[1]?.replace('svg+xml','SVG').toUpperCase()||'FILE'}</small></span>}
 </span>;
}
function useMediaSelection(){
 const selection=useSelection(),{data}=useListQuery(),{user}=useAuth();
 const docs=(data?.docs||[]) as MediaDoc[],canEdit=['owner','support'].includes(user?.role||'');
 const mutable=docs.filter(doc=>mediaEditable(doc,user)&&(!doc._isLocked||doc._userEditing?.id===user?.id));
 function clear(){for(const id of selection.getSelectedIds())selection.setSelection(id);}
 return {...selection,docs,mutable,canEdit,deletable:mutable,clear};
}
function MediaToolbar(props:ListViewClientProps){
 const {mode,setMode,bulk,setBulk,busy,setBusy}=useContext(ViewContext),{query,refineListData,data}=useListQuery(),{user}=useAuth();
 const {isTransitioning}=useRouteTransition(),router=useRouter();
 const [uploadOpen,setUploadOpen]=useState(false),[uploadBusy,setUploadBusy]=useState(false),[dates,setDates]=useState<{month:string;count:number}[]>([]),[dateAttempt,setDateAttempt]=useState(0),[dateError,setDateError]=useState(false);
 useEffect(()=>{const controller=new AbortController();setDateError(false);fetch('/service/media/dates',{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])}).then(async r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{if(!controller.signal.aborted)setDates(data.dates);}).catch(()=>{if(!controller.signal.aborted)setDateError(true);});return()=>controller.abort();},[dateAttempt]);
 const selection=useMediaSelection(),{kind,month}=mediaFilters(query.where),[search,setSearch]=useState(query.search||'');
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),latest=useRef(refineListData);latest.current=refineListData;
 useEffect(()=>{if(!timer.current)setSearch(query.search||'');},[query.search]);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 const selectedCount=selection.mutable.filter(doc=>selection.selected.get(doc.id)).length,selectedDocs=selection.deletable.filter(doc=>selection.selected.get(doc.id)),[action,setAction]=useState(''),[deleteStatus,setDeleteStatus]=useState(''),[deleteError,setDeleteError]=useState(''),gate=useRef(false),mounted=useRef(true),account=String(user?.id)+':'+user?.role,accountRef=useRef(account),selectionRef=useRef(selection);accountRef.current=account;selectionRef.current=selection;
 useUnsavedChanges(busy);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 async function removeSelected(){
  if(gate.current||uploadBusy||!props.hasDeletePermission||props.disableBulkDelete||!selectedDocs.length)return;
  const docs=[...selectedDocs],owner=account;
  if(!window.confirm('Xóa '+docs.length+' tệp đã chọn?'+(docs.some(mediaReadOnly)?' Ảnh đi kèm giao diện chỉ được gỡ khỏi Thư viện.':' Thao tác này không thể hoàn tác.')))return;
  if(timer.current){clearTimeout(timer.current);timer.current=null;setSearch(query.search||'');}
  gate.current=true;setBusy(true);setDeleteError('');setDeleteStatus('Đang xóa…');let removed=0,failed=0;
  try{
   for(const doc of docs){
    if(!mounted.current||accountRef.current!==owner)break;
    try{
     const response=await fetch('/api/media/'+doc.id,{method:'DELETE',signal:AbortSignal.timeout(20000)});
     if(!response.ok&&response.status!==404)throw new Error();
     removed++;if(mounted.current&&accountRef.current===owner&&selectionRef.current.selected.get(doc.id))selectionRef.current.setSelection(doc.id);
    }catch{failed++;}
    if(mounted.current&&accountRef.current===owner)setDeleteStatus('Đã xóa '+removed+'/'+docs.length+' tệp.');
   }
   if(mounted.current&&accountRef.current===owner){
    if(failed)setDeleteError(failed+' tệp chưa xóa được. Kiểm tra quyền hoặc thử lại.');
    else{selectionRef.current.clear();setAction('');setBulk(false);}
    if(removed){
     setDateAttempt(v=>v+1);
     const last=Math.max(1,Math.ceil(Math.max(0,(data?.totalDocs||0)-removed)/(data?.limit||10)));
     if(!failed&&Number(query.page||1)>last)void latest.current({page:last});else router.refresh();
    }
   }
  }finally{gate.current=false;if(mounted.current)setBusy(false);}
 }
 function reset(){selection.clear();setDeleteError('');setDeleteStatus('');}
 function filter(nextKind:MediaKind,nextMonth:string){if(timer.current){clearTimeout(timer.current);timer.current=null;}reset();void latest.current({where:mediaWhere(query.where,nextKind,nextMonth),search:search||undefined,page:1});}
 function changeSearch(value:string){setSearch(value);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>{timer.current=null;reset();void latest.current({search:value||undefined,page:1});},350);}
 return <div className="lvd-media-toolbar" aria-busy={isTransitioning}>
  <fieldset className="lvd-media-filters" disabled={busy}>
   <button type="button" className="lvd-media-add" aria-expanded={uploadOpen} disabled={!props.hasCreatePermission||uploadBusy} title={props.hasCreatePermission?'Tải tệp mới':'Chưa có quyền tải tệp hoặc chưa bật lưu trữ'} onClick={()=>setUploadOpen(!uploadOpen)}>Tải tệp</button>
   <div className="lvd-media-view-buttons" role="group" aria-label="Chế độ xem"><button type="button" aria-label="Xem dạng danh sách" aria-pressed={mode==='list'} onClick={()=>setMode('list')}><ViewIcon/></button><button type="button" aria-label="Xem dạng lưới" aria-pressed={mode==='grid'} onClick={()=>{setMode('grid');if(selectedCount)setBulk(true);}}><ViewIcon grid/></button></div>
   <select aria-label="Loại tệp" value={kind} onChange={e=>filter(e.target.value as MediaKind,month)}><option value="">Tất cả tệp</option><option value="image">Ảnh</option><option value="svg">SVG</option><option value="video">Video</option><option value="audio">Âm thanh</option><option value="pdf">PDF</option></select>
   <select aria-label="Ngày tải lên" value={month} onChange={e=>filter(kind,e.target.value)}><option value="">Tất cả ngày</option>{month&&!dates.some(item=>item.month===month)&&<option value={month}>{month}</option>}{dates.map(item=><option key={item.month} value={item.month}>{new Date(item.month+'-01T00:00:00Z').toLocaleDateString('vi-VN',{month:'long',year:'numeric'})}</option>)}</select>{dateError&&<button type="button" onClick={()=>setDateAttempt(v=>v+1)}>Tải lại ngày</button>}
   <select aria-label="Sắp xếp tệp" value={typeof query.sort==='string'?query.sort:'-createdAt'} onChange={e=>{if(timer.current){clearTimeout(timer.current);timer.current=null;}reset();void latest.current({sort:e.target.value,search:search||undefined,page:1});}}><option value="-createdAt">Mới nhất</option><option value="createdAt">Cũ nhất</option><option value="filename">Tên A–Z</option></select>
   {selection.canEdit&&mode==='grid'&&<>{!bulk?<button type="button" className="lvd-media-bulk-toggle" onClick={()=>{reset();setBulk(true);}}>Chọn nhiều</button>:<><button type="button" className="lvd-media-delete-selected" disabled={uploadBusy||!props.hasDeletePermission||props.disableBulkDelete||!selectedDocs.length} onClick={()=>void removeSelected()}>Xóa tệp đã chọn</button><button type="button" onClick={()=>{reset();setBulk(false);}}>Hủy chọn</button></>}</>}
   <input className="lvd-media-search" type="search" aria-label="Tìm tệp" placeholder="Tìm tệp…" value={search} onChange={e=>changeSearch(e.target.value)}/>
  </fieldset>
  {uploadOpen&&<MediaUploader key={account} onBusyChange={setUploadBusy} onDone={()=>{if(timer.current){clearTimeout(timer.current);timer.current=null;}reset();setSearch('');setDateAttempt(v=>v+1);void latest.current({...query,search:undefined,page:1,sort:'-createdAt',where:mediaWhere(query.where,'','')});router.refresh();}}/>}
  <div className="lvd-media-status"><span role="status">{busy?deleteStatus:isTransitioning?'Đang tải…':(data?.totalDocs||0)+' tệp'}</span>{selectedCount>0&&<span>{selectedCount} đã chọn</span>}</div>
  {mode==='list'&&selection.canEdit&&<div className="lvd-media-list-actions"><select aria-label="Thao tác hàng loạt" value={action} disabled={busy} onChange={event=>setAction(event.target.value)}><option value="">Thao tác hàng loạt</option>{props.hasDeletePermission&&!props.disableBulkDelete&&<option value="delete">Xóa vĩnh viễn</option>}</select><button type="button" disabled={busy||uploadBusy||action!=='delete'||!selectedDocs.length} onClick={()=>void removeSelected()}>Áp dụng</button></div>}
  {!busy&&deleteStatus&&<p className="lvd-media-delete-status" role="status">{deleteStatus}</p>}
  {deleteError&&<p className="lvd-media-delete-error" role="alert">{deleteError} <button type="button" disabled={busy||uploadBusy||!selectedDocs.length} onClick={()=>void removeSelected()}>Thử lại</button></p>}
 </div>;
}
function size(bytes?:number){if(!bytes)return '—';return bytes<1048576?Math.round(bytes/1024)+' KB':(bytes/1048576).toFixed(1)+' MB';}
function PageSelection(){
 const {mutable,selected,setSelection}=useMediaSelection(),{busy}=useContext(ViewContext),input=useRef<HTMLInputElement>(null),all=mutable.length>0&&mutable.every(doc=>selected.get(doc.id)),some=mutable.some(doc=>selected.get(doc.id));
 useEffect(()=>{if(input.current)input.current.indeterminate=some&&!all;},[some,all]);
 return <input ref={input} type="checkbox" aria-label="Chọn cả trang" checked={all} disabled={busy||!mutable.length} onChange={()=>{for(const doc of mutable)if(Boolean(selected.get(doc.id))!==!all)setSelection(doc.id);}}/>;
}
function MediaItems(){
 const {mode,bulk,busy}=useContext(ViewContext),{docs,selected,setSelection,mutable}=useMediaSelection(),{user}=useAuth(),router=useRouter();
 const [opened,setOpened]=useState<number|null>(null),changed=useRef(false);
 // An autosave can remove the last search match. Keep the dialog and any newer
 // draft mounted until the user closes it, then refresh the result set once.
 function closeDetails(){setOpened(null);if(changed.current){changed.current=false;router.refresh();}}
 const details=opened!==null&&<MediaDetails key={String(user?.id)+':'+user?.role+':'+opened} id={opened} ids={docs.map(doc=>doc.id)} onSelect={setOpened} onClose={closeDetails} onChanged={()=>{changed.current=true;}}/>;
 const editable=new Set(mutable.map(doc=>doc.id));
 function checkbox(doc:MediaDoc){return <input type="checkbox" aria-label={'Chọn '+mediaName(doc)} checked={Boolean(selected.get(doc.id))} disabled={busy||!editable.has(doc.id)} onChange={()=>setSelection(doc.id)}/>;}
 const href=(doc:MediaDoc)=>'/admin/collections/media/'+doc.id;
 if(mode==='grid')return <><div className="lvd-media-grid">{docs.map(doc=><div key={doc.id} className={'lvd-media-tile'+(selected.get(doc.id)?' is-selected':'')}>
  {bulk&&<label className="lvd-media-checkbox">{checkbox(doc)}</label>}
  <a href={href(doc)} className="lvd-media-tile-link" title={mediaName(doc)} onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();if(busy)return;if(bulk){if(editable.has(doc.id))setSelection(doc.id);}else setOpened(doc.id);}}><FilePreview doc={doc}/><span className="lvd-media-tile-name" title={mediaName(doc)}>{mediaName(doc)}</span></a>
 </div>)}</div>{details}</>;
 return <><div className="lvd-media-table-wrap"><table className="lvd-media-table"><thead><tr><th className="lvd-media-check-col"><PageSelection/></th><th>Tệp</th><th>Loại</th><th>Dung lượng</th><th>Ngày tải lên</th></tr></thead><tbody>{docs.map(doc=><tr key={doc.id} className={selected.get(doc.id)?'is-selected':''}><td className="lvd-media-check-col">{checkbox(doc)}</td><td><a className="lvd-media-file-row" href={href(doc)}><FilePreview doc={doc}/><span><strong>{doc.title||mediaName(doc)}</strong><small>{mediaName(doc)}</small>{doc.alt&&doc.alt!==mediaName(doc)&&<small>{doc.alt}</small>}</span></a></td><td>{doc.mimeType||'—'}</td><td>{size(doc.filesize)}</td><td>{doc.createdAt?new Date(doc.createdAt).toLocaleDateString('vi-VN'):'—'}</td></tr>)}</tbody></table></div>{details}</>;
}
export function MediaLibrary(props:ListViewClientProps){
 const [mode,setMode]=useState<Mode>('grid'),[bulk,setBulk]=useState(false),[busy,setBusy]=useState(false),{isInDrawer}=useListDrawerContext();
 useEffect(()=>{try{const stored=localStorage.getItem('lvd-media-view');if(stored==='list'||stored==='grid')setMode(stored);}catch{}},[]);
 function changeMode(value:Mode){setMode(value);try{localStorage.setItem('lvd-media-view',value);}catch{}}
 if(isInDrawer)return <DefaultListView {...props}/>;
 return <ViewContext.Provider value={{mode,setMode:changeMode,bulk,setBulk,busy,setBusy}}><div className="lvd-media-library"><DefaultListView {...props} disableBulkEdit disableBulkDelete BeforeListTable={<><MediaToolbar {...props}/>{props.BeforeListTable}</>} Table={<MediaItems/>}/></div></ViewContext.Provider>;
}

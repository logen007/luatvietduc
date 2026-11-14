'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {useAuth,useListDrawerContext,useListQuery,useRouteTransition} from '@payloadcms/ui';
import {MediaUploader} from './MediaUploader';
import {mediaName,mediaPreviewURL} from './media-view';
import type {MediaItem} from './MediaDetails';

// Keep Payload's server-filtered results: upload fields still enforce their own
// image/video/public restrictions and the collection's access rules.
export function MediaPicker({canCreate}:{canCreate:boolean}){
 const {user}=useAuth(),drawer=useListDrawerContext(),{data,query,refineListData}=useListQuery(),{isTransitioning}=useRouteTransition();
 const docs=(data?.docs||[]) as MediaItem[],[tab,setTab]=useState<'library'|'upload'>('library'),[selected,setSelected]=useState<MediaItem|null>(null),[search,setSearch]=useState(query.search||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const id=useId();
 const [pending,setPending]=useState<number|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),latest=useRef(refineListData);latest.current=refineListData;
 const canUpload=canCreate&&drawer.allowCreate!==false;
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 useEffect(()=>{if(pending){const doc=docs.find(item=>item.id===pending);if(doc){setSelected(doc);setPending(null);}}},[data,pending]);
 function find(value:string){setSearch(value);clearTimeout(timer.current);timer.current=setTimeout(()=>{void latest.current({search:value||undefined,page:1});},300);}
 async function choose(){
  if(!selected||busy||isTransitioning)return;setBusy(true);setError('');
  try{await drawer.onSelect?.({collectionSlug:'media',doc:selected,docID:String(selected.id)});}
  catch{setError('Chưa chọn được tệp. Vui lòng thử lại.');}
  finally{setBusy(false);}
 }
 const preview=selected&&mediaPreviewURL(selected);
 return <section className="lvd-media-picker" aria-label="Chọn tệp từ thư viện" aria-busy={busy||isTransitioning}>
  <div className="lvd-media-picker-tabs" role="tablist" aria-label="Nguồn tệp" onKeyDown={event=>{if(!canUpload||busy||!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const next=tab==='library'?'upload':'library';setTab(next);event.currentTarget.querySelector<HTMLButtonElement>('[data-tab="'+next+'"]')?.focus();}}>
   {canUpload&&<button type="button" role="tab" id={id+'-upload-tab'} data-tab="upload" aria-controls={id+'-upload-panel'} tabIndex={tab==='upload'?0:-1} aria-selected={tab==='upload'} disabled={busy} onClick={()=>setTab('upload')}>Tải tệp lên</button>}
   <button type="button" role="tab" id={id+'-library-tab'} data-tab="library" aria-controls={id+'-library-panel'} tabIndex={tab==='library'?0:-1} aria-selected={tab==='library'} disabled={busy} onClick={()=>setTab('library')}>Thư viện</button>
  </div>
  <div role="tabpanel" id={id+'-upload-panel'} aria-labelledby={id+'-upload-tab'} hidden={tab!=='upload'}>{canUpload&&<p className="lvd-media-picker-upload-note">Chỉ tệp phù hợp với mục đang chọn sẽ hiện trong Thư viện.{user?.role!=='owner'?' Tệp mới được lưu riêng tư; Admin cần công khai trước khi dùng trên website.':''}</p>}{canUpload&&<MediaUploader onBusyChange={setBusy} publicOption={user?.role==='owner'} onUploaded={doc=>setPending(doc.id)} onDone={async result=>{clearTimeout(timer.current);setBusy(true);setSearch('');try{await drawer.refresh('media');if(!result?.hasErrors)setTab('library');}catch{setError('Tệp đã tải lên. Chưa làm mới được thư viện, hãy mở lại để kiểm tra.');}finally{setBusy(false);}}}/>}</div>
  <div role="tabpanel" id={id+'-library-panel'} aria-labelledby={id+'-library-tab'} hidden={tab!=='library'}>
   <div className="lvd-media-picker-search"><label>Tìm tệp<input type="search" disabled={busy} placeholder="Tên tệp hoặc mô tả…" value={search} onChange={e=>find(e.target.value)}/></label><span role="status">{isTransitioning?'Đang tải…':`${data?.totalDocs||0} tệp`}</span></div>
   <div className="lvd-media-picker-layout"><div className="lvd-media-picker-grid" role="group" aria-label="Tệp trong thư viện">
    {docs.map(doc=>{const src=mediaPreviewURL(doc);return <button type="button" key={doc.id} className={'lvd-media-picker-item'+(selected?.id===doc.id?' is-selected':'')} aria-pressed={selected?.id===doc.id} disabled={busy||isTransitioning} onClick={()=>{setSelected(doc);setError('');}} title={mediaName(doc)}>
     <span className="lvd-media-picker-thumb">{src&&doc.mimeType?.startsWith('image/')?<img src={src} alt="" loading="lazy"/>:<span>{doc.mimeType?.split('/')[0]==='video'?'VIDEO':doc.mimeType?.split('/')[1]?.toUpperCase()||'TỆP'}</span>}</span><span className="lvd-media-picker-name">{doc.title||mediaName(doc)}</span>{selected?.id===doc.id&&<span className="lvd-media-picker-check" aria-hidden="true">✓</span>}
    </button>;})}
    {!docs.length&&<p className="lvd-media-picker-empty" role="status">{search?'Không tìm thấy tệp phù hợp.':'Chưa có tệp phù hợp với mục này.'}{canUpload&&<button type="button" onClick={()=>setTab('upload')}>Tải tệp lên</button>}</p>}
   </div><aside className="lvd-media-picker-details" aria-label="Tệp đã chọn">{selected?<>{preview&&selected.mimeType?.startsWith('image/')&&<img src={preview} alt=""/>}<strong>{mediaName(selected)}</strong><span>{selected.mimeType}</span>{selected.width&&selected.height&&<span>{selected.width} × {selected.height} px</span>}<span>{((selected.filesize||0)/1024).toLocaleString('vi-VN',{maximumFractionDigits:0})} KB</span>{selected.alt&&<p>{selected.alt}</p>}</>:<p>Chọn một tệp để xem thông tin.</p>}</aside></div>
  </div>
  <footer className="lvd-media-picker-footer"><span role="status">{error|| (selected?'Đã chọn: '+mediaName(selected):'Chưa chọn tệp')}</span><button type="button" disabled={!selected||busy||isTransitioning||tab!=='library'} onClick={()=>void choose()}>{busy?'Đang xử lý…':'Dùng tệp này'}</button></footer>
 </section>;
}

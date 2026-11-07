'use client';
import {AppLink} from '../shared/AppLink';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from '@payloadcms/ui';
import {mediaEditable,mediaName,mediaReadOnly,mediaURL} from './media-view';
import {confirmDiscardChanges,useUnsavedChanges} from '../shared/unsaved-changes';
import {MediaImageEditor,canEditMediaImage} from './MediaImageEditor';
import {mediaReceipt} from './media-client';
export type MediaItem={id:number;title?:string;filename?:string;alt?:string;caption?:string;description?:string;mimeType?:string;filesize?:number;createdAt?:string;updatedAt?:string;url?:string;thumbnailURL?:string;originalImageURL?:string;sizes?:Record<string,{url?:string;filename?:string;width?:number;height?:number;filesize?:number;mimeType?:string}|null>;width?:number;height?:number;visibility?:string;uploadedBy?:number|{id:number;name?:string}|null;_isLocked?:boolean;_userEditing?:{id:number}};
type Metadata={title:string;alt:string;caption:string;description:string;visibility:string};
const metadata=(doc:MediaItem):Metadata=>({title:doc.title||'',alt:doc.alt||'',caption:doc.caption||'',description:doc.description||'',visibility:doc.visibility||'private'});
const bytes=(value=0)=>value<1048576?Math.round(value/1024)+' KB':(value/1048576).toFixed(1)+' MB';
export function MediaDetails({id,ids,onSelect,onClose,onChanged}:{id:number;ids:number[];onSelect:(id:number)=>void;onClose:()=>void;onChanged:()=>void}){
 const {user}=useAuth(),dialog=useRef<HTMLDialogElement>(null),mounted=useRef(true),flight=useRef(false),closing=useRef(false);
 const [doc,setDoc]=useState<MediaItem|null>(null),[draft,setDraft]=useState<Metadata|null>(null),[saved,setSaved]=useState<Metadata|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState(''),[deleteError,setDeleteError]=useState(''),[loadAttempt,setLoadAttempt]=useState(0),[copied,setCopied]=useState(''),[confirmDelete,setConfirmDelete]=useState(false),[imageOpen,setImageOpen]=useState(false);
 const editable=Boolean(doc&&mediaEditable(doc,user)&&(!doc._isLocked||doc._userEditing?.id===user?.id)),dirty=Boolean(draft&&JSON.stringify(draft)!==JSON.stringify(saved));
 useUnsavedChanges(dirty||saving);
 useEffect(()=>{mounted.current=true;dialog.current?.showModal();return()=>{mounted.current=false;};},[]);
 useEffect(()=>{const controller=new AbortController();setDoc(null);setDraft(null);setSaved(null);setError('');setDeleteError('');setConfirmDelete(false);setCopied('');
  fetch('/api/media/'+id+'?depth=1',{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])}).then(async r=>{const value=await r.json();if(!r.ok)throw new Error(value.errors?.[0]?.message||'Chưa tải được thông tin tệp.');return mediaReceipt(value,id);}).then(value=>{if(!controller.signal.aborted){setDoc(value);setDraft(metadata(value));setSaved(metadata(value));}}).catch(e=>{if(!controller.signal.aborted)setError(e.message||'Chưa tải được thông tin tệp.');});
  return()=>controller.abort();
 },[id,user?.id,loadAttempt]);
 async function save(){
  if(!doc||!draft||!editable||flight.current||!dirty)return;
  const snapshot={...draft};flight.current=true;setSaving(true);setError('');
  try{
   const response=await fetch('/api/media/'+id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({...snapshot,updatedAt:doc.updatedAt}),signal:AbortSignal.timeout(20000)}),result=await response.json();
   if(!response.ok)throw new Error(result.errors?.[0]?.message||'Chưa lưu được thay đổi.');
   const savedDoc=mediaReceipt(result,id);
   if(mounted.current){setDoc(savedDoc);setSaved(snapshot);onChanged();}
  }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Chưa lưu được thay đổi.');}
  finally{flight.current=false;if(mounted.current)setSaving(false);}
 }
 useEffect(()=>{if(!dirty||!editable||saving||error)return;const timer=setTimeout(()=>void save(),650);return()=>clearTimeout(timer);},[draft,saved,saving,error,editable]);
 useEffect(()=>{if(closing.current&&!dirty&&!saving)onClose();},[dirty,saving]);
 function close(){if(dirty&&(error||!editable)&&!saving){closing.current=false;if(confirmDiscardChanges(true))onClose();return;}if(dirty||saving){closing.current=true;void save();}else onClose();}
 function move(next:number){if(next<0||next>=ids.length||dirty||saving)return;onSelect(ids[next]);}
 const index=ids.indexOf(id),src=mediaURL(doc?.url),original=mediaURL(doc?.originalImageURL),absolute=src?new URL(src,typeof location==='undefined'?'https://luatvietduc.com':location.origin).href:'';
 async function remove(){if(!doc||!editable||dirty||flight.current)return;flight.current=true;setSaving(true);setDeleteError('');try{const r=await fetch('/api/media/'+id,{method:'DELETE',signal:AbortSignal.timeout(20000)});if(!r.ok&&r.status!==404)throw new Error('Chưa xóa được tệp. Tải lại để kiểm tra.');if(mounted.current){onChanged();onClose();}}catch(e){if(mounted.current){setDeleteError(e instanceof Error&&e.name==='Error'?e.message:'Chưa xác nhận xóa xong. Kiểm tra thư viện trước khi thử lại.');setSaving(false);}}finally{flight.current=false;}}
 if(!user||!['owner','support'].includes(user.role))return null;
 return <><dialog ref={dialog} className="lvd-media-details" aria-labelledby="media-details-title" onCancel={e=>{e.preventDefault();close();}} onKeyDown={e=>{if((e.target as Element).closest('input,textarea,select,button'))return;if(e.key==='ArrowLeft')move(index-1);if(e.key==='ArrowRight')move(index+1);}}>
  <header><h2 id="media-details-title">Chi tiết tệp</h2><div><button type="button" aria-label="Tệp trước" disabled={index<=0||dirty||saving} onClick={()=>move(index-1)}>‹</button><button type="button" aria-label="Tệp sau" disabled={index<0||index>=ids.length-1||dirty||saving} onClick={()=>move(index+1)}>›</button><button type="button" aria-label="Đóng chi tiết tệp" onClick={close}>×</button></div></header>
  {!doc?<div className="lvd-media-detail-loading">{error?<p role="alert">{error} <button type="button" onClick={()=>setLoadAttempt(v=>v+1)}>Thử lại</button></p>:<p role="status">Đang tải…</p>}</div>:<div className="lvd-media-details__body"><div className="lvd-media-detail-preview">{src&&doc.mimeType?.startsWith('image/')?<img src={src} alt={doc.alt||''}/>:src&&doc.mimeType?.startsWith('video/')?<video controls src={src}/>:src&&doc.mimeType?.startsWith('audio/')?<audio controls src={src}/>:<div><strong>{doc.mimeType?.split('/')[1]?.toUpperCase()||'Tệp'}</strong><p>{mediaName(doc)}</p></div>}</div><section className="lvd-media-detail-fields">
   <dl><div><dt>Tên tệp</dt><dd>{mediaName(doc)}</dd></div><div><dt>Loại tệp</dt><dd>{doc.mimeType||'—'}</dd></div><div><dt>Dung lượng</dt><dd>{bytes(doc.filesize)}</dd></div>{doc.width&&doc.height&&<div><dt>Kích thước</dt><dd>{doc.width} × {doc.height} px</dd></div>}<div><dt>Ngày tải lên</dt><dd>{doc.createdAt?new Date(doc.createdAt).toLocaleDateString('vi-VN'):'—'}</dd></div>{typeof doc.uploadedBy==='object'&&doc.uploadedBy?.name&&<div><dt>Người tải</dt><dd>{doc.uploadedBy.name}</dd></div>}</dl>
   {draft&&<><label>Tiêu đề<input aria-label="Tiêu đề tệp" value={draft.title} maxLength={200} readOnly={!editable} onChange={e=>{setError('');setDraft({...draft,title:e.target.value});}}/></label>{doc.mimeType?.startsWith('image/')&&<label>Văn bản thay thế<input aria-label="Văn bản thay thế" value={draft.alt} maxLength={500} readOnly={!editable} onChange={e=>{setError('');setDraft({...draft,alt:e.target.value});}}/></label>}<label>Chú thích<textarea aria-label="Chú thích" value={draft.caption} maxLength={2000} readOnly={!editable} onChange={e=>{setError('');setDraft({...draft,caption:e.target.value});}}/></label><label>Mô tả<textarea aria-label="Mô tả tệp" value={draft.description} maxLength={6000} readOnly={!editable} onChange={e=>{setError('');setDraft({...draft,description:e.target.value});}}/></label><label>Phạm vi<select aria-label="Phạm vi tệp" value={draft.visibility} disabled={!editable||mediaReadOnly(doc)||user.role!=='owner'} onChange={e=>{setError('');setDraft({...draft,visibility:e.target.value});}}><option value="private">Riêng tư</option><option value="public">Công khai</option></select></label></>}
   {absolute&&<label>URL tệp<input aria-label="URL tệp" readOnly value={absolute} onFocus={e=>e.target.select()}/><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(absolute);setCopied('Đã sao chép URL');}catch{setCopied('Chọn URL để sao chép.');}}}>Sao chép URL</button><small role="status">{copied}</small></label>}
   <div className="lvd-media-detail-state" role="status">{saving?'Đang lưu…':dirty?'Chưa lưu':editable?'Đã lưu':''}</div>{error&&<p role="alert">{error} <button type="button" disabled={saving} onClick={()=>{setError('');void save();}}>Thử lại</button></p>}
   {deleteError&&<p role="alert">{deleteError} <button type="button" disabled={saving||dirty||!editable} onClick={()=>{if(confirmDelete)void remove();else setConfirmDelete(true);}}>Thử lại</button></p>}
   <div className="lvd-media-detail-actions">{(original||src)&&<AppLink href={original||src} download>{original?'Tải ảnh gốc':'Tải xuống'}</AppLink>}{canEditMediaImage(doc,user)&&<button type="button" disabled={dirty||saving} onClick={()=>{setConfirmDelete(false);setImageOpen(true);}}>Chỉnh sửa ảnh</button>}<AppLink href={'/admin/collections/media/'+id} onClick={e=>{if(dirty||saving)e.preventDefault();}}>Chỉnh sửa nâng cao</AppLink>{editable&&<button type="button" disabled={dirty||saving} onClick={()=>setConfirmDelete(!confirmDelete)}>{mediaReadOnly(doc)?'Gỡ khỏi thư viện':'Xóa vĩnh viễn'}</button>}</div>
   {confirmDelete&&<div className="lvd-media-delete-confirm"><p>{mediaReadOnly(doc)?'Gỡ tệp này khỏi Thư viện? Ảnh trên giao diện vẫn được giữ.':'Xóa vĩnh viễn tệp này?'}</p><button type="button" disabled={saving||dirty||!editable} onClick={()=>void remove()}>Xóa tệp</button><button type="button" disabled={saving} onClick={()=>setConfirmDelete(false)}>Hủy</button></div>}
  </section></div>}
 </dialog>{imageOpen&&doc&&<MediaImageEditor doc={doc} onClose={()=>{setImageOpen(false);setLoadAttempt(value=>value+1);}} onSaved={value=>{setDoc(value);setDraft(metadata(value));setSaved(metadata(value));setError('');setImageOpen(false);onChanged();}}/>}</>;
}

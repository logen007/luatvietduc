'use client';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from '@payloadcms/ui';
import type {MediaItem} from './MediaDetails';
import {mediaEditable,mediaReadOnly,mediaURL} from './media-view';
import {confirmAction} from '../shared/confirm-dialog';
import {confirmDiscardChanges,useUnsavedChanges} from '../shared/unsaved-changes';
import {mediaReceipt} from './media-client';
import {commitImageDraft,imageCrop,imageEditBody,imageGeometry,imagePreviewTransform,initialImageDraft,initialImageHistory,redoImageDraft,undoImageDraft,type ImageCrop,type ImageDraft} from './image-editor-model';

export const canEditMediaImage=(doc:MediaItem,user:Parameters<typeof mediaEditable>[1])=>Boolean(mediaEditable(doc,user)&&!mediaReadOnly(doc)&&['image/jpeg','image/png','image/webp'].includes(doc.mimeType||'')&&(!doc._isLocked||doc._userEditing?.id===user?.id));

export function MediaImageEditor({doc,onClose,onSaved}:{doc:MediaItem;onClose:()=>void;onSaved:(doc:MediaItem)=>void|Promise<void>}){
 const {user}=useAuth(),dialog=useRef<HTMLDialogElement>(null),mounted=useRef(true),flight=useRef(false),owner=String(user?.id)+':'+user?.role,ownerRef=useRef(owner);ownerRef.current=owner;
 const [history,setHistory]=useState(initialImageHistory),[source,setSource]=useState({width:doc.width||1,height:doc.height||1}),[ready,setReady]=useState(false),[loadError,setLoadError]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[selecting,setSelecting]=useState(false),[dragCrop,setDragCrop]=useState<ImageCrop|null>(null),[loadAttempt,setLoadAttempt]=useState(0);
 const drag=useRef<{left:number;top:number;x:number;y:number}|null>(null),draft=history.present,geometry=imageGeometry(source.width,source.height,draft),crop=dragCrop||geometry.crop;
 const request=imageEditBody(doc.updatedAt||'',source.width,source.height,draft),dirty=JSON.stringify(request)!==JSON.stringify(imageEditBody(doc.updatedAt||'',source.width,source.height,initialImageDraft())),allowed=canEditMediaImage(doc,user);
 const url=mediaURL(doc.url),src=url+(loadAttempt?(url.includes('?')?'&':'?')+'preview='+loadAttempt:'');
 useUnsavedChanges(allowed&&(dirty||busy));
 useEffect(()=>{mounted.current=true;dialog.current?.showModal();return()=>{mounted.current=false;};},[]);
 function change(next:ImageDraft){setError('');setHistory(value=>commitImageDraft(value,next));}
 async function close(){if(!flight.current&&await confirmDiscardChanges(dirty)&&mounted.current&&!flight.current)onClose();}
 function updateCrop(field:keyof ImageCrop,value:number){change({...draft,crop:imageCrop(source.width,source.height,{...geometry.crop,[field]:value})});}
 function point(event:React.PointerEvent<SVGSVGElement>){const matrix=event.currentTarget.getScreenCTM();if(!matrix)return null;const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());return {left:Math.max(0,Math.min(source.width-1,p.x)),top:Math.max(0,Math.min(source.height-1,p.y))};}
 function selection(event:React.PointerEvent<SVGSVGElement>){const start=drag.current,end=point(event);if(!start||!end)return null;return imageCrop(source.width,source.height,{left:Math.min(start.left,end.left),top:Math.min(start.top,end.top),width:Math.abs(end.left-start.left),height:Math.abs(end.top-start.top)});}
 async function save(operation:'edit'|'restore'){
  if(flight.current||!allowed||!doc.updatedAt||(operation==='edit'&&(!ready||!dirty))||(operation==='restore'&&!mediaURL(doc.originalImageURL)))return;
  if(operation==='restore'&&!await confirmAction({title:'Khôi phục ảnh gốc?',message:'Các chỉnh sửa hiện tại sẽ được thay bằng ảnh gốc.',confirmLabel:'Khôi phục',danger:true}))return;
  if(!mounted.current||ownerRef.current!==owner||flight.current)return;
  const account=owner;flight.current=true;setBusy(true);setError('');
  try{
   const response=await fetch('/service/media/image/'+doc.id,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(operation==='restore'?{updatedAt:doc.updatedAt,operation}:request),signal:AbortSignal.timeout(60000)}),result=await response.json();
   if(!response.ok)throw new Error(result.error||result.errors?.[0]?.message||'Chưa lưu được ảnh. Vui lòng thử lại.');
   const savedDoc=mediaReceipt(result,doc.id);
   if(mounted.current&&ownerRef.current===account){setHistory(initialImageHistory());await onSaved(savedDoc);}
  }catch(e){if(mounted.current&&ownerRef.current===account)setError(e instanceof Error&&e.name==='Error'?e.message:'Chưa xác nhận được việc lưu ảnh. Tải lại ảnh để kiểm tra.');}
  finally{flight.current=false;if(mounted.current)setBusy(false);}
 }
 if(!allowed)return null;
 return <dialog ref={dialog} className="lvd-image-editor" aria-labelledby="media-image-title" aria-busy={busy} onCancel={event=>{event.preventDefault();close();}}>
  <header><h2 id="media-image-title">Chỉnh sửa ảnh</h2><button type="button" aria-label="Đóng chỉnh sửa ảnh" disabled={busy} onClick={close}>×</button></header>
  <div className="lvd-image-editor-body"><section className="lvd-image-editor-preview" aria-label={selecting?'Chọn vùng cắt':'Xem trước ảnh'}>
   <img hidden src={src} alt="" onLoad={event=>{const image=event.currentTarget;if(image.naturalWidth&&image.naturalHeight){setSource({width:image.naturalWidth,height:image.naturalHeight});setReady(true);setLoadError(false);}}} onError={()=>{setLoadError(true);setReady(false);}}/>
   {!ready?<p role={loadError?'alert':'status'}>{loadError?'Chưa tải được ảnh.':'Đang tải ảnh…'}{loadError&&<button type="button" onClick={()=>{setLoadError(false);setLoadAttempt(value=>value+1);}}>Thử lại</button>}</p>:selecting?<svg viewBox={`0 0 ${source.width} ${source.height}`} role="img" aria-label="Kéo để chọn vùng cắt" className="is-selecting" onPointerDown={event=>{if(busy||event.button!==0)return;const start=point(event);if(!start)return;drag.current={...start,x:event.clientX,y:event.clientY};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={event=>{const rect=selection(event);if(rect)setDragCrop(rect);}} onPointerUp={event=>{const start=drag.current,rect=selection(event);drag.current=null;setDragCrop(null);if(start&&rect&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>=4)change({...draft,crop:rect});}} onPointerCancel={()=>{drag.current=null;setDragCrop(null);}}>
    <image href={src} width={source.width} height={source.height}/><path d={`M0 0H${source.width}V${source.height}H0Z M${crop.left} ${crop.top}V${crop.top+crop.height}H${crop.left+crop.width}V${crop.top}Z`} fill="#000" fillOpacity=".5" fillRule="evenodd"/><rect x={crop.left} y={crop.top} width={crop.width} height={crop.height} fill="none" stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
   </svg>:<svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} role="img" aria-label="Ảnh sau khi chỉnh sửa"><g transform={imagePreviewTransform(source.width,source.height,draft)}><svg width={geometry.crop.width} height={geometry.crop.height} viewBox={`${geometry.crop.left} ${geometry.crop.top} ${geometry.crop.width} ${geometry.crop.height}`} overflow="hidden"><image href={src} width={source.width} height={source.height}/></svg></g></svg>}
   {ready&&<p>{selecting?'Chọn trên ảnh hiện tại: '+source.width+' × '+source.height+' px':'Sau khi lưu: '+geometry.outputWidth+' × '+geometry.outputHeight+' px'}</p>}
  </section><section className="lvd-image-editor-controls"><fieldset disabled={busy||!ready}>
   <div className="lvd-image-editor-actions"><button type="button" disabled={!history.past.length} onClick={()=>{setHistory(undoImageDraft);setError('');}}>Hoàn tác</button><button type="button" disabled={!history.future.length} onClick={()=>{setHistory(redoImageDraft);setError('');}}>Làm lại</button></div>
   <div className="lvd-image-editor-actions"><button type="button" onClick={()=>change({...draft,rotate:((draft.rotate+270)%360) as ImageDraft['rotate']})}>Xoay trái</button><button type="button" onClick={()=>change({...draft,rotate:((draft.rotate+90)%360) as ImageDraft['rotate']})}>Xoay phải</button><button type="button" aria-pressed={draft.flipHorizontal} onClick={()=>change({...draft,flipHorizontal:!draft.flipHorizontal})}>Lật ngang</button><button type="button" aria-pressed={draft.flipVertical} onClick={()=>change({...draft,flipVertical:!draft.flipVertical})}>Lật dọc</button></div>
   <h3>Cắt ảnh</h3><div className="lvd-image-editor-actions"><button type="button" aria-pressed={selecting} onClick={()=>setSelecting(!selecting)}>{selecting?'Xem kết quả':'Chọn vùng cắt'}</button>{draft.crop&&<button type="button" onClick={()=>{change({...draft,crop:undefined});setSelecting(false);}}>Bỏ vùng cắt</button>}</div>
   <div className="lvd-image-editor-numbers">{([['left','X',0,source.width-1],['top','Y',0,source.height-1],['width','Chiều rộng',1,source.width-geometry.crop.left],['height','Chiều cao',1,source.height-geometry.crop.top]] as const).map(([field,label,min,max])=><label key={field}>{label}<input type="number" aria-label={'Vùng cắt: '+label} min={min} max={max} step="1" value={geometry.crop[field]} onChange={event=>updateCrop(field,Number(event.target.value))}/></label>)}</div>
   <h3>Thu nhỏ ảnh</h3><div className="lvd-image-editor-numbers"><label>Chiều rộng<input type="number" aria-label="Chiều rộng ảnh sau khi lưu" min="1" max={geometry.width} step="1" value={geometry.outputWidth} onChange={event=>change({...draft,scale:Math.max(1,Math.min(geometry.width,Number(event.target.value)||1))/geometry.width})}/></label><label>Chiều cao<input type="number" aria-label="Chiều cao ảnh sau khi lưu" min="1" max={geometry.height} step="1" value={geometry.outputHeight} onChange={event=>change({...draft,scale:Math.max(1,Math.min(geometry.height,Number(event.target.value)||1))/geometry.height})}/></label></div><p className="lvd-image-editor-hint">Giữ tỉ lệ ảnh; chỉ thu nhỏ.</p>
  </fieldset>{error&&<p role="alert">{error}</p>}{busy&&<p role="status">Đang lưu ảnh…</p>}
  {mediaURL(doc.originalImageURL)&&<button type="button" disabled={busy||!doc.updatedAt} onClick={()=>void save('restore')}>Khôi phục ảnh gốc</button>}
  </section></div><footer><button type="button" disabled={busy} onClick={close}>Hủy</button><button type="button" disabled={busy||!ready||!dirty||!doc.updatedAt} onClick={()=>void save('edit')}>Lưu ảnh</button></footer>
 </dialog>;
}

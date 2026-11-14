'use client';
import {useEffect,useRef,useState} from 'react';
import {useUnsavedChanges} from '../shared/unsaved-changes';
import {uploadMediaFile} from './media-client';
import type {MediaItem} from './MediaDetails';
import {mediaUploadLimit,isBannerVideo} from './upload-limits';
type Row={name:string;progress:number;error?:string;done?:boolean};
const accept='.jpg,.jpeg,.png,.webp,.svg,.pdf,.mp4,.webm,.mp3,.wav,.ogg';
export function MediaUploader({onDone,onBusyChange,onUploaded,publicOption=false}:{onDone:(result?:{hasErrors:boolean})=>void;onBusyChange:(busy:boolean)=>void;onUploaded?:(doc:MediaItem)=>void;publicOption?:boolean}){
 const input=useRef<HTMLInputElement>(null),request=useRef<AbortController|null>(null),active=useRef(false),mounted=useRef(true);
 const [rows,setRows]=useState<Row[]>([]),[busy,setBusy]=useState(false),[drag,setDrag]=useState(false),[isPublic,setPublic]=useState(publicOption);
 useUnsavedChanges(busy);
 useEffect(()=>{mounted.current=true;onBusyChange(false);return()=>{mounted.current=false;request.current?.abort();};},[]);
 async function upload(files:File[]){
  if(active.current||!files.length)return;active.current=true;setBusy(true);onBusyChange(true);setRows(files.map(file=>({name:file.name,progress:0})));
  let uploaded=false,hasErrors=false;
  const update=(index:number,patch:Partial<Row>)=>{if(mounted.current)setRows(previous=>previous.map((row,i)=>i===index?{...row,...patch}:row));};
  try{for(const [index,file] of files.entries()){
   if(!mounted.current)break;
   if(file.size>mediaUploadLimit(file.type)){hasErrors=true;update(index,{error:isBannerVideo(file.type)?'Video vượt quá 50 MB.':'Tệp vượt quá 10 MB.'});continue;}
   if(!/\.(?:jpe?g|png|webp|svg|pdf|mp4|webm|mp3|wav|ogg)$/i.test(file.name)){hasErrors=true;update(index,{error:'Định dạng chưa được hỗ trợ.'});continue;}
   try{
    const controller=new AbortController();request.current=controller;
    const doc=await uploadMediaFile(file,controller.signal,progress=>update(index,{progress}),undefined,isPublic?'public':'private');onUploaded?.(doc);uploaded=true;update(index,{done:true,progress:100});
   }catch(e){hasErrors=true;update(index,{error:e instanceof Error?e.message:'Chưa tải được tệp.'});}
  }}finally{active.current=false;request.current=null;if(mounted.current){setBusy(false);onBusyChange(false);if(uploaded)onDone({hasErrors});}}
 }
 return <section className={'lvd-media-upload'+(drag?' is-dragging':'')} aria-label="Tải tệp" aria-busy={busy} onDragOver={e=>{e.preventDefault();if(!busy)setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);void upload(Array.from(e.dataTransfer.files));}}>
  <input ref={input} type="file" multiple hidden accept={accept} onChange={e=>{void upload(Array.from(e.target.files||[]));e.target.value='';}}/>
  <p>Kéo thả tệp vào đây</p><button type="button" disabled={busy} onClick={()=>input.current?.click()}>Chọn tệp</button><small>Video tối đa 50 MB; tệp khác 10 MB</small>{publicOption&&<label className="lvd-media-upload-visibility"><input type="checkbox" checked={isPublic} disabled={busy} onChange={e=>setPublic(e.target.checked)}/> Công khai tệp để dùng trên website</label>}
  {!!rows.length&&<ul>{rows.map((row,index)=><li key={index}><span>{row.name}</span>{row.error?<span role="alert">{row.error}</span>:<><progress max={100} value={row.progress} aria-label={'Tải '+row.name}/><small>{row.done?'Đã tải':row.progress>=99?'Đang lưu…':row.progress+'%'}</small></>}</li>)}</ul>}
 </section>;
}

'use client';
import {useEffect,useRef,useState} from 'react';
import {useUnsavedChanges} from '../shared/unsaved-changes';
type Row={name:string;progress:number;error?:string;done?:boolean};
const accept='.jpg,.jpeg,.png,.webp,.svg,.pdf,.mp4,.webm,.mp3,.wav,.ogg';
export function MediaUploader({onDone}:{onDone:()=>void}){
 const input=useRef<HTMLInputElement>(null),request=useRef<XMLHttpRequest|null>(null),active=useRef(false),mounted=useRef(true);
 const [rows,setRows]=useState<Row[]>([]),[busy,setBusy]=useState(false),[drag,setDrag]=useState(false);
 useUnsavedChanges(busy);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;request.current?.abort();};},[]);
 async function upload(files:File[]){
  if(active.current||!files.length)return;active.current=true;setBusy(true);setRows(files.map(file=>({name:file.name,progress:0})));
  let uploaded=false;
  const update=(index:number,patch:Partial<Row>)=>{if(mounted.current)setRows(previous=>previous.map((row,i)=>i===index?{...row,...patch}:row));};
  try{for(const [index,file] of files.entries()){
   if(!mounted.current)break;
   if(file.size>10*1024*1024){update(index,{error:'Tệp vượt quá 10 MB.'});continue;}
   if(!/\.(?:jpe?g|png|webp|svg|pdf|mp4|webm|mp3|wav|ogg)$/i.test(file.name)){update(index,{error:'Định dạng chưa được hỗ trợ.'});continue;}
   try{
    await new Promise<void>((resolve,reject)=>{
     const xhr=new XMLHttpRequest();request.current=xhr;xhr.open('POST','/api/media');xhr.timeout=90000;xhr.responseType='json';
     xhr.upload.onprogress=e=>{if(e.lengthComputable)update(index,{progress:Math.min(99,Math.round(e.loaded/e.total*100))});};
     xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300){resolve();return;}reject(new Error(xhr.response?.errors?.[0]?.message||'Chưa tải được tệp.'));};
     xhr.onerror=xhr.ontimeout=()=>reject(new Error('Chưa xác nhận tải xong. Kiểm tra thư viện trước khi thử lại.'));xhr.onabort=()=>reject(new Error('Đã dừng tải tệp.'));
     const form=new FormData();form.append('file',file);form.append('_payload',JSON.stringify({title:file.name.replace(/\.[^.]+$/,''),alt:''}));xhr.send(form);
    });uploaded=true;update(index,{done:true,progress:100});
   }catch(e){update(index,{error:e instanceof Error?e.message:'Chưa tải được tệp.'});}
  }}finally{active.current=false;request.current=null;if(mounted.current){setBusy(false);if(uploaded)onDone();}}
 }
 return <section className={'lvd-media-upload'+(drag?' is-dragging':'')} aria-label="Tải tệp" aria-busy={busy} onDragOver={e=>{e.preventDefault();if(!busy)setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);void upload(Array.from(e.dataTransfer.files));}}>
  <input ref={input} type="file" multiple hidden accept={accept} onChange={e=>{void upload(Array.from(e.target.files||[]));e.target.value='';}}/>
  <p>Kéo thả tệp vào đây</p><button type="button" disabled={busy} onClick={()=>input.current?.click()}>Chọn tệp</button><small>Tối đa 10 MB mỗi tệp</small>
  {!!rows.length&&<ul>{rows.map((row,index)=><li key={index}><span>{row.name}</span>{row.error?<span role="alert">{row.error}</span>:<><progress max={100} value={row.progress} aria-label={'Tải '+row.name}/><small>{row.done?'Đã tải':row.progress>=99?'Đang lưu…':row.progress+'%'}</small></>}</li>)}</ul>}
 </section>;
}

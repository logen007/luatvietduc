'use client';
import {useEffect,useRef,useState} from 'react';
import {useAuth,useDocumentInfo,useForm,useFormModified,useFormProcessing} from '@payloadcms/ui';
import {MediaImageEditor,canEditMediaImage} from './MediaImageEditor';
import type {MediaItem} from './MediaDetails';
import {mediaReceipt} from './media-client';

export function MediaImageTools(){
 const {id,data,setData,setLastUpdateTime,documentIsLocked}=useDocumentInfo(),form=useForm(),modified=useFormModified(),processing=useFormProcessing(),{user}=useAuth();
 const [doc,setDoc]=useState<MediaItem|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),gate=useRef(false);
 const account=String(user?.id)+':'+user?.role+':'+id,current=useRef(account),mounted=useRef(true),formState=useRef({modified,processing,documentIsLocked});current.current=account;formState.current={modified,processing,documentIsLocked};
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{setDoc(null);setError('');},[account]);
 const allowed=Boolean(id&&data&&canEditMediaImage(data as MediaItem,user));
 async function open(){
  if(gate.current||modified||processing||documentIsLocked)return;const owner=account;gate.current=true;setLoading(true);setError('');
  try{const response=await fetch('/api/media/'+id+'?depth=1',{cache:'no-store',signal:AbortSignal.timeout(15000)}),value=await response.json();if(!response.ok)throw new Error(value.errors?.[0]?.message||'Chưa tải được ảnh.');const doc=mediaReceipt(value,Number(id));if(mounted.current&&current.current===owner){if(formState.current.modified||formState.current.processing||formState.current.documentIsLocked)throw new Error('Lưu thông tin tệp trước khi chỉnh sửa ảnh.');setDoc(doc);}}
  catch(e){if(mounted.current&&current.current===owner)setError(e instanceof Error?e.message:'Chưa tải được ảnh.');}
  finally{gate.current=false;if(mounted.current)setLoading(false);}
 }
 if(!allowed)return null;
 return <div className="lvd-media-image-tools"><button type="button" disabled={modified||processing||documentIsLocked||loading} onClick={()=>void open()}>{loading?'Đang mở ảnh…':'Chỉnh sửa ảnh'}</button>{modified&&<small>Lưu thông tin tệp trước khi chỉnh sửa ảnh.</small>}{error&&<p role="alert">{error}</p>}{doc&&<MediaImageEditor doc={doc} onClose={()=>setDoc(null)} onSaved={async value=>{setData(value);setLastUpdateTime(Date.parse(value.updatedAt||'')||Date.now());await form.reset(value);form.setModified(false);setDoc(null);}}/>}</div>;
}

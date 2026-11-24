'use client';
import React,{useEffect,useRef,useState} from 'react';
import {useField,useFormFields} from '@payloadcms/ui';
import type {TextFieldClientProps} from 'payload';
import {permalink} from '../taxonomy/slug';
export function PermalinkField({path,readOnly}:TextFieldClientProps){
 const {value,setValue,errorMessage,showError}=useField<string>({path});
 const title=useFormFields(([fields])=>fields.title?.value as string||'');
 const automatic=useRef<boolean|null>(null),[editing,setEditing]=useState(false),[draft,setDraft]=useState('');
 useEffect(()=>{if(automatic.current===null)automatic.current=!value||(!title&&/^bai-viet-(?:vi|de)-\d+$/.test(value));if(automatic.current&&!readOnly){const next=permalink(title);if(next!==value)setValue(next);}},[title,value,setValue,readOnly]);
 const apply=()=>{const next=permalink(draft);automatic.current=!next;setValue(next||permalink(title));setEditing(false);};
 return <div className="field-type text lvd-post-permalink">
  <div className="lvd-post-permalink__row"><span className="lvd-post-permalink__url" aria-label="Đường dẫn bài viết">https://luatvietduc.com/bai-viet/<strong>{value||'…'}</strong></span>{!readOnly&&!editing&&<button type="button" onClick={()=>{setDraft(value||'');setEditing(true);}}>Sửa</button>}</div>
  {editing&&<div className="lvd-post-permalink__editor"><input id="post-permalink" aria-label="Permalink" placeholder="Đường dẫn bài viết" value={draft} autoFocus onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();apply();}if(e.key==='Escape'){e.preventDefault();setEditing(false);}}}/><button type="button" onClick={apply}>Xong</button><button type="button" onClick={()=>setEditing(false)}>Hủy</button><button type="button" onClick={()=>{automatic.current=true;setValue(permalink(title));setEditing(false);}}>Từ tiêu đề</button></div>}
  {showError&&<div role="alert">{errorMessage}</div>}
 </div>;
}

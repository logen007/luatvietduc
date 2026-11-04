'use client';
import React,{useEffect,useRef} from 'react';
import {useField,useFormFields} from '@payloadcms/ui';
import type {TextFieldClientProps} from 'payload';
import {permalink} from '../taxonomy/slug';
export function PermalinkField({path,readOnly}:TextFieldClientProps){
 const {value,setValue,errorMessage,showError}=useField<string>({path});
 const title=useFormFields(([fields])=>fields.title?.value as string||'');
 const automatic=useRef<boolean|null>(null);
 useEffect(()=>{if(automatic.current===null)automatic.current=!value;if(automatic.current&&!readOnly){const next=permalink(title);if(next!==value){setValue(next);}}},[title,value,setValue,readOnly]);
 return <div className="field-type text"><label className="field-label" htmlFor="post-permalink">Permalink</label><div className="field-type__wrap"><input id="post-permalink" value={value||''} readOnly={readOnly} onChange={e=>{automatic.current=false;setValue(e.target.value);}} onBlur={()=>setValue(permalink(value||''))}/></div><small>https://luatvietduc.com/bai-viet/{value||'…'}</small>{!readOnly&&<button type="button" className="lvd-permalink-reset" onClick={()=>{automatic.current=true;setValue(permalink(title));}}>Tạo lại từ tiêu đề</button>}{showError&&<div role="alert">{errorMessage}</div>}</div>;
}

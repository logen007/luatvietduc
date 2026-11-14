'use client';
import {useCallback,useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useDocumentInfo,useField,useFormProcessing} from '@payloadcms/ui';
import type {TextFieldClientProps,Validate} from 'payload';
import {InlineDocumentTitle} from './InlineDocumentTitle';

export function DocumentTitleField({path,field,readOnly,validate,inputRef}:TextFieldClientProps){
 const root=useRef<HTMLDivElement>(null),[host,setHost]=useState<Element|null>(null),uid=useId();
 const {data,documentIsLocked}=useDocumentInfo(),processing=useFormProcessing();
 const fieldValidate=useCallback<Validate>((value,options)=>{
  if(field.required&&(typeof value!=='string'||!value.trim()))return 'Nhập tiêu đề.';
  if(typeof value==='string'&&field.maxLength&&value.length>field.maxLength)return 'Tiêu đề tối đa '+field.maxLength+' ký tự.';
  return validate?validate(value,{...options,name:field.name,type:'text',hasMany:false,required:field.required,maxLength:field.maxLength,minLength:field.minLength}):true;
 },[validate,field.name,field.required,field.maxLength,field.minLength]);
 const {value='',setValue,disabled,errorMessage,showError}=useField<string>({path,validate:fieldValidate});
 useEffect(()=>{const editor=root.current?.closest('.collection-edit');setHost(editor?.querySelector('.doc-controls__wrapper')||null);editor?.querySelector('.doc-controls__popup .popup-button')?.setAttribute('aria-label','Thao tác khác');},[]);
 const title=<InlineDocumentTitle id={'lvd-document-title-'+uid} label="Tiêu đề kiến thức" value={typeof value==='string'?value:''} onChange={setValue} required={Boolean(field.required)} maxLength={field.maxLength} readOnly={Boolean(readOnly||data?.articleOrigin)} disabled={Boolean(disabled||processing||documentIsLocked)} error={showError?errorMessage:undefined} inputRef={inputRef}/>;
 return <div ref={root} className="lvd-document-title-field">{host?createPortal(title,host):title}</div>;
}

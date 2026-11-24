'use client';
import type {Ref} from 'react';

type Props={id:string;label:string;value:string;onChange:(value:string)=>void;disabled?:boolean;readOnly?:boolean;required?:boolean;maxLength?:number;error?:string;className?:string;inputRef?:Ref<HTMLInputElement>};
// Both content editors use the same input, accessibility and validation display.
export function InlineDocumentTitle({id,label,value,onChange,disabled,readOnly,required=true,maxLength=240,error,className='',inputRef}:Props){
 return <div className={'lvd-inline-document-title '+className}>
  <label className="sr-only" htmlFor={id}>{label}</label>
  <input ref={inputRef} id={id} aria-label={label} placeholder="Thêm tiêu đề" maxLength={maxLength} required={required} aria-required={required} aria-invalid={Boolean(error)} aria-describedby={error?id+'-error':undefined} value={value} onChange={event=>{if(!readOnly&&!disabled)onChange(event.target.value);}} disabled={disabled} readOnly={readOnly} autoComplete="off"/>
  {error&&<div id={id+'-error'} className="lvd-inline-title-error" role="alert">{error}</div>}
 </div>;
}

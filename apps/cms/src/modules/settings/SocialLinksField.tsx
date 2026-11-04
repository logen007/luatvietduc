'use client';
import {useId,useState} from 'react';
import {useField,useForm,useFormFields,useFormSubmitted} from '@payloadcms/ui';
import type {ArrayFieldClientProps} from 'payload';
import icons from '../../../public/social-icons.json';
import {socialIcon} from '../shared/social';
export function SocialLinksField({path,readOnly,schemaPath}:ArrayFieldClientProps){
 const {showError,errorMessage}=useField({path,hasRows:true}),fields=useFormFields(([state])=>state),{addFieldRow,removeFieldRow,dispatchFields,setModified,disabled}=useForm(),submitted=useFormSubmitted(),id=useId(),[touched,setTouched]=useState<string[]>([]);
 const count=fields[path]?.rows?.length||0;
 const rows=Array.from({length:count},(_,index)=>({index,label:String(fields[`${path}.${index}.label`]?.value||''),url:String(fields[`${path}.${index}.url`]?.value||'')}));
 const used=new Set<number>();
 const primary=icons.map(icon=>{const row=rows.find(row=>socialIcon(row)?.name===icon.name);if(row)used.add(row.index);return {name:icon.name,icon,row};});
 const slots=[...primary,...rows.filter(row=>!used.has(row.index)).map(row=>({name:row.label||'Liên kết khác',icon:undefined,row}))];
 function edit(name:string,index:number|undefined,value:string){
  if(index!==undefined&&!value.trim()){removeFieldRow({path,rowIndex:index});return;}
  let valid=true;try{const url=new URL(value);valid=url.protocol==='https:'&&!url.username&&!url.password;}catch{valid=false;}
  const state={value,valid,errorMessage:valid?undefined:'Nhập đường dẫn HTTPS đầy đủ, hoặc để trống để ẩn.'};
  if(index===undefined){if(!value.trim())return;addFieldRow({path,schemaPath:schemaPath||path,subFieldState:{label:{value:name,valid:true},url:state}});}
  else{dispatchFields({type:'UPDATE',path:`${path}.${index}.url`,...state});setModified(true);}
 }
 return <section className="lvd-social-settings"><h3>Mạng xã hội</h3><p>Điền đường dẫn để hiển thị icon ở chân trang. Để trống để ẩn. Bấm Lưu để áp dụng.</p><div className="lvd-social-settings-list">{slots.map((slot,index)=>{const error=slot.row?fields[`${path}.${slot.row.index}.url`]:undefined,inputId=id+'-'+index;return <div className="lvd-social-settings-row" key={slot.icon?.name||'custom-'+slot.row?.index}><label htmlFor={inputId}>{slot.icon?<svg viewBox="0 0 24 24" aria-hidden="true">{slot.icon.paths.map((d,i)=><path d={d} key={i} fillRule="evenodd"/>)}</svg>:<span aria-hidden="true">↗</span>}<span>{slot.name}</span></label><div><input id={inputId} type="url" inputMode="url" autoComplete="off" placeholder="https://…" value={slot.row?.url||''} disabled={readOnly||disabled} onChange={event=>edit(slot.name,slot.row?.index,event.target.value)} onBlur={()=>setTouched(old=>old.includes(slot.name)?old:[...old,slot.name])} aria-invalid={Boolean(error?.valid===false&&(submitted||touched.includes(slot.name)))} aria-describedby={error?.valid===false?inputId+'-error':undefined}/>{error?.valid===false&&(submitted||touched.includes(slot.name))&&<small id={inputId+'-error'} role="alert">{error.errorMessage}</small>}</div><span className={'lvd-social-settings-state'+(slot.row?.url&&error?.valid!==false?' is-on':'')}>{slot.row?.url&&error?.valid!==false?'Hiển thị':'Ẩn'}</span></div>;})}</div>{showError&&<p role="alert">{errorMessage}</p>}</section>;
}

'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {useLocale} from '../shared/locale';
import {consentKey,measurableURL,measurementMode,savedConsent,type MeasurementConfig} from './policy';
import {installMeasurement,measurePage} from './browser';
export function Measurement({config}:{config:MeasurementConfig}){
 const pathname=usePathname(),{language}=useLocale(),[allowed,setAllowed]=useState<boolean|null>(null),[ready,setReady]=useState(false),[open,setOpen]=useState(false),[eligible,setEligible]=useState(false),[failed,setFailed]=useState(false),last=useRef('');
 const de=language==='de',mode=measurementMode(config);
 useEffect(()=>{setEligible(measurableURL(new URL(location.href)));setAllowed(savedConsent(localStorageValue()));setReady(true);},[pathname]);
 useEffect(()=>{
  if(!ready||!eligible||!allowed||!mode)return;
  last.current='';return installMeasurement(config,()=>setFailed(true));
 },[ready,eligible,allowed,mode,config.gtmId,config.gaId]);
 useEffect(()=>{if(ready&&eligible&&allowed&&mode&&last.current!==pathname){measurePage(config);last.current=pathname;}},[pathname,ready,eligible,allowed,mode,config.gtmId,config.gaId]);
 function choose(value:boolean){
  try{localStorage.setItem(consentKey,JSON.stringify({allowed:value,until:Date.now()+180*86400000}));}catch{}
  // Reload after withdrawal: removing a script cannot revoke its running code.
  if(allowed&&!value){location.reload();return;}
  setAllowed(value);setOpen(false);
 }
 if(!mode||!ready||!eligible)return null;
 return <aside className="lvd-statistics" aria-label={de?'Statistik-Einstellungen':'Cài đặt thống kê'}>
  {(allowed===null||open)?<div className="lvd-statistics-prompt"><p>{de?'Dürfen wir Google-Statistik verwenden, um die Website zu verbessern?':'Cho phép dùng thống kê Google để cải thiện website?'} <a href="/quyen-rieng-tu">{de?'Datenschutz':'Quyền riêng tư'}</a></p><div><button type="button" onClick={()=>choose(false)}>{de?'Ablehnen':'Từ chối'}</button><button type="button" onClick={()=>choose(true)}>{de?'Zustimmen':'Đồng ý'}</button></div></div>:<button type="button" className="lvd-statistics-settings" onClick={()=>setOpen(true)}>{de?'Statistik':'Thống kê'}</button>}
  {open&&failed&&<p role="status">{de?'Statistik konnte nicht geladen werden.':'Chưa tải được thẻ thống kê.'}</p>}
 </aside>;
}
function localStorageValue(){try{return localStorage.getItem(consentKey);}catch{return null;}}

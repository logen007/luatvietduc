"use client";
import {useEffect,useState} from 'react';
import {useLocale} from './locale';
import {visiblePoll} from './polling';
export function ReleaseNotice(){
 const {t}=useLocale(),[updating,setUpdating]=useState(false);
 useEffect(()=>{
  let active=true,pending=false;const controller=new AbortController();
  const stop=visiblePoll(async()=>{
   try{
    const response=await fetch('/release-status',{cache:'no-store',credentials:'omit',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(8000)])});
    const value=response.ok?await response.json():null;
    if(active){pending=value?.status==='updating';setUpdating(pending);}
   }catch{if(active){pending=false;setUpdating(false);}}
  },()=>pending?10_000:60_000);
  return()=>{active=false;controller.abort();stop();};
 },[]);
 return updating?<div className="lvd-release-notice" role="status" aria-live="polite"><span className="lvd-release-spinner" aria-hidden="true"/><span>{t('Đang cập nhật phiên bản mới…')}</span></div>:null;
}

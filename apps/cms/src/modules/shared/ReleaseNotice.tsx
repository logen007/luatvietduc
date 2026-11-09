"use client";
import {useEffect,useState} from 'react';
import {useLocale} from './locale';
import {visiblePoll} from './polling';
export function ReleaseNotice(){
 const {t}=useLocale(),[updating,setUpdating]=useState(false);
 useEffect(()=>{
  let active=true,pending=false,lastVersion='';
  let hideTimer:ReturnType<typeof setTimeout>|undefined;
  const controller=new AbortController();
  const stop=visiblePoll(async()=>{
   try{
    const response=await fetch('/release-status',{cache:'no-store',credentials:'omit',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(8000)])});
    const value=response.ok?await response.json():null;
    if(active){
     pending=value?.status==='updating';
     if(!pending){clearTimeout(hideTimer);setUpdating(false);}
     else{
      const version=typeof value.version==='string'?value.version:'pending';
      if(version!==lastVersion){
       lastVersion=version;clearTimeout(hideTimer);setUpdating(true);
       // A queued/prepared release is not evidence of continuous deployment.
       // Keep this a brief notice; polling cannot restart it for the same version.
       hideTimer=setTimeout(()=>{if(active)setUpdating(false);},60_000);
      }
     }
    }
   }catch{if(active){pending=false;clearTimeout(hideTimer);setUpdating(false);}}
  },()=>pending?10_000:60_000);
  return()=>{active=false;clearTimeout(hideTimer);controller.abort();stop();};
 },[]);
 return updating?<div className="lvd-release-notice" role="status" aria-live="polite"><span className="lvd-release-spinner" aria-hidden="true"/><span>{t('Đang cập nhật phiên bản mới…')}</span></div>:null;
}

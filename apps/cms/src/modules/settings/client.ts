"use client";
import {useEffect,useSyncExternalStore} from 'react';
import type {PublicSettings} from './view';
import {createPublicSettingsStore} from './client-store';
const store=createPublicSettingsStore<PublicSettings>(async()=>{
  let response:Response;
  try{response=await fetch('/service/settings',{cache:'no-store',signal:AbortSignal.timeout(15000)});}
  catch{throw new Error('Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.');}
   const result=await response.json().catch(()=>null);
   if(!response.ok||!result)throw new Error(result?.error||'Chưa tải được cài đặt website.');
   return result as PublicSettings;
});
const initial=store.getSnapshot();
export const loadPublicSettings=(force=false)=>store.load(force);
const refresh=()=>{void loadPublicSettings(true).catch(()=>{});};
const visible=()=>{if(!document.hidden)refresh();};
let subscribers=0;
function subscribe(listener:()=>void){
 const off=store.subscribe(listener);
 if(subscribers++===0){window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',visible);}
 return()=>{off();if(--subscribers===0){window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);document.removeEventListener('visibilitychange',visible);}};
}
export function usePublicSettings(){
 const state=useSyncExternalStore(subscribe,store.getSnapshot,()=>initial);
 useEffect(()=>{void loadPublicSettings().catch(()=>{});},[]);
 return state.data;
}

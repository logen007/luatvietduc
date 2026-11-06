"use client";
import {createContext,createElement,useContext,useEffect,useState,useSyncExternalStore,type ReactNode} from 'react';
import type {PublicSettings} from './view';
import {createPublicSettingsStore} from './client-store';
import {readPublicSettings} from './public-contract';
const request=async()=>{
  let response:Response;
  try{response=await fetch('/service/settings',{cache:'no-store',signal:AbortSignal.timeout(15000)});}
  catch{throw new Error('Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.');}
   const result=await response.json().catch(()=>null);
   if(!response.ok||!result)throw new Error(result?.error||'Chưa tải được cài đặt website.');
   return readPublicSettings(result);
};
let store=createPublicSettingsStore<PublicSettings>(request);
const SettingsContext=createContext(store);
let browserSeeded=false;
export function PublicSettingsProvider({settings,children}:{settings:PublicSettings;children:ReactNode}){
 const [scoped]=useState(()=>{
  const seeded=createPublicSettingsStore<PublicSettings>(request,Date.now,settings);
  if(typeof window!=='undefined'&&!browserSeeded){store=seeded;browserSeeded=true;}
  return typeof window==='undefined'?seeded:store;
 });
 return createElement(SettingsContext.Provider,{value:scoped},children);
}
export const loadPublicSettings=(force=false)=>store.load(force);
export function usePublicSettings(){
 const scoped=useContext(SettingsContext);
 const state=useSyncExternalStore(scoped.subscribe,scoped.getSnapshot,scoped.getServerSnapshot);
 useEffect(()=>{
  const refresh=()=>{void scoped.load(true).catch(()=>{});},visible=()=>{if(!document.hidden)refresh();};
  void scoped.load().catch(()=>{});
  window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',visible);
  return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);document.removeEventListener('visibilitychange',visible);};
 },[scoped]);
 return state.data;
}

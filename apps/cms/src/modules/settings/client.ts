"use client";
import {useEffect,useState} from 'react';
import type {PublicSettings} from './view';
let pending:Promise<PublicSettings>|null=null,expires=0;
// Share simultaneous shell/chat requests in this tab. Never cache account or conversation data.
export function loadPublicSettings():Promise<PublicSettings>{
 if(!pending||Date.now()>=expires){
  expires=Date.now()+30000;
  pending=fetch('/service/settings',{cache:'no-store'}).then(async response=>{
   const result=await response.json();
   if(!response.ok)throw new Error(result?.error||'Chưa tải được cài đặt website.');
   return result as PublicSettings;
  }).catch(error=>{pending=null;expires=0;throw error;});
 }
 return pending;
}
export function usePublicSettings(){
 const [settings,setSettings]=useState<PublicSettings|null>(null);
 useEffect(()=>{let active=true;void loadPublicSettings().then(value=>{if(active)setSettings(value);}).catch(()=>{});return()=>{active=false;};},[]);
 return settings;
}

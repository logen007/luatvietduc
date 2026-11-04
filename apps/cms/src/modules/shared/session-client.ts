'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {createSessionStore} from './account-state.mjs';
const store=createSessionStore(async()=>{
 const response=await fetch('/service/me',{cache:'no-store',credentials:'same-origin'});
 if(!response.ok)throw new Error('Không thể kiểm tra phiên đăng nhập.');
 return response.json();
});
const initial=store.getSnapshot();
const refresh=()=>{void store.refresh(true).catch(()=>{});};
export const loadPublicSession=()=>store.refresh();
export function invalidatePublicSession(){
 store.invalidate();
 try{localStorage.setItem('lvd-session-revision',String(Date.now()));}catch{}
 document.dispatchEvent(new Event('lvd:sessionchange'));
}
function onStorage(event:StorageEvent){if(event.key==='lvd-session-revision')refresh();}
function onVisibility(){if(!document.hidden)refresh();}
let subscribers=0;
function subscribe(listener:()=>void){
 const off=store.subscribe(listener);
 if(subscribers++===0){window.addEventListener('pageshow',refresh);window.addEventListener('focus',refresh);window.addEventListener('storage',onStorage);document.addEventListener('visibilitychange',onVisibility);document.addEventListener('lvd:sessionchange',refresh);}
 return()=>{off();if(--subscribers===0){window.removeEventListener('pageshow',refresh);window.removeEventListener('focus',refresh);window.removeEventListener('storage',onStorage);document.removeEventListener('visibilitychange',onVisibility);document.removeEventListener('lvd:sessionchange',refresh);}};
}
export function usePublicSession(){
 const snapshot=useSyncExternalStore(subscribe,store.getSnapshot,()=>initial);
 useEffect(()=>{void loadPublicSession().catch(()=>{});},[]);
 return snapshot;
}

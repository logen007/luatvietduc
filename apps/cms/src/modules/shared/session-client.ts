'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {createSessionStore} from './account-state.mjs';
import type {PublicSession} from '../identity/contracts';
const store=createSessionStore<PublicSession>(async()=>{
 const response=await fetch('/service/me',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('Không thể kiểm tra phiên đăng nhập.');
 return response.json();
});
const initial=store.getSnapshot();
const refresh=()=>{void store.refresh(true).catch(()=>{});};
export const loadPublicSession=()=>store.refresh();
// Guards client state updates only. Server authorization remains authoritative.
export const isPublicSessionCurrent=(revision:number)=>store.isCurrent(revision);
function clearPrivateDrafts(){
 try{for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key?.startsWith('lvd-staff-draft:')||key==='lvd-chat-handoff-v1')sessionStorage.removeItem(key);}}catch{}
}
export function invalidatePublicSession(){
 clearPrivateDrafts();
 store.invalidate();
 try{localStorage.setItem('lvd-session-revision',String(Date.now()));}catch{}
 document.dispatchEvent(new Event('lvd:sessionchange'));
}
function onStorage(event:StorageEvent){if(event.key==='lvd-session-revision'){clearPrivateDrafts();store.invalidate();refresh();}}
function onVisibility(){if(!document.hidden)refresh();}
function onPageShow(event:PageTransitionEvent){if(event.persisted)store.invalidate();refresh();}
let subscribers=0;
function subscribe(listener:()=>void){
 const off=store.subscribe(listener);
 if(subscribers++===0){window.addEventListener('pageshow',onPageShow);window.addEventListener('focus',refresh);window.addEventListener('storage',onStorage);document.addEventListener('visibilitychange',onVisibility);document.addEventListener('lvd:sessionchange',refresh);}
 return()=>{off();if(--subscribers===0){window.removeEventListener('pageshow',onPageShow);window.removeEventListener('focus',refresh);window.removeEventListener('storage',onStorage);document.removeEventListener('visibilitychange',onVisibility);document.removeEventListener('lvd:sessionchange',refresh);}};
}
export function usePublicSession(){
 const snapshot=useSyncExternalStore(subscribe,store.getSnapshot,()=>initial);
 useEffect(()=>{void loadPublicSession().catch(()=>{});},[]);
 return snapshot;
}

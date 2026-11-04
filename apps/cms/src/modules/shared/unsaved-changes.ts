'use client';
import {useEffect,useRef} from 'react';

const changed=new Set<symbol>();
const message='Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi?';
type NavigationEvent=Event&{destination:{url:string;sameDocument:boolean};hashChange?:boolean};
type NavigationTarget=EventTarget;
const navigation=()=> (window as Window&{navigation?:NavigationTarget}).navigation;
let acceptedDestination='';
export function confirmDiscardChanges(dirty=changed.size>0){return !dirty||window.confirm(message);}
// Native anchors/reload/closing use the browser prompt. The Navigation API also
// protects same-document history changes; older browsers use Link.onNavigate.
export function confirmAdminNavigation(href:string){
 if(!changed.size)return true;
 if(!confirmDiscardChanges())return false;
 acceptedDestination=new URL(href,window.location.href).href;return true;
}
function attach(){
 const unload=(event:BeforeUnloadEvent)=>{if(changed.size){event.preventDefault();event.returnValue='';}};
 const navigate=(raw:Event)=>{const event=raw as NavigationEvent;if(acceptedDestination===event.destination.url){acceptedDestination='';return;}if(changed.size&&event.cancelable&&event.destination.sameDocument&&!event.hashChange&&!confirmDiscardChanges())event.preventDefault();};
 const target=navigation();window.addEventListener('beforeunload',unload);target?.addEventListener('navigate',navigate);
 return()=>{window.removeEventListener('beforeunload',unload);target?.removeEventListener('navigate',navigate);};
}
let detach:(()=>void)|undefined;
export function useUnsavedChanges(dirty:boolean){
 const id=useRef(Symbol('unsaved-form'));
 useEffect(()=>{
  if(!dirty)return;changed.add(id.current);if(!detach)detach=attach();
  return()=>{changed.delete(id.current);if(!changed.size){detach?.();detach=undefined;}};
 },[dirty]);
 return()=>confirmDiscardChanges(dirty);
}

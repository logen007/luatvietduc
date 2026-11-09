'use client';
import {confirmAction} from './confirm-dialog';
import {useEffect,useRef} from 'react';

const changed=new Set<symbol>();
const message='Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi?';
type NavigationEvent=Event&{destination:{url:string;sameDocument:boolean;key?:string};hashChange?:boolean;navigationType?:string};
type NavigationTarget=EventTarget&{navigate?:(url:string,options?:{history:'replace'|'push'})=>unknown;traverseTo?:(key:string)=>unknown};
const navigation=()=> (window as Window&{navigation?:NavigationTarget}).navigation;
let acceptedDestination='',acceptedAt=0;
export async function confirmDiscardChanges(dirty=changed.size>0){return !dirty||await confirmAction({title:'Bỏ thay đổi chưa lưu?',message,confirmLabel:'Bỏ thay đổi',cancelLabel:'Tiếp tục chỉnh sửa',danger:true});}
// Browser reload/closing retains the required beforeunload safeguard.
// In-app navigation and same-document history use the shared confirmation modal.
export function confirmAdminNavigation(href:string,onApproved:()=>void=()=>window.location.assign(href)){
 const destination=new URL(href,window.location.href).href;
 if(!changed.size||acceptedDestination===destination&&Date.now()-acceptedAt<3000)return true;
 void confirmDiscardChanges().then(accepted=>{if(!accepted)return;acceptedDestination=destination;acceptedAt=Date.now();onApproved();});
 return false;
}
function attach(){
 const unload=(event:BeforeUnloadEvent)=>{if(changed.size&&(!acceptedDestination||Date.now()-acceptedAt>3000)){event.preventDefault();event.returnValue='';}};
 const navigate=(raw:Event)=>{
  const event=raw as NavigationEvent;
  if(acceptedDestination===event.destination.url){if(event.destination.sameDocument)acceptedDestination='';return;}
  if(!changed.size||!event.cancelable||!event.destination.sameDocument||event.hashChange)return;
  const target=navigation();event.preventDefault();
  void confirmDiscardChanges().then(accepted=>{
   if(!accepted)return;acceptedDestination=event.destination.url;acceptedAt=Date.now();
   if(event.navigationType==='traverse'&&event.destination.key&&target?.traverseTo)target.traverseTo(event.destination.key);
   else target?.navigate?.(event.destination.url,{history:event.navigationType==='replace'?'replace':'push'});
  });
 };
 const target=navigation();window.addEventListener('beforeunload',unload);target?.addEventListener('navigate',navigate);
 return()=>{window.removeEventListener('beforeunload',unload);target?.removeEventListener('navigate',navigate);};
}
let detach:(()=>void)|undefined;
export function useUnsavedChanges(dirty:boolean){
 const id=useRef(Symbol('unsaved-form'));
 useEffect(()=>{
  if(!dirty)return;changed.add(id.current);if(!detach)detach=attach();
  return()=>{changed.delete(id.current);if(!changed.size){detach?.();detach=undefined;acceptedDestination='';acceptedAt=0;}};
 },[dirty]);
 return()=>confirmDiscardChanges(dirty);
}

'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
// Payload's row checkboxes omit their label; enhance only their accessible
// names at our UI boundary, without changing selection or native event handlers.
export function useSelectionLabels(){
 const pathname=usePathname();
 useEffect(()=>{
  let frame=0;
  const label=()=>{
   for(const input of document.querySelectorAll<HTMLInputElement>('.select-all input[type="checkbox"],.select-row input[type="checkbox"]')){
    const row=input.closest('tr'),title=row?.querySelector('td a')?.textContent?.trim()||row?.id||'bản ghi';
    const text=input.closest('.select-all')?'Chọn tất cả trên trang':'Chọn '+title;
    input.setAttribute('aria-label',text);input.removeAttribute('aria-labelledby');
   }
  };
  const root=document.querySelector('.template-default__wrap');if(!root)return;
  label();const observer=new MutationObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(label);});
  observer.observe(root,{childList:true,subtree:true});
  return()=>{observer.disconnect();cancelAnimationFrame(frame);};
 },[pathname]);
}

'use client';
import Link from 'next/link';
import {useState,type ComponentProps} from 'react';
import {isPageLink,prefetchPage} from './navigation';
import {confirmAdminNavigation} from './unsaved-changes';

type Props=Omit<ComponentProps<'a'>,'href'> & {href:string;prefetch?:boolean|null};
export function AppLink({href,prefetch,...props}:Props){
 const [warmHref,setWarmHref]=useState('');
 const policy=prefetch===undefined?prefetchPage(href):prefetch;
 // Lists and filters can contain dozens of dynamic pages. Warm only the one
 // the visitor points to, focuses or touches; common destinations stay warm.
 const intentOnly=prefetch===undefined&&policy===null;
 const warm=()=>{if(intentOnly)setWarmHref(href);};
 if(!isPageLink(href)||props.download!==undefined&&props.download!==false||props.target&&props.target!=='_self')return <a href={href} {...props}/>;
 return <Link href={href} {...props} prefetch={intentOnly?warmHref===href:policy}
  onMouseEnter={event=>{props.onMouseEnter?.(event);warm();}}
  onFocus={event=>{props.onFocus?.(event);warm();}}
  onTouchStart={event=>{props.onTouchStart?.(event);warm();}}
  onNavigate={event=>{
  if(window.location.pathname.startsWith('/admin')&&!confirmAdminNavigation(href))event.preventDefault();
 }}/>;
}

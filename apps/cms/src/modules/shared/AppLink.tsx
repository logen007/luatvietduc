'use client';
import Link from 'next/link';
import type {ComponentProps} from 'react';
import {isPageLink,prefetchPage} from './navigation';
import {confirmAdminNavigation} from './unsaved-changes';

type Props=Omit<ComponentProps<'a'>,'href'> & {href:string;prefetch?:boolean|null};
export function AppLink({href,prefetch,...props}:Props){
 if(!isPageLink(href)||props.download!==undefined&&props.download!==false||props.target&&props.target!=='_self')return <a href={href} {...props}/>;
 return <Link href={href} {...props} prefetch={prefetch===undefined?prefetchPage(href):prefetch} onNavigate={event=>{
  if(window.location.pathname.startsWith('/admin')&&!confirmAdminNavigation(href))event.preventDefault();
 }}/>;
}

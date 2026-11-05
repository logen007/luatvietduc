'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {roleLabel} from '../identity/roles';
import {Account,useNav} from '@payloadcms/ui';
import {usePathname} from 'next/navigation';
import {confirmAdminNavigation} from '../shared/unsaved-changes';
import type {AdminNavItem as Item} from './navigation-model';
import {useSelectionLabels} from './useSelectionLabels';
const paths:Record<string,string>={home:'M3 10 12 3l9 7v11H3Z M9 21v-8h6v8',post:'M5 3h10l4 4v14H5Z M14 3v5h5 M8 12h8 M8 16h6',media:'M3 4h18v16H3Z M3 17l6-6 4 4 3-3 5 5',knowledge:'M3 4h6l3 2 3-2h6v15h-6l-3 2-3-2H3Z M12 6v15',chat:'M3 4h18v13H8l-5 4Z M7 9h10 M7 13h7',users:'M15 21v-3a5 5 0 0 0-10 0v3 M18 13a5 5 0 0 1 4 5v3 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M16 3a4 4 0 0 1 0 8',settings:'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6'};
export function NavigationLinks({items,viewer}:{items:Item[];viewer?:{name?:string;role?:string}|null}){
 useSelectionLabels();
 const pathname=usePathname(),{navOpen,setNavOpen}=useNav(),[expanded,setExpanded]=useState<Record<string,boolean>>({});
 const root=useRef<HTMLDivElement>(null);
 // Payload's native mobile close button has no accessible name.
 useEffect(()=>{const close=root.current?.closest('.nav')?.querySelector<HTMLButtonElement>('.nav__mobile-close');if(close){close.setAttribute('aria-label','Đóng Menu');close.title='Đóng menu';}},[]);
 // Payload makes a closed drawer inert. The desktop icon rail remains usable.
 useEffect(()=>{
  const nav=root.current?.closest<HTMLElement>('.nav');if(!nav)return;
  const desktop=window.matchMedia('(min-width: 1025px)');
  const sync=()=>{nav.inert=!navOpen&&!desktop.matches;};
  sync();desktop.addEventListener('change',sync);
  return()=>{desktop.removeEventListener('change',sync);nav.inert=!navOpen;};
 },[navOpen]);
 const closeMobile=()=>{if(window.matchMedia('(max-width: 1024px)').matches)setNavOpen(false);};
 const active=(href:string)=>href==='/admin'?pathname==='/admin':pathname===href||pathname.startsWith(href+'/');
 return <div ref={root} className="lvd-admin-sidebar"><nav className="lvd-admin-navigation lvd-admin-menu" aria-label="Quản trị website">{items.map((item,index)=>{
  const selected=active(item.href)||Boolean(item.children?.some(child=>active(child.href))),open=expanded[item.href]??selected,subId='lvd-nav-children-'+index;
  return <div key={item.href} className={'lvd-menu-item'+(item.icon==='settings'?' lvd-menu-settings':'')+(selected?' is-current':'')}>{item.section&&<p className="lvd-menu-section">{item.section}</p>}<div className="lvd-menu-main"><Link href={item.href} title={item.label} aria-label={item.label} prefetch={false} onNavigate={event=>{if(!confirmAdminNavigation(item.href))event.preventDefault();else closeMobile();}} aria-current={pathname===item.href?'page':undefined}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[item.icon]}/></svg><span>{item.label}</span></Link>{item.children&&<button type="button" aria-expanded={open} aria-controls={subId} aria-label={(open?'Thu gọn ':'Mở rộng ')+item.label} onClick={()=>setExpanded(previous=>({...previous,[item.href]:!open}))}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 6 3 3 3-3"/></svg></button>}</div>{item.children&&open&&<div id={subId} className="lvd-menu-children">{item.children.map(child=><Link prefetch={false} onNavigate={event=>{if(!confirmAdminNavigation(child.href))event.preventDefault();else closeMobile();}} key={child.href} href={child.href} aria-current={pathname===child.href?'page':undefined}>{child.label}</Link>)}</div>}</div>;
 })}</nav><div className="lvd-sidebar-footer"><Link className="lvd-sidebar-account" href="/admin/account" prefetch={false} title="Hồ sơ cá nhân" aria-label="Hồ sơ cá nhân" aria-current={pathname==='/admin/account'?'page':undefined} onNavigate={event=>{if(!confirmAdminNavigation('/admin/account'))event.preventDefault();else closeMobile();}}><span className="lvd-sidebar-avatar" aria-hidden="true"><Account/></span><span><strong>{viewer?.name||'Luật Việt Đức'}</strong><small>{viewer?.role?roleLabel(viewer.role):'Quản trị'}</small></span></Link></div></div>;
}

'use client';
import Link from 'next/link';
import {useNav} from '@payloadcms/ui';
import {usePathname} from 'next/navigation';
type Item={label:string;href:string;icon:string;children?:{label:string;href:string}[]};
const paths:Record<string,string>={home:'M3 10 12 3l9 7v11H3Z M9 21v-8h6v8',post:'M5 3h10l4 4v14H5Z M14 3v5h5 M8 12h8 M8 16h6',media:'M3 4h18v16H3Z M3 17l6-6 4 4 3-3 5 5',knowledge:'M3 4h6l3 2 3-2h6v15h-6l-3 2-3-2H3Z M12 6v15',chat:'M3 4h18v13H8l-5 4Z M7 9h10 M7 13h7',users:'M15 21v-3a5 5 0 0 0-10 0v3 M18 13a5 5 0 0 1 4 5v3 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M16 3a4 4 0 0 1 0 8',settings:'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6'};
export function NavigationLinks({items}:{items:Item[]}){
 const pathname=usePathname(),{setNavOpen}=useNav();
 const closeMobile=()=>{if(window.matchMedia('(max-width: 1024px)').matches)setNavOpen(false);};
 const active=(href:string)=>href==='/admin'?pathname==='/admin':pathname===href||pathname.startsWith(href+'/');
 return <nav className="lvd-admin-navigation lvd-admin-menu" aria-label="Quản trị website">{items.map(item=>{
  const selected=active(item.href)||Boolean(item.children?.some(child=>active(child.href)));
  return <div key={item.href} className={'lvd-menu-item'+(item.icon==='settings'?' lvd-menu-settings':'')+(selected?' is-current':'')}><Link href={item.href} prefetch={false} onClick={closeMobile} aria-current={pathname===item.href?'page':undefined}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={paths[item.icon]}/></svg><span>{item.label}</span></Link>{item.children&&selected&&<div className="lvd-menu-children">{item.children.map(child=><Link prefetch={false} onClick={closeMobile} key={child.href} href={child.href} aria-current={pathname===child.href?'page':undefined}>{child.label}</Link>)}</div>}</div>;
 })}</nav>;
}

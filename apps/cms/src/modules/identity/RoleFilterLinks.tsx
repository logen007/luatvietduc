'use client';
import {AppLink} from '../shared/AppLink';
import {useSearchParams} from 'next/navigation';
export function RoleFilterLinks({total,roles}:{total:number;roles:{label:string;value:string;count:number}[]}){
 const search=useSearchParams(),selected=search.get('where[role][equals]')||'';
 return <nav className="lvd-user-role-tabs" aria-label="Lọc theo vai trò"><AppLink href="/admin/collections/users" aria-current={!selected?'page':undefined}>Tất cả <span>({total})</span></AppLink>{roles.map(role=><AppLink key={role.value} aria-current={selected===role.value?'page':undefined} href={'/admin/collections/users?where[role][equals]='+role.value}>{role.label} <span>({role.count})</span></AppLink>)}</nav>;
}

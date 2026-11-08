'use client';
import {useEffect,useState} from 'react';
import {api} from './client-api';
import {confirmAdminNavigation} from './unsaved-changes';
import {invalidatePublicSession,usePublicSession,refreshPublicProfile} from './session-client';
type Role='owner'|'support'|'member';
export function RolePreviewControl({compact=false,renderedRole}:{compact?:boolean;renderedRole?:string}){
 const session=usePublicSession();
 const available=session.status==='ready'&&(session.user?.role==='owner'||Boolean(session.user?.rolePreview));
 const [role,setRole]=useState<Role|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true,timer:ReturnType<typeof setTimeout>|undefined;
  const refresh=()=>{void api<{role:Role;expiresAt?:number|null}>('role-preview').then(value=>{if(!active)return;setError('');if(['owner','support','member'].includes(value.role))setRole(value.role);if(timer)clearTimeout(timer);if(value.expiresAt)timer=setTimeout(()=>{refresh();void refreshPublicProfile().catch(()=>{});},Math.max(100,value.expiresAt-Date.now()+100));}).catch(()=>{if(active)setError('Chưa tải được vai trò.');});};
  if(!available)return;refresh();window.addEventListener('focus',refresh);return()=>{active=false;if(timer)clearTimeout(timer);window.removeEventListener('focus',refresh);};
 },[session.revision,available]);
 const current=role||(available?(session.user?.rolePreview||'owner'):null);
 if(!available||!current)return null;
 const restore=current!=='owner'||Boolean(renderedRole&&renderedRole!=='owner');
 async function change(next:Role){
  if(busy||(next===current&&!restore))return;
  const destination=next==='member'?'/tai-khoan':'/admin';
  if(!confirmAdminNavigation(destination))return;
  setBusy(true);setError('');
  try{await api('role-preview',{role:next});invalidatePublicSession();window.location.assign(destination);}
  catch{setError('Chưa chuyển được vai trò. Thử lại nhé.');setBusy(false);void refreshPublicProfile().catch(()=>{});}
 }
 const toggleLabel=current==='owner'?'Chuyển sang Chuyên viên':'Chuyển sang Admin';
 return <div className={'lvd-role-preview'+(compact?' is-compact':'')}>
  {!compact&&<div className="lvd-role-preview__tabs" role="group" aria-label="Vai trò kiểm tra">{([{value:'owner',label:'Admin'},{value:'support',label:'Chuyên viên'}] as const).map(item=><button key={item.value} type="button" aria-pressed={current===item.value} disabled={busy} onClick={()=>void change(item.value)}>{item.label}</button>)}</div>}
  <button className="lvd-role-preview__toggle" type="button" aria-label={toggleLabel} title={toggleLabel} disabled={busy} onClick={()=>void change(current==='owner'?'support':'owner')}>{compact?(current==='owner'?'Admin':'Chuyên viên'):<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/></svg>}</button>
  {error&&<span role="alert">{error}</span>}
 </div>;
}

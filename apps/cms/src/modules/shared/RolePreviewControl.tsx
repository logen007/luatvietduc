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
 return <div className={'lvd-role-preview'+(compact?' is-compact':'')}><button type="button" aria-label={current==='owner'?'Chuyển sang Chuyên viên':'Chuyển sang Admin'} title={current==='owner'?'Chuyển sang Chuyên viên':'Chuyển sang Admin'} disabled={busy} onClick={()=>void change(current==='owner'?'support':'owner')}>{current==='owner'?'Admin':'Chuyên viên'}</button>{error&&<span role="alert">{error}</span>}</div>;
}

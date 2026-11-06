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
 return <div className={'lvd-role-preview'+(compact?' is-compact':'')}><svg className="lvd-role-preview-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 20v-2a5 5 0 0 1 10 0v2M18 20v-2a4 4 0 0 0-2-3.5M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M17 3a4 4 0 0 1 0 8"/></svg><select aria-label="Đổi vai trò" title="Thử quyền trong phiên này; quyền gốc không thay đổi. Tự trở lại Admin sau 15 phút." value={current} disabled={busy} onChange={event=>void change(event.target.value as Role)}><option value="owner">Xem: Admin</option><option value="support">Xem: Chuyên viên</option><option value="member">Xem: User</option></select>{restore&&<button type="button" disabled={busy} onClick={()=>void change('owner')}>Về Admin</button>}{error&&<span role="alert">{error}</span>}</div>;
}

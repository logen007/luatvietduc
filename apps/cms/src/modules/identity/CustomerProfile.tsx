'use client';
import {useEffect,useRef,useState} from 'react';
import type {ProfileData} from './profile';
import {api} from '../shared/client-api';
import {isPublicSessionCurrent,refreshPublicProfile} from '../shared/session-client';
import {useLocale} from '../shared/locale';
export function CustomerProfile({userId,revision}:{userId:number;revision:number}){
 const {t}=useLocale(),[profile,setProfile]=useState<ProfileData|null>(null),[name,setName]=useState(''),[phone,setPhone]=useState(''),[location,setLocation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),active=useRef(true),gate=useRef(false),pending=useRef<AbortController|null>(null);
 useEffect(()=>{let current=true;active.current=true;void api<ProfileData>('profile').then(value=>{if(current&&active.current&&isPublicSessionCurrent(revision)&&value.id===userId){setProfile(value);setName(value.name);setPhone(value.phone||'');setLocation(value.location||'');}}).catch(()=>{if(current&&active.current)setError('Chưa tải được hồ sơ.');});return()=>{current=false;active.current=false;pending.current?.abort();};},[userId,revision]);
 async function save(event:React.FormEvent){
  event.preventDefault();if(gate.current||!profile||!isPublicSessionCurrent(revision))return;
  gate.current=true;setBusy(true);setError('');setSaved(false);const controller=new AbortController();pending.current=controller;
  try{
   const response=await fetch('/service/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim(),phone:phone.trim(),location:location.trim(),updatedAt:profile.updatedAt}),cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])});
   const value=await response.json();if(!response.ok)throw Error(value.error||'Chưa lưu được hồ sơ.');
   if(!active.current||!isPublicSessionCurrent(revision))return;
   if(value.id!==userId||typeof value.updatedAt!=='string')throw Error('Chưa xác nhận hồ sơ đã lưu. Hãy tải lại để kiểm tra.');
   setProfile(value);setName(value.name);setPhone(value.phone||'');setLocation(value.location||'');setSaved(true);void refreshPublicProfile().catch(()=>{});
  }catch(error){if(active.current&&!controller.signal.aborted)setError(error instanceof Error?error.message:'Chưa lưu được hồ sơ.');}
  finally{gate.current=false;if(active.current)setBusy(false);if(pending.current===controller)pending.current=null;}
 }
 if(!profile)return <p role={error?'alert':'status'}>{t(error||'Đang tải hồ sơ…')}</p>;
 const changed=name.trim()!==profile.name||phone.trim()!==profile.phone||location.trim()!==profile.location;
 return <form className="live-contact-profile" onSubmit={save} aria-busy={busy}>
  <label><span>{t('Tên hiển thị')}</span><input name="name" autoComplete="name" required maxLength={100} value={name} disabled={busy} onChange={e=>{setName(e.target.value);setSaved(false);}}/></label>
  <label><span>{t('Email')}</span><input type="email" value={profile.email} readOnly/></label>
  <label><span>{t('Số điện thoại')}</span><input name="phone" type="tel" autoComplete="tel" maxLength={40} value={phone} disabled={busy} onChange={e=>{setPhone(e.target.value);setSaved(false);}}/></label>
  <label><span>{t('Nơi sinh sống')}</span><input name="location" autoComplete="address-level2" maxLength={160} value={location} disabled={busy} onChange={e=>{setLocation(e.target.value);setSaved(false);}}/></label>
  <button type="submit" disabled={busy||!name.trim()||!changed}>{t(busy?'Đang lưu…':'Lưu thay đổi')}</button>
  {error&&<p role="alert">{t(error)}</p>}{saved&&<p role="status">{t('Đã lưu hồ sơ.')}</p>}
 </form>;
}

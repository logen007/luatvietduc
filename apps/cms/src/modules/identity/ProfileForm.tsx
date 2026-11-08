'use client';
import {useAuth} from '@payloadcms/ui';
import {useEffect,useRef,useState} from 'react';
import type {ProfileData} from './profile';
import {roleLabel} from './roles';
import {useUnsavedChanges} from '../shared/unsaved-changes';

export function ProfileForm({initial,preview=false}:{initial:ProfileData;preview?:boolean}){
 const {fetchFullUser}=useAuth(),[profile,setProfile]=useState(initial),[name,setName]=useState(initial.name),[busy,setBusy]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState(''),[imageError,setImageError]=useState(false),[imagePreview,setImagePreview]=useState(''),[phone,setPhone]=useState(initial.phone||'');
 const file=useRef<HTMLInputElement>(null),pending=useRef<AbortController|null>(null),gate=useRef(false),mounted=useRef(true);
 const changed=name.trim()!==profile.name||phone.trim()!==(profile.phone||'');
 useUnsavedChanges(changed);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;pending.current?.abort();};},[]);
 useEffect(()=>()=>{if(imagePreview)URL.revokeObjectURL(imagePreview);},[imagePreview]);
 const apply=(next:ProfileData)=>{
  setProfile(next);setImageError(false);
  void fetchFullUser().catch(()=>{});
 };
 async function request(action:'name'|'upload'|'remove'|'password',selected?:File){
  if(gate.current||preview)return;
  if(selected&&(!selected.size||selected.size>5*1024*1024)){setError('Chọn ảnh nhỏ hơn 5 MB.');return;}
  if(selected){setImageError(false);setImagePreview(URL.createObjectURL(selected));}
  gate.current=true;setBusy(action);setError('');setStatus('');const controller=new AbortController();pending.current=controller;
  try{
   let body:BodyInit,headers:HeadersInit|undefined;
   if(action==='upload'){
    const form=new FormData();form.set('file',selected!);form.set('updatedAt',profile.updatedAt);body=form;
   }else{headers={'Content-Type':'application/json'};body=JSON.stringify(action==='password'?{}:{updatedAt:profile.updatedAt,...(action==='name'?{name:name.trim(),phone:phone.trim()}:{})});}
   const response=await fetch(action==='password'?'/service/profile/password':'/service/profile',{method:action==='name'?'PATCH':action==='remove'?'DELETE':'POST',headers,body,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(action==='upload'?60000:20000)]),cache:'no-store'});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'Chưa lưu được hồ sơ.');
   if(!mounted.current)return;
   if(action==='password')setStatus('Đã gửi liên kết đặt lại mật khẩu đến email của bạn.');
   else{
    if(data.id!==profile.id||typeof data.updatedAt!=='string'||typeof data.name!=='string')throw new Error('Chưa xác nhận hồ sơ đã lưu. Hãy tải lại để kiểm tra.');
    apply(data);if(action==='name'){setName(data.name);setPhone(data.phone||'');}
    setStatus(action==='name'?'Đã lưu hồ sơ.':action==='remove'?'Đã gỡ ảnh đại diện.':'Đã đổi ảnh đại diện.');
   }
  }catch(error){if(mounted.current&&!controller.signal.aborted)setError(error instanceof Error&&error.name==='TimeoutError'?'Chưa xác nhận hồ sơ đã lưu. Tải lại để kiểm tra trước khi thử lại.':error instanceof Error?error.message:'Chưa lưu được hồ sơ.');}
  finally{gate.current=false;if(mounted.current){setBusy('');setImagePreview('');}if(pending.current===controller)pending.current=null;}
 }
 return <div className="lvd-profile">
  <header className="lvd-profile-heading"><h1>Hồ sơ</h1><span className="lvd-profile-role">{roleLabel(profile.role)}</span></header>
  <section className="lvd-profile-avatar-section" aria-labelledby="profile-avatar-title">
   <div className="lvd-profile-photo" aria-busy={busy==='upload'||busy==='remove'}>{(imagePreview||profile.avatarURL)&&!imageError?<img src={imagePreview||profile.avatarURL} alt={profile.name} onError={()=>setImageError(true)}/>:<span aria-hidden="true">{(profile.name.trim()||profile.email).slice(0,1).toLocaleUpperCase('vi')}</span>}</div>
   <div><h2 id="profile-avatar-title">Ảnh đại diện</h2><div className="lvd-profile-avatar-actions">
    <button type="button" disabled={Boolean(busy)||preview||!profile.canUpload} onClick={()=>file.current?.click()}>{busy==='upload'?'Đang tải ảnh…':'Đổi ảnh'}</button>
    {profile.avatarURL&&<button type="button" className="lvd-profile-quiet" disabled={Boolean(busy)||preview} onClick={()=>void request('remove')}>Gỡ ảnh</button>}
   </div><small>{profile.canUpload?'JPG, PNG, WebP · Tối đa 5 MB':'Chưa kết nối lưu trữ ảnh.'}</small>
   <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="Chọn ảnh đại diện" onChange={event=>{const selected=event.currentTarget.files?.[0];event.currentTarget.value='';if(selected)void request('upload',selected);}}/>
   </div>
  </section>
  <form className="lvd-profile-form" onSubmit={event=>{event.preventDefault();void request('name');}} aria-busy={busy==='name'}>
   <h2>Thông tin cá nhân</h2><div className="lvd-profile-fields">
    <label><span>Tên hiển thị</span><input name="name" autoComplete="name" value={name} maxLength={100} required disabled={Boolean(busy)||preview} onChange={event=>setName(event.target.value)}/></label>
    <label><span>Email</span><input type="email" autoComplete="email" value={profile.email} readOnly aria-readonly="true"/></label>
   <label><span>Số điện thoại</span><input name="phone" type="tel" autoComplete="tel" value={phone} maxLength={40} disabled={Boolean(busy)||preview} onChange={event=>setPhone(event.target.value)}/></label></div><div className="lvd-profile-form-actions"><button className="lvd-profile-primary" type="submit" disabled={Boolean(busy)||preview||!name.trim()||!changed}>{busy==='name'?'Đang lưu…':'Lưu thay đổi'}</button></div>
  </form>
  <section className="lvd-profile-security" aria-labelledby="profile-security-title"><div><h2 id="profile-security-title">Mật khẩu</h2><p>Nhận liên kết đặt lại mật khẩu qua email.</p></div><button type="button" disabled={Boolean(busy)||preview||!profile.canResetPassword} onClick={()=>void request('password')}>{busy==='password'?'Đang gửi…':'Đổi mật khẩu'}</button></section>
  {preview&&<p className="lvd-profile-feedback" role="status">Trở về Admin để sửa hồ sơ của bạn.</p>}
  {error&&<p className="lvd-profile-feedback is-error" role="alert">{error}</p>}{status&&<p className="lvd-profile-feedback" role="status">{status}</p>}
 </div>;
}

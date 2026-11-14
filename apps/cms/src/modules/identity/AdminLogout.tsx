'use client';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from '@payloadcms/ui';
import {api} from '../shared/client-api';

// Keep Payload's native logout route/button; confirm server revocation before
// clearing its client session or reporting success.
export function AdminLogout(){
 const {logOut}=useAuth(),logout=useRef(logOut);logout.current=logOut;
 const [attempt,setAttempt]=useState(0),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;setError('');
  const timer=setTimeout(()=>{void(async()=>{
   try{await api('logout',{});if(!active)return;await logout.current();if(active)window.location.replace('/admin/login');}
   catch(error){if(active)setError(error instanceof Error?error.message:'Chưa đăng xuất được. Vui lòng thử lại.');}
  })();},0);
  return()=>{active=false;clearTimeout(timer);};
 },[attempt]);
 return <div className="logout__wrap">{error?<><p role="alert">{error}</p><button type="button" className="btn btn--style-primary" onClick={()=>setAttempt(value=>value+1)}>Thử lại</button></>:<p role="status">Đang đăng xuất…</p>}</div>;
}

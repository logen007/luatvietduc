'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale} from '../shared/locale';
import {invalidatePublicSession} from '../shared/session-client';
import {isAccountSuccess} from './account-response';
type Mode='register'|'signin'|'forgot'|'verify'|'reset'|'verification-email'|'reset-email';
export type AccountRecoveryLink={mode:'verify'|'reset';token:string};
function GoogleMark(){return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" stroke="none"><path fill="currentColor" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.25c1.9-1.75 2.97-4.33 2.97-7.36Z"/><path fill="currentColor" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.25-2.51c-.9.6-2.05.96-3.37.96-2.6 0-4.81-1.76-5.6-4.12H3.04v2.6A10 10 0 0 0 12 22Z"/><path fill="currentColor" d="M6.4 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.32.3-1.92V7.49H3.04A10 10 0 0 0 2 12c0 1.61.38 3.13 1.04 4.51l3.36-2.59Z"/><path fill="currentColor" d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.96 5.49l3.36 2.59C7.19 7.72 9.4 5.96 12 5.96Z"/></svg>;}
export function AccountForm({google,conversation,recoveryLink,onRecoveryLink}:{google:boolean;conversation:string;recoveryLink?:AccountRecoveryLink|null;onRecoveryLink?:(link:AccountRecoveryLink|null)=>void}){
 const {t,language}=useLocale(),[mode,setMode]=useState<Mode>('register'),[email,setEmail]=useState(''),[token,setToken]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(''),[show,setShow]=useState(false),gate=useRef(false),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{const url=new URL(location.href),value=url.searchParams.get('mode'),urlToken=url.searchParams.get('token')||'',linkToken=urlToken||(recoveryLink?.mode===value?recoveryLink.token:'');if(['signin','forgot','verify','reset'].includes(value||''))setMode(value as Mode);setToken(linkToken);if(value==='verify'||value==='reset'){if(!linkToken)setError('Liên kết không hợp lệ hoặc đã hết hạn.');else if(urlToken)onRecoveryLink?.({mode:value,token:urlToken});}if(url.searchParams.has('token')){url.searchParams.delete('token');history.replaceState(history.state,'',url);}if(url.searchParams.get('error')==='google-login-failed')setError('Chưa đăng nhập được bằng Google. Hãy thử lại hoặc dùng email.');},[]);
 const href=(next:Mode)=>'/tai-khoan?'+new URLSearchParams({mode:next,...(conversation?{conversation}:{})});
 function switchMode(next:Mode){if((mode==='verify'||mode==='reset')&&next!==mode){setToken('');onRecoveryLink?.(null);}setMode(next);setError('');setStatus('');setShow(false);history.replaceState(history.state,'',href(next));requestAnimationFrame(()=>heading.current?.focus());}
 async function request(action:string,password=''){
  if(gate.current)return;gate.current=true;setBusy(true);setError('');setStatus('');
  try{
   const response=await fetch('/service/auth/'+action,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password,token,conversation,language}),signal:AbortSignal.timeout(20000)}),data=await response.json();
   if(!response.ok)throw new Error(typeof data?.error==='string'&&data.error?data.error:'Chưa thực hiện được yêu cầu. Vui lòng thử lại.');
   if(!isAccountSuccess(action,data))throw new Error('Chưa thực hiện được yêu cầu. Vui lòng thử lại.');
   if(action==='login'){invalidatePublicSession();location.assign(typeof data.redirectTo==='string'&&/^\/(?:tai-khoan|tro-chuyen)(?:\?|$)/.test(data.redirectTo)?data.redirectTo:'/tai-khoan');return;}
   if(action==='verify'||action==='reset'){switchMode('signin');setToken('');setStatus(action==='verify'?'Email đã được xác nhận. Bạn có thể đăng nhập.':'Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.');}
   else if(action==='forgot')switchMode('reset-email');
   else switchMode('verification-email');
  }catch(error){setError(error instanceof Error&&error.name==='Error'?error.message:'Chưa xác nhận được yêu cầu. Kiểm tra kết nối rồi thử lại.');}
  finally{gate.current=false;setBusy(false);}
 }
 const regular=mode==='register'||mode==='signin',emailOnly=mode==='forgot',passwordMode=regular||mode==='reset';
 const title=mode==='register'?'Tạo tài khoản':mode==='signin'?'Đăng nhập':mode==='forgot'?'Đặt lại mật khẩu':mode==='reset'?'Đặt mật khẩu mới':mode==='verify'?'Xác nhận email':'Kiểm tra email';
 return <div className="live-account-form-view"><h1 ref={heading} tabIndex={-1}>{t(title)}</h1>
  {(regular||emailOnly||mode==='reset')&&<form className="live-credentials-form" method="post" key={mode} onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);void request(mode==='register'?'register':mode==='signin'?'login':mode==='forgot'?'forgot':'reset',String(data.get('password')||''));}} aria-busy={busy}>
   {(regular||emailOnly)&&<input id="account-email" name="email" aria-label={t('Địa chỉ email')} placeholder={t('Địa chỉ email')} type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} disabled={busy}/>}
   {passwordMode&&<div className="live-credential-field"><span className="live-password-input"><input id="account-password" name="password" aria-label={t('Mật khẩu')} placeholder={t('Mật khẩu')} type={show?'text':'password'} autoComplete={mode==='signin'?'current-password':'new-password'} required minLength={mode==='signin'?1:12} maxLength={mode==='signin'?1024:128} aria-describedby={mode==='signin'?undefined:'account-password-hint'} disabled={busy}/><button type="button" aria-label={t(show?'Ẩn mật khẩu':'Hiện mật khẩu')} aria-pressed={show} onClick={()=>setShow(!show)} disabled={busy}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{show&&<path d="M3 3l18 18"/>}</svg></button></span>{mode!=='signin'&&<small id="account-password-hint">{t('Ít nhất 12 ký tự.')}</small>}</div>}
   {mode==='signin'&&<a className="live-forgot-password" href={href('forgot')} onClick={event=>{event.preventDefault();if(!busy)switchMode('forgot');}}>{t('Quên mật khẩu?')}</a>}
   <button className="button" type="submit" disabled={busy}>{t(busy?'Đang xử lý…':mode==='register'?'Tạo tài khoản':mode==='signin'?'Đăng nhập':mode==='forgot'?'Gửi liên kết đặt lại mật khẩu':'Lưu mật khẩu mới')}</button>
  </form>}
  {regular&&<><div className="live-auth-divider"><span>{t('hoặc')}</span></div>{google?<a className="button live-google" href={'/auth/google'+(conversation?'?conversation='+encodeURIComponent(conversation):'')}><GoogleMark/>{t('Tiếp tục bằng Google')}</a>:<button className="button live-google" disabled><GoogleMark/>{t('Tiếp tục bằng Google')}</button>}</>}
  {mode==='verify'&&<><p className="live-auth-note">{t('Xác nhận email để kích hoạt tài khoản.')}</p><button className="button" type="button" disabled={busy||!token} onClick={()=>void request('verify')}>{t(busy?'Đang xử lý…':'Xác nhận email')}</button></>}
  {mode==='verification-email'&&<><p className="live-auth-note">{t('Nếu email có thể đăng ký, bạn sẽ nhận được liên kết kích hoạt. Đã có tài khoản? Hãy đăng nhập.')}</p><button type="button" className="live-auth-text-button" disabled={busy||!email} onClick={()=>void request('resend')}>{t(busy?'Đang xử lý…':'Gửi lại email xác nhận')}</button></>}
  {mode==='reset-email'&&<p className="live-auth-note">{t('Nếu tài khoản tồn tại, bạn sẽ nhận được liên kết đặt lại mật khẩu.')}</p>}
  {error&&<p className="live-error" role="alert">{t(error)}</p>}{status&&<p className="live-auth-success" role="status">{t(status)}</p>}
  <p className="live-auth-switch">{mode==='register'?t('Bạn đã có tài khoản?'):mode==='signin'?t('Bạn chưa có tài khoản?'):''}{' '}<a href={href(mode==='signin'?'register':'signin')} onClick={event=>{event.preventDefault();if(!busy)switchMode(mode==='signin'?'register':'signin');}}>{t(mode==='signin'?'Đăng ký':'Đăng nhập')}</a></p>
 </div>;
}

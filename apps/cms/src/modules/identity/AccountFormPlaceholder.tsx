'use client';
import {useLocale} from '../shared/locale';

// Only geometry is rendered while checking the session: no credentials, recovery
// token, enabled form or assumed account state. Query-specific geometry avoids
// pushing the mobile intro down when the actual form becomes available.
export function AccountFormPlaceholder({mode}:{mode:string|null}){
 const {t}=useLocale();
 const regular=!mode||!['forgot','verify','reset'].includes(mode);
 const signin=mode==='signin',forgot=mode==='forgot',reset=mode==='reset';
 const title=forgot?'Đặt lại mật khẩu':reset?'Đặt mật khẩu mới':mode==='verify'?'Xác nhận email':signin?'Đăng nhập':'Tạo tài khoản';
 return <div role="status" aria-label={t('Đang kiểm tra phiên đăng nhập…')} className="live-account-form-view">
  <div className="live-account-placeholder" aria-hidden="true" inert>
   <div className="live-auth-placeholder-heading">{t(title)}</div>
   {(regular||forgot||reset)&&<div className="live-credentials-form">
    {(regular||forgot)&&<div className="live-auth-placeholder-input"/>}
    {(regular||reset)&&<div className="live-credential-field"><div className="live-auth-placeholder-input"/>{!signin&&<small>{t('Ít nhất 12 ký tự.')}</small>}</div>}
    {signin&&<span className="live-forgot-password">{t('Quên mật khẩu?')}</span>}
    <div className="live-auth-placeholder-input"/>
   </div>}
   {regular&&<><div className="live-auth-divider"><span>{t('hoặc')}</span></div><div className="live-auth-placeholder-input"/></>}
   {mode==='verify'&&<><p className="live-auth-note">{t('Xác nhận email để kích hoạt tài khoản.')}</p><div className="live-auth-placeholder-input"/></>}
   <p className="live-auth-switch">{regular?t(signin?'Bạn chưa có tài khoản?':'Bạn đã có tài khoản?'):''}{' '}<span>{t(signin?'Đăng ký':'Đăng nhập')}</span></p>
  </div>
 </div>;
}

"use client";
import {usePublicSession} from './session-client';
import {accountView} from './account-state.mjs';
import {useLocale} from "./locale";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";

import {RolePreviewControl} from './RolePreviewControl';
import {LanguageSwitch} from './LanguageSwitch';
import {usePublicShell} from './usePublicShell';
import {api} from './client-api';
const arrow = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6" /></svg>;

export function Header({publicMode=false,activeSection='',onAccountNavigate}:{publicMode?:boolean;activeSection?:string;onAccountNavigate?:(event:React.MouseEvent<HTMLAnchorElement>)=>void}={}) {
 const {t,language}=useLocale(),session=usePublicSession(),account=accountView(session,language);
  const shell=usePublicShell(),name=shell.name,publicLinks=shell.primary;
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut,setLoggingOut]=useState(false),[logoutError,setLogoutError]=useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const closeMenu = () => dialog.current?.close();
  const signOut=async()=>{
    if(loggingOut)return;
    setLoggingOut(true);setLogoutError('');
    try{await api('logout',{});window.location.assign('/');}
    catch(error){setLogoutError(error instanceof Error?error.message:'Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.');setLoggingOut(false);}
  };
  return (
    <>
      <header className="site-header live-header">
        <div className="container header-inner live-header-inner">
          <a className="brand live-brand" href="/" aria-label={`${name} — ${t("Trang chủ")}`}>
            {shell.logo?<img className="public-brand-logo" src={shell.logo} alt={name} style={{height:shell.headerLogoHeight}}/>:<span className="brand-name">{name}</span>}
          </a>
          <nav className={'live-nav'+(publicMode?' desktop-nav':'')} aria-label={t("Điều hướng chính")}>
            {publicLinks.map((link) => <a key={link.href} href={link.href} aria-current={link.key===activeSection?'location':undefined}>{t(link.label)}</a>)}
          </nav>
          <div className={'live-header-actions'+(publicMode?' header-tools':'')}>
            {session.user?.rolePreview&&<RolePreviewControl compact/>}
            <LanguageSwitch/>
            <a className={'live-header-login-button button'+(publicMode?' header-login':'')} href={account.href} onClick={onAccountNavigate} aria-current={pathname === "/tai-khoan" ? "page" : undefined}>{account.label} {arrow}</a>
            <button className="live-menu-button" type="button" aria-label={t("Mở menu")} aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls="live-menu-dialog" onClick={() => { dialog.current?.showModal(); setMenuOpen(true); }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
          </div>
        </div>
      </header>
      <dialog ref={dialog} id="live-menu-dialog" className="live-menu-dialog" aria-labelledby="live-menu-title" onClose={() => setMenuOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) closeMenu(); }}>
        <div className="live-menu-heading">
          <h2 id="live-menu-title">{name}</h2>
          <button type="button" onClick={closeMenu} aria-label={t("Đóng menu")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button>
        </div>
        <nav aria-label={t("Menu")}>
          {publicLinks.map((link) => <a key={link.href} href={link.href} onClick={closeMenu} aria-current={link.key===activeSection?'location':undefined}>{t(link.label)}{arrow}</a>)}
          {!publicLinks.some(link=>link.href==='/lien-he')&&<a href="/lien-he" onClick={closeMenu}>{t("Liên hệ")} {arrow}</a>}
          <a href={account.href} aria-current={pathname === "/tai-khoan" ? "page" : undefined} onClick={event=>{closeMenu();onAccountNavigate?.(event);}}>{account.label} {arrow}</a>
          {account.management&&<a href={account.management.href} onClick={closeMenu}>{account.management.label} {arrow}</a>}
          {session.status==='ready'&&session.user&&<button type="button" onClick={()=>void signOut()} disabled={loggingOut} aria-busy={loggingOut}>{t('Đăng xuất')} <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5H4v14h5M13 8l4 4-4 4M8 12h13"/></svg></button>}
          {logoutError&&<p className="live-error" role="alert">{t(logoutError)}</p>}
        </nav>
      </dialog>
    </>
  );
}

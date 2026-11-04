"use client";
import {usePublicSession} from './session-client';
import {accountView} from './account-state.mjs';
import {useLocale} from "./locale";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";

import {LanguageSwitch} from './LanguageSwitch';
import {usePublicShell} from './usePublicShell';
const arrow = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6" /></svg>;

export function Header() {
 const {t,language}=useLocale(),session=usePublicSession(),account=accountView(session,language);
  const shell=usePublicShell(),name=shell.name,publicLinks=shell.primary;
  const [menuOpen, setMenuOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const closeMenu = () => dialog.current?.close();
  return (
    <>
      <header className="site-header live-header">
        <div className="container header-inner live-header-inner">
          <a className="brand live-brand" href="/" aria-label={`${name} — ${t("Trang chủ")}`}>
            {shell.logo&&<img className="public-brand-logo" src={shell.logo} alt="" width={36} height={36}/>}
            <span className="brand-name">{name}</span>
          </a>
          <nav className="live-nav" aria-label={t("Điều hướng chính")}>
            {publicLinks.map((link) => <a key={link.href} href={link.href}>{t(link.label)}</a>)}
          </nav>
          <div className="live-header-actions">
            <LanguageSwitch/>
            <a className="live-header-login-button button" href={account.href} aria-current={pathname === "/tai-khoan" ? "page" : undefined}>{account.label} {arrow}</a>
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
          <a href="/" onClick={closeMenu}>{t("Trang chủ")} {arrow}</a>
          {publicLinks.map((link) => <a key={link.href} href={link.href} onClick={closeMenu}>{t(link.label)}{arrow}</a>)}
          <a href="/#/lien-he" onClick={closeMenu}>{t("Liên hệ")} {arrow}</a>
          <a href="/tro-chuyen" onClick={closeMenu} aria-current={pathname === "/tro-chuyen" ? "page" : undefined}>{t("Hỏi chuyên viên")} {arrow}</a>
          <a href={account.href} onClick={closeMenu}>{account.label} {arrow}</a>
          {account.management&&<a href={account.management.href} onClick={closeMenu}>{account.management.label} {arrow}</a>}
        </nav>
      </dialog>
    </>
  );
}

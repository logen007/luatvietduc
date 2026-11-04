"use client";
import {useLocale} from "./locale";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";

import {LanguageSwitch} from './LanguageSwitch';
import navigation from "./navigation.json";
import {usePublicSettings} from "../settings/client";
const publicLinks=navigation.primary;
const arrow = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6" /></svg>;

export function Header() {
 const {t,language}=useLocale();
  const text=(vi:string,de:string)=>language==='de'?de:vi;
  const labels:Record<string,string>={'Thư viện':'Bibliothek','Tin tức':'Nachrichten','Giới thiệu':'Über uns'};
  const settings=usePublicSettings();
  const name=settings?.siteName||"Luật Việt Đức";
  const [menuOpen, setMenuOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const closeMenu = () => dialog.current?.close();
  return (
    <>
      <header className="site-header live-header">
        <div className="container header-inner live-header-inner">
          <a className="brand live-brand" href="/" aria-label={`${name} — ${t("Trang chủ")}`}>
            <span className="brand-name">{name}</span>
          </a>
          <nav className="live-nav" aria-label={t("Điều hướng chính")}>
            {publicLinks.map((link) => <a key={link.href} href={link.href}>{language==='de'?(labels[link.label]||link.label):link.label}</a>)}
          </nav>
          <div className="live-header-actions">
            <LanguageSwitch/>
            <a className="live-header-login-button button" href="/tai-khoan" aria-current={pathname === "/tai-khoan" ? "page" : undefined}>{text('Đăng nhập','Anmelden')} {arrow}</a>
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
          {publicLinks.map((link) => <a key={link.href} href={link.href} onClick={closeMenu}>{language==='de'?(labels[link.label]||link.label):link.label}{arrow}</a>)}
          <a href="/#/lien-he" onClick={closeMenu}>{t("Liên hệ")} {arrow}</a>
          <a href="/tro-chuyen" onClick={closeMenu} aria-current={pathname === "/tro-chuyen" ? "page" : undefined}>{t("Hỏi chuyên viên")} {arrow}</a>
          <a href="/tai-khoan" onClick={closeMenu}>{text('Đăng nhập','Anmelden')} {arrow}</a>
        </nav>
      </dialog>
    </>
  );
}

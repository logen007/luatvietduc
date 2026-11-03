"use client";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";

import navigation from "./navigation.json";
import {usePublicSettings} from "../settings/client";
const publicLinks=navigation.primary;
const arrow = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6" /></svg>;

export function Header() {
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
          <a className="brand live-brand" href="/" aria-label={`${name} — Trang chủ`}>
            <span className="brand-name">{name}</span>
          </a>
          <nav className="live-nav" aria-label="Điều hướng chính">
            {publicLinks.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
          </nav>
          <div className="live-header-actions">
            <a className="live-header-login-button button" href="/tai-khoan" aria-current={pathname === "/tai-khoan" ? "page" : undefined}>Đăng nhập {arrow}</a>
            <button className="live-menu-button" type="button" aria-label="Mở menu" aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls="live-menu-dialog" onClick={() => { dialog.current?.showModal(); setMenuOpen(true); }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
          </div>
        </div>
      </header>
      <dialog ref={dialog} id="live-menu-dialog" className="live-menu-dialog" aria-labelledby="live-menu-title" onClose={() => setMenuOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) closeMenu(); }}>
        <div className="live-menu-heading">
          <h2 id="live-menu-title">{name}</h2>
          <button type="button" onClick={closeMenu} aria-label="Đóng menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button>
        </div>
        <nav aria-label="Menu">
          <a href="/" onClick={closeMenu}>Trang chủ {arrow}</a>
          {publicLinks.map((link) => <a key={link.href} href={link.href} onClick={closeMenu}>{link.label}{arrow}</a>)}
          <a href="/#/lien-he" onClick={closeMenu}>Liên hệ {arrow}</a>
          <a href="/tro-chuyen" onClick={closeMenu} aria-current={pathname === "/tro-chuyen" ? "page" : undefined}>Hỏi chuyên viên {arrow}</a>
          <a href="/tai-khoan" onClick={closeMenu}>Đăng nhập {arrow}</a>
        </nav>
      </dialog>
    </>
  );
}

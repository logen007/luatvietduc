"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import siteVersion from "./site-version.json";
import { SocialLinks } from "./SocialLinks";

const publicLinks = [
  { href: "/#/tra-cuu", label: "Thư viện pháp luật" },
  { href: "/#/tin-tuc", label: "Tin tức" },
  { href: "/#/ve-chuyen-trang", label: "Giới thiệu" },
];
const arrow = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6" /></svg>;

export function Header() {
  const [name, setName] = useState("Luật Việt Đức");
  const [menuOpen, setMenuOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    fetch("/service/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => { if (s?.siteName) setName(s.siteName); })
      .catch(() => {});
  }, []);
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

const footerColumns = [
  {
    title: "Thư viện",
    links: [
      ["Thư viện pháp luật", "/#/tra-cuu"],
      ["Pháp luật Việt Nam", "/#/phap-luat/viet-nam"],
      ["Pháp luật Đức", "/#/phap-luat/duc"],
    ],
  },
  {
    title: "Chủ đề",
    links: [
      ["Quốc tịch", "/#/chu-de/quoc-tich"],
      ["Hôn nhân & gia đình", "/#/chu-de/hon-nhan-gia-dinh"],
      ["Thừa kế", "/#/chu-de/thua-ke"],
      ["Giấy tờ tùy thân", "/#/chu-de/giay-to-tuy-than"],
    ],
  },
  {
    title: "Chuyên trang",
    links: [
      ["Về Luật Việt Đức", "/#/ve-chuyen-trang"],
      ["Đội ngũ chuyên gia", "/#/ve-chuyen-trang?muc=doi-ngu"],
      ["Tin tức & đời sống", "/#/tin-tuc"],
      ["Liên hệ", "/#/lien-he"],
    ],
  },
  {
    title: "Hỗ trợ",
    links: [
      ["Hỏi chuyên viên", "/tro-chuyen"],
      ["Tài khoản của bạn", "/tai-khoan"],
      ["Quyền riêng tư", "/#/chinh-sach-thong-tin"],
      ["Điều khoản sử dụng", "/#/dieu-khoan"],
    ],
  },
];
export function Footer() {
  return (
    <footer className="live-footer">
      <div className="live-footer-inner">
        <div className="live-footer-identity">
          <a className="live-footer-wordmark" href="/">
            Luật Việt Đức
          </a>
          <p>Thông tin pháp luật Việt Nam & Đức.</p>
          <SocialLinks />
        </div>
        {footerColumns.map((column) => (
          <nav
            className="live-footer-column"
            key={column.title}
            aria-label={column.title}
          >
            <h2>{column.title}</h2>
            <ul>
              {column.links.map(([label, href]) => (
                <li key={href}>
                  <a href={href}>{label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="live-footer-meta">
        <small>© Luật Việt Đức. · v{siteVersion.version}</small>
        <nav aria-label="Chính sách">
          <a href="/#/chinh-sach-thong-tin">Quyền riêng tư</a>
          <a href="/#/dieu-khoan">Điều khoản sử dụng</a>
        </nav>
      </div>
    </footer>
  );
}

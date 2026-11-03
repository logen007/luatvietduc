"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function Header() {
  const [name, setName] = useState("Luật Việt Đức");
  const pathname = usePathname();
  useEffect(() => {
    fetch("/service/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (s?.siteName) setName(s.siteName);
      })
      .catch(() => {});
  }, []);
  const links = [
    { href: "/#/tra-cuu", label: "Thư viện pháp luật", active: false },
    {
      href: "/bai-viet",
      label: "Bài viết",
      active: pathname.startsWith("/bai-viet"),
    },
    {
      href: "/tro-chuyen",
      label: "Hỏi chuyên viên",
      active: pathname === "/tro-chuyen",
    },
  ];
  return (
    <header className="site-header live-header">
      <div className="container header-inner live-header-inner">
        <a
          className="brand live-brand"
          href="/"
          aria-label={`${name} — Trang chủ`}
        >
          <span className="brand-mark live-brand-mark" aria-hidden="true">
            L
          </span>
          <span className="brand-name">{name}</span>
        </a>
        <nav className="live-nav" aria-label="Điều hướng chính">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={link.active ? "page" : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="live-header-actions">
          <a
            className="live-header-account"
            href="/tai-khoan"
            aria-current={pathname === "/tai-khoan" ? "page" : undefined}
          >
            Tài khoản <span aria-hidden="true">↗</span>
          </a>
          <details className="live-mobile-menu">
            <summary aria-label="Mở menu điều hướng">
              <span></span>
              <span></span>
            </summary>
            <nav aria-label="Điều hướng điện thoại">
              <a href="/">Trang chủ</a>
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={link.active ? "page" : undefined}
                >
                  {link.label}
                  <span aria-hidden="true">↗</span>
                </a>
              ))}
              <a href="/tai-khoan">
                Tài khoản<span aria-hidden="true">↗</span>
              </a>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="live-footer">
      <div className="container live-footer-inner">
        <a className="live-footer-wordmark" href="/">
          Luật Việt Đức<span>Thông tin pháp luật Việt Nam & Đức.</span>
        </a>
        <nav aria-label="Thông tin website">
          <a href="/#/chinh-sach-thong-tin">Quyền riêng tư</a>
          <a href="/#/dieu-khoan">Điều khoản sử dụng</a>
          <a href="/#/lien-he">Liên hệ</a>
        </nav>
        <small>© Luật Việt Đức</small>
      </div>
    </footer>
  );
}

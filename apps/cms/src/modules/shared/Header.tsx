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

const footerColumns = [
  {
    title: "Thư viện",
    links: [
      ["Thư viện pháp luật", "/#/tra-cuu"],
      ["Pháp luật Việt Nam", "/#/phap-luat/viet-nam"],
      ["Pháp luật Đức", "/#/phap-luat/duc"],
      ["Bài viết mới", "/bai-viet"],
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
  {
    title: "Nhân sự",
    links: [
      ["Đăng nhập quản trị", "/admin/login"],
      ["Hộp thư chuyên viên", "/chuyen-vien"],
      ["Kho kiến thức nội bộ", "/kien-thuc"],
      ["Kết nối hệ thống", "/quan-tri"],
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
        <small>© Luật Việt Đức. Thông tin pháp luật Việt Nam & Đức.</small>
        <nav aria-label="Chính sách">
          <a href="/#/chinh-sach-thong-tin">Quyền riêng tư</a>
          <a href="/#/dieu-khoan">Điều khoản sử dụng</a>
        </nav>
      </div>
    </footer>
  );
}

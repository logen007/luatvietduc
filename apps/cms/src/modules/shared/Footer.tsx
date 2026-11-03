import siteVersion from "./site-version.json";
import {SocialLinks} from "./SocialLinks";
import navigation from "./navigation.json";
const footerColumns=navigation.footer;
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

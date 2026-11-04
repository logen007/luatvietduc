"use client";
import {useLocale} from "./locale";
import siteVersion from "./site-version.json";
import {LanguageSwitch} from './LanguageSwitch';
import {SocialLinks} from "./SocialLinks";
import navigation from "./navigation.json";
const footerColumns=navigation.footer;
export function Footer() {
 const {t,language}=useLocale();
  return (
    <footer className="live-footer">
      <div className="live-footer-inner">
        <div className="live-footer-identity">
          <a className="live-footer-wordmark" href="/">
            Luật Việt Đức
          </a>
          <p>{t("Thông tin pháp luật Việt Nam & Đức.")}</p>
          <SocialLinks />
        </div>
        {footerColumns.map((column) => (
          <nav
            className="live-footer-column"
            key={t(column.title)}
            aria-label={t(column.title)}
          >
            <h2>{t(column.title)}</h2>
            <ul>
              {column.links.map(([label, href]) => (
                <li key={href}>
                  <a href={href}>{t(label)}</a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="live-footer-meta">
        <div className="live-footer-version-row"><small>© Luật Việt Đức. · v{siteVersion.version}</small><LanguageSwitch/></div>
        <nav aria-label={t("Chính sách")}>
          <a href="/#/chinh-sach-thong-tin">{t("Quyền riêng tư")}</a>
          <a href="/#/dieu-khoan">{t("Điều khoản sử dụng")}</a>
        </nav>
      </div>
    </footer>
  );
}

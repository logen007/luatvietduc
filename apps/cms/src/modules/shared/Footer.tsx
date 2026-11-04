"use client";
import {useLocale} from "./locale";
import {useEffect,useState} from 'react';
import siteVersion from "./site-version.json";
import {LanguageSwitch} from './LanguageSwitch';
import {SocialLinks} from "./SocialLinks";
import {usePublicShell} from './usePublicShell';
import {copyright} from './public-shell.mjs';
export function Footer() {
 const {t}=useLocale(),shell=usePublicShell(),footerColumns=shell.footer,[version,setVersion]=useState(siteVersion.version);
 useEffect(()=>{let active=true;fetch('/release.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(value=>{if(active&&/^\d{2}\.\d{2}\.\d{2}$/.test(value?.version||''))setVersion(value.version);}).catch(()=>{});return()=>{active=false;};},[]);
  return (
    <footer className="live-footer">
      <div className="live-footer-inner">
        <div className="live-footer-identity">
          <a className="live-footer-wordmark" href="/">
            {shell.name}
          </a>
          <p>{t(shell.tagline)}</p>
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
        <div className="live-footer-version-row"><small>{copyright(shell,version)}</small><LanguageSwitch/></div>
        <nav aria-label={t("Chính sách")}>
          <a href="/#/chinh-sach-thong-tin">{t("Quyền riêng tư")}</a>
          <a href="/#/dieu-khoan">{t("Điều khoản sử dụng")}</a>
        </nav>
      </div>
    </footer>
  );
}

/* The legacy and container builds use the same shell and ordering. */
import './assemble-presentation.mjs';
import {createHash} from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const { version: siteVersion } = JSON.parse(readFileSync(new URL('../src/modules/shared/site-version.json', import.meta.url), 'utf8'));
import { getPresentationVersion } from '../src/modules/shared/presentation-version.mjs';
const revision = getPresentationVersion(fileURLToPath(new URL('../public/', import.meta.url)));
const localeRevision=createHash('sha256').update(readFileSync(new URL('../src/modules/shared/locale/de.json',import.meta.url))).update(readFileSync(new URL('./locale-build.mjs',import.meta.url))).digest('hex').slice(0,12);
const navigation = JSON.parse(readFileSync(new URL('../src/modules/shared/navigation.json', import.meta.url), 'utf8'));
const htmlEscape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const primaryNavigation = navigation.primary.map(link => `<a data-nav="${htmlEscape(link.key)}" href="${htmlEscape(link.href)}">${htmlEscape(link.label)}</a>`).join('');
const primaryMenuNavigation = navigation.primary.map(link => `<a href="${htmlEscape(link.href)}">${htmlEscape(link.label)}</a>`).join('');
const footerNavigation = navigation.footer.map(column => `<nav class="lvd-footer-nav" aria-label="${htmlEscape(column.title)}"><h3>${htmlEscape(column.title)}</h3>${column.links.map(([label,href]) => `<a href="${htmlEscape(href)}">${htmlEscape(label)}</a>`).join('')}</nav>`).join('');
const arrow='<svg class="lvd-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>'
const languageSwitch='<div class="lvd-language-switch" data-no-translation><button type="button" data-language-toggle aria-label="Chuyển sang tiếng Đức"><img src="/assets/flags/vn.svg" width="20" height="14" alt=""><span>VI</span></button></div>';
const brand='<a class="brand" href="/#/" aria-label="Luật Việt Đức — Trang chủ"><span class="brand-mark" aria-hidden="true">L</span><span class="brand-name">Luật Việt Đức</span></a>'
export function transformFrontend(source){
 let html=source.replace(/assets\/bilingual\.js\?v=[^"']+/g,'assets/bilingual.js?v='+localeRevision).replace(/<meta http-equiv="Content-Security-Policy"[^>]+>/,'')
 html=html.replace(/<link[^>]+href="assets\/(?:steel-ui|color-theme|typography|editorial-cleanup|terms-alignment|interior-design|ui-details|footer-editorial|spacing-footer|topic-navigation|germany-details)\.css[^"]*"[^>]*>/g,'')
 html=html.replace(/<link[^>]+href="assets\/fonts\/[^"]+"[^>]*>/g,'')
 html=html.replace('<body>','<body class="lvd-redesign"><script type="application/json" id="lvd-public-navigation">'+JSON.stringify(navigation).replaceAll('<',String.fromCharCode(92)+'u003c')+'</script>')
 html=html.replace(/<header class="site-header">[\s\S]*?<\/header>/,`<header class="site-header"><div class="container header-inner">${brand}<nav class="desktop-nav" aria-label="Điều hướng chính">${primaryNavigation}</nav><div class="header-tools">${languageSwitch}<button class="icon-button search-open" data-dialog="search-dialog" aria-label="Mở tìm kiếm" aria-haspopup="dialog" aria-expanded="false"><span data-icon="search"></span></button><a class="button header-login" href="/tai-khoan" data-account-link data-no-translation><span data-account-label>Tài khoản</span> ${arrow}</a><button class="icon-button menu-button" data-dialog="menu-dialog" aria-label="Mở menu" aria-haspopup="dialog" aria-expanded="false"><span data-icon="menu"></span></button></div></div></header>`)
 html=html.replace(/<footer class="site-footer[\s\S]*?<\/footer>/,`<footer class="site-footer lvd-footer"><div class="container lvd-footer-inner"><div class="lvd-footer-main"><div class="lvd-footer-identity"><a class="lvd-footer-wordmark" href="/#/">Luật Việt Đức</a><p>Thông tin pháp luật Việt Nam – Đức.</p><div class="lvd-footer-social" id="live-social" aria-label="Mạng xã hội"></div></div>${footerNavigation}</div><div class="lvd-footer-bottom"><span data-site-version="${siteVersion}">© Luật Việt Đức. · v${siteVersion}</span>${languageSwitch}</div></div></footer>`)
 html=html.replace(/<nav class="dialog-links"[\s\S]*?<\/nav>/,`<nav class="dialog-links" aria-label="Menu"><a href="#/">Trang chủ</a>${primaryMenuNavigation}<a href="#/lien-he">Liên hệ</a><a href="/hoi-dap">Hỏi chuyên viên</a><a href="/tai-khoan" data-account-link data-no-translation><span data-account-label>Tài khoản</span></a></nav><div class="lvd-menu-language" role="group" aria-label="Ngôn ngữ / Sprache"><button data-language="vi" aria-pressed="true">Tiếng Việt</button><button data-language="de" aria-pressed="false">Deutsch</button></div>`)
 html=html.replace('<script src="assets/content.js','<script src="/live-bridge.js" defer></script>\n  <script src="assets/content.js')
 html=html.replace('<script src="assets/app.js','<script src="/legal-runtime.js" defer></script>\n  <script src="/editorial-ui.js" defer></script>\n  <script src="assets/app.js')
 html=html.replace('</head>','<link rel="preload" href="/fonts/Articulat-web.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/fonts/Inter-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/fonts/Inter-vietnamese.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" as="image" href="/media/legal-hero-stock-poster-v10.webp"><link rel="stylesheet" href="/design-system.css"><link rel="stylesheet" href="/live.css"><link rel="stylesheet" href="/editorial-ui.css"></head>')
 const phrases={
 'Pháp luật Việt Nam & Đức. Gần hơn, rõ hơn.':'Recht in Vietnam & Deutschland. Näher und klarer.',
 'Về chuyên trang':'Über das Portal','Đăng nhập':'Anmelden','Đặt câu hỏi':'Frage stellen','KẾT NỐI VỚI CHUYÊN VIÊN':'PERSÖNLICHER AUSTAUSCH',
 'Gửi câu hỏi':'Frage senden',
 'Trao đổi cùng chuyên viên':'Gespräch beginnen',
 'Chọn quốc gia, chia sẻ vấn đề và theo dõi phản hồi trong cùng hội thoại.':'Land wählen, Anliegen schildern und Antworten im selben Gespräch verfolgen.',
 'Thư viện':'Bibliothek','Chủ đề':'Themen','Hỗ trợ':'Hilfe','Nhân sự':'Team','Đăng nhập quản trị':'Verwaltung anmelden','Hộp thư chuyên viên':'Fachteam-Postfach','Kho kiến thức nội bộ':'Interne Wissensbasis','Kết nối hệ thống':'Systemverbindungen','Chuyên trang':'Über uns','Thông tin':'Informationen','Về Luật Việt Đức':'Über Luật Việt Đức','Tin tức & đời sống':'Nachrichten & Alltag',
 'Hỏi chuyên viên':'Fachperson fragen','Tài khoản của bạn':'Ihr Konto'
 };
 for(const [vi,de] of Object.entries(phrases))html=html.replaceAll('>'+vi+' <','>'+vi+'<').replaceAll('>'+vi+'<','><span data-no-translation data-shell-vi="'+vi.replace(/"/g,'&quot;')+'" data-shell-de="'+de.replace(/"/g,'&quot;')+'">'+vi+'</span><');
 return html.replace(/(src|href)="\/(design-system\.css|live\.css|editorial-ui\.css|live-bridge\.js|editorial-ui\.js|legal-runtime\.js)"/g, `$1="/$2?v=${revision}"`)
}

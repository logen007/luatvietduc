'use strict';
/* Public presentation. Content, jurisdiction data and chat remain in their modules. */
(() => {
  const E = window.LVD_EDITORIAL, C = window.LVD_CATALOG;
  if (!E || !C) return;
  const l = (vi, de) => window.LVD_I18N?.get() === 'de' ? de : vi;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const arrow = '<svg class="lvd-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>';
  const icon = n => window.LVD_ICON?.(n) || arrow;

  function partnerStrip() {
    // Reuse the original list rather than maintaining a second set of partner data.
    const template = document.createElement('template');
    template.innerHTML = window.LVD_FEATURES?.partnerSlider() || '';
    const logos = [...template.content.querySelectorAll('img')];
    if (!logos.length) return '';
    // Keep the white knockout inside each SVG, avoiding external CSS filter references on mobile.
    const group = clone => `<div class="pm-partner-group"${clone ? ' aria-hidden="true"' : ''}>${logos.map((img,index) => {
      const filterId=`lvd-logo-${clone?'copy':'original'}-${index}`;
      return `<svg class="pm-partner-logo" viewBox="0 0 220 60" width="140" height="38" role="img" aria-label="${clone?'':esc(img.alt)}" focusable="false" xmlns="http://www.w3.org/2000/svg"><defs><filter id="${filterId}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -.2126 -.7152 -.0722 0 1"/><feComponentTransfer><feFuncA type="linear" slope="1.1" intercept="-.05"/></feComponentTransfer><feComposite operator="in" in2="SourceGraphic"/></filter></defs><image href="${esc(img.getAttribute('src'))}" width="220" height="60" preserveAspectRatio="xMidYMid meet" filter="url(#${filterId})"/></svg>`;
    }).join('')}</div>`;
    return `<section class="pm-partners" aria-label="${l('Logo đối tác','Partnerlogos')}">
      <div class="container pm-partners-inner"><div class="pm-partner-marquee" tabindex="0" aria-label="${l('Logo đối tác','Partnerlogos')}"><div class="pm-partner-track">${group(false)}${group(true)}</div></div></div>
    </section>`;
  }

  const country = (code, path, title, titleDe, note, noteDe) => `<a href="#/phap-luat/${path}" class="pm-country">
    <img class="pm-country-flag" src="/assets/flags/${code}.svg" alt="" width="30" height="20">
    <div class="pm-country-copy"><h2>${l(title, titleDe)}</h2><p>${l(note, noteDe)}</p></div>${arrow}
  </a>`;

  const story = id => {
    const s = E.find(id);
    return s ? `<article class="press-card pm-story"><a class="press-image-link" href="#/tin/${s.id}" aria-label="${esc(s.title)}">${E.image(s.photo)}</a><div class="press-copy">${E.tag(s)}<h3><a href="#/tin/${s.id}">${esc(s.title)}</a></h3><a class="lvd-link pm-story-read" href="#/tin/${s.id}">${l('Đọc bài viết','Beitrag lesen')} ${arrow}</a></div></article>` : '';
  };

  const homeInsights = () => {
    const groups = window.LVD_CATALOG_SOURCE?.groups || [];
    const total = groups.reduce((sum, group) => sum + group.titles.length, 0);
    const number = value => new Intl.NumberFormat(window.LVD_I18N?.get() === 'de' ? 'de-DE' : 'vi-VN').format(value);
    return `<section class="pm-home-metrics" aria-label="${l('Thư viện Luật Việt Đức','Die Rechtsbibliothek')}"><div class="container pm-metrics-grid">
      <div><strong>02</strong><span>${l('Việt Nam & Đức','Vietnam & Deutschland')}</span></div>
      <div><strong>${number(groups.length)}</strong><span>${l('Lĩnh vực pháp luật','Rechtsgebiete')}</span></div>
      <div><strong>${number(total)}</strong><span>${l('Chủ đề trong thư viện','Themen in der Bibliothek')}</span></div>
    </div></section>`;
  };
  const homeTopicMap = () => {
    const items = [
      ['Kết hôn','Heiraten','hon-nhan-gia-dinh',24,18,'large'],
      ['Quốc tịch','Staatsangehörigkeit','quoc-tich',62,15,'large'],
      ['Giấy tờ cá nhân','Persönliche Dokumente','giay-to-tuy-than',85,34,'small'],
      ['Mua bán nhà đất','Immobilien kaufen','nha-o-dat-dai',15,39,'small'],
      ['Cư trú tại Đức','Aufenthalt in Deutschland','xuat-nhap-canh-cu-tru',38,42,'large'],
      ['Hợp đồng','Verträge','hop-dong-giao-dich-dan-su',77,59,'large'],
      ['Thừa kế','Erben','thua-ke',15,77,'small'],
      ['Đi làm','Arbeiten','lao-dong-viec-lam-bhxh',33,86,'small'],
      ['Khai sinh cho con','Geburt eines Kindes','khai-sinh-ho-tich-giam-ho',56,79,'medium'],
      ['Kinh doanh','Unternehmen gründen','dau-tu-kinh-doanh-thuong-mai',82,87,'small'],
      ['Thuế','Steuern','thue',91,68,'small']
    ];
    return `<section class="pm-topic-map" aria-labelledby="pm-topic-map-title"><div class="container"><header><h2 id="pm-topic-map-title">${l('Pháp luật trong đời sống','Recht im Alltag')}</h2></header><div class="pm-topic-network">
      <svg class="pm-network-lines" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">${items.map(item => `<path d="M500 260 L${item[3]*10} ${item[4]*5}"/>`).join('')}</svg>
      <span class="pm-network-hub" aria-hidden="true"><i></i><span>Luật Việt Đức</span></span>
      ${items.map(([vi,de,id,x,y,size]) => `<a class="pm-network-node pm-network-node--${size}" style="--node-x:${x}%;--node-y:${y}%" href="#/chu-de/${id}"><span>${l(vi,de)}</span><span class="pm-network-arrow" aria-hidden="true">↗</span></a>`).join('')}
    </div></div></section>`;
  };
  E.home = () => `<section class="pm-hero" aria-labelledby="pm-title">
    <video class="pm-hero-video" muted loop playsinline preload="none" poster="/media/legal-hero-montage-poster-v2.webp" aria-hidden="true" tabindex="-1"><source data-src="/media/legal-hero-montage-v2.mp4" type="video/mp4"></video>
    <button class="pm-video-toggle" type="button" aria-label="${l('Tạm dừng video','Video anhalten')}" aria-pressed="false"><svg class="pm-video-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg><svg class="pm-video-play" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg></button>
    <div class="container pm-hero-inner"><div class="pm-hero-copy">
      <h1 id="pm-title">${l('Giải đáp pháp luật <br>Việt Nam và Đức.','Recht in Vietnam <br>und Deutschland.')}</h1>
      <p class="pm-hero-description">${l('Từ cư trú, quốc tịch đến các vấn đề về gia đình, tài&nbsp;sản và công việc.','Von Aufenthalt und Staatsangehörigkeit bis zu Familie, Eigentum und Arbeit.')}</p>
      <form id="home-ask" class="pm-ask ask-box"><label class="sr-only" for="home-question">${l('Bạn cần làm rõ vấn đề gì?','Was möchten Sie klären?')}</label><div class="pm-ask-row"><textarea id="home-question" name="question" maxlength="2000" required placeholder="${l('Bạn cần làm rõ vấn đề gì?','Was möchten Sie klären?')}" rows="1"></textarea><button class="button" type="submit" aria-label="${l('Gửi câu hỏi','Frage senden')}">${l('Gửi câu hỏi','Frage senden')} ${arrow}</button></div></form>
      <div class="pm-hero-links"><a href="#/tra-cuu">${l('Thư viện pháp luật','Rechtsbibliothek')} ${arrow}</a></div>
    </div></div>${partnerStrip()}
  </section>
  <section class="pm-countries container" aria-label="${l('Thư viện pháp luật','Rechtsbibliotheken')}">
    ${country('vn','viet-nam','Pháp luật Việt Nam','Vietnamesisches Recht','16 lĩnh vực · 303 chủ đề','16 Rechtsgebiete · 303 Themen')}
    ${country('de','duc','Pháp luật Đức','Deutsches Recht','16 lĩnh vực','16 Rechtsgebiete')}
  </section>
  ${homeInsights()}
  <section class="pm-news chat-news"><div class="container">
    <div class="pm-section-head"><h2>${l('Tin tức & đời sống','Nachrichten & Alltag')}</h2><a href="#/tin-tuc" class="lvd-link">${l('Xem tất cả tin tức','Alle Nachrichten')} ${arrow}</a></div>
    <div class="pm-news-grid press-grid">${['mindestlohn-2026','kindergeld-2026','deutschlandticket-2027'].map(story).join('')}</div>
  </div></section>
  ${homeTopicMap()}
  <section class="pm-fields"><div class="container">
    <div class="pm-section-head"><h2>${l('Chủ đề đang được quan tâm','Themen im Fokus')}</h2><a class="lvd-link" href="#/tra-cuu">${l('Xem tất cả lĩnh vực','Alle Rechtsgebiete')} ${arrow}</a></div>
    <div class="pm-fields-grid">${C.featuredGroups.map(g => `<a href="#/chu-de/${g.id}"><span class="pm-field-icon">${icon(g.icon || 'book')}</span><h3>${esc(window.LVD_I18N.groupTitle(g.title))}</h3><span class="pm-field-bottom"><span class="pm-topic-stat"><b class="pm-topic-number">${g.count}</b><span class="pm-topic-unit">${l('chủ đề','Themen')}</span></span>${arrow}</span></a>`).join('')}</div>
  </div></section>`;

  let videoChoice = null;
  let heroObserver = null;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function syncVideo() {
    const video = document.querySelector('.pm-hero-video');
    if (!video) { heroObserver?.disconnect(); heroObserver=null; return; }
    const button = document.querySelector('.pm-video-toggle');
    const update = () => {
      button?.setAttribute('aria-pressed', String(video.paused));
      button?.setAttribute('aria-label', video.paused ? l('Phát video','Video abspielen') : l('Tạm dừng video','Video anhalten'));
    };
    if (!video.dataset.heroReady) {
      video.dataset.heroReady = 'true';
      video.muted = true;
      video.addEventListener('play', update);
      video.addEventListener('pause', update);
      button?.addEventListener('click', () => { videoChoice = video.paused ? 'play' : 'pause'; syncVideo(); });
      heroObserver?.disconnect();
      if('IntersectionObserver' in window){
        heroObserver=new IntersectionObserver(([entry])=>{video.dataset.heroVisible=String(entry.isIntersecting);syncVideo();},{threshold:0});
        heroObserver.observe(video);
      }
    }
    const paused = videoChoice === 'pause' || video.dataset.heroVisible==='false' || ((reducedMotion.matches || navigator.connection?.saveData) && videoChoice !== 'play') || document.hidden;
    video.autoplay = !paused;
    if (paused) video.pause();
    else {
      const source=video.querySelector('source[data-src]');
      if(source){source.src=source.dataset.src;source.removeAttribute('data-src');video.load();}
      video.play().catch(update);
    }
    update();
  }

  function topicCounts() {
    document.querySelectorAll('.catalog-group-body>small').forEach(el => {
      if (el.querySelector('.pm-topic-number')) return;
      const match = el.textContent.trim().match(/^(\d+)\s+(.+)$/);
      if (!match) return;
      el.dataset.noTranslation = '';
      el.innerHTML = `<b class="pm-topic-number">${match[1]}</b><span class="pm-topic-unit">${esc(match[2])}</span>`;
    });
  }

  function decorate() {
    const [path, query = ''] = (location.hash.slice(1) || '/').split('?');
    const filteredGroup = new URLSearchParams(query).get('linh-vuc');
    document.body.classList.toggle('pm-home', path === '/');
    document.body.classList.toggle('pm-country-root', !filteredGroup && (/^\/phap-luat\/(duc|viet-nam)\/?$/.test(path) || path === '/tra-cuu'));
    document.body.classList.toggle('pm-article', /^\/(tin|bai-viet)\//.test(path));
    document.body.classList.toggle('pm-newsroom', path === '/tin-tuc');
    document.querySelectorAll('.desktop-nav a').forEach(a => {
      if (a.dataset.nav === 'about') {
        if (path === '/ve-chuyen-trang') a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      }
    });
    topicCounts();
    syncVideo();
  }
  function shellLanguage() {
    const de = window.LVD_I18N?.get() === 'de';
    document.querySelectorAll('[data-shell-vi]').forEach(el => { el.textContent = de ? el.dataset.shellDe : el.dataset.shellVi; });
  }
  let scrolled=null;
  function scrollState() { const next=scrollY>80;if(next!==scrolled){scrolled=next;document.body.classList.toggle('pm-scrolled',next);} }
  document.addEventListener('DOMContentLoaded', () => {
    decorate(); scrollState(); shellLanguage();
    const main = document.getElementById('main');
    if (main) new MutationObserver(() => { topicCounts(); syncVideo(); }).observe(main, {childList:true});
  });
  window.addEventListener('hashchange', () => queueMicrotask(() => { decorate(); scrollState(); shellLanguage(); }));
  document.addEventListener('lvd:languagechange', shellLanguage);
  document.addEventListener('visibilitychange', syncVideo);
  reducedMotion.addEventListener('change', syncVideo);
  navigator.connection?.addEventListener('change',syncVideo);
  window.addEventListener('scroll', scrollState, {passive:true});
  decorate();
})();

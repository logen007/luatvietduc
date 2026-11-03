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
    const group = clone => `<div class="pm-partner-group"${clone ? ' aria-hidden="true"' : ''}>${logos.map(img =>
      `<img src="${esc(img.getAttribute('src'))}" alt="${clone ? '' : esc(img.alt)}" loading="eager" decoding="async" draggable="false" referrerpolicy="no-referrer">`
    ).join('')}</div>`;
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

  E.home = () => `<section class="pm-hero" aria-labelledby="pm-title">
    <video class="pm-hero-video" muted loop playsinline preload="metadata" poster="/media/legal-hero-montage-poster-v2.webp" aria-hidden="true" tabindex="-1"><source src="/media/legal-hero-montage-v2.mp4" type="video/mp4"></video>
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
  <section class="pm-news chat-news"><div class="container">
    <div class="pm-section-head"><h2>${l('Tin tức & đời sống','Nachrichten & Alltag')}</h2><a href="#/tin-tuc" class="lvd-link">${l('Xem tất cả tin tức','Alle Nachrichten')} ${arrow}</a></div>
    <div class="pm-news-grid press-grid">${['mindestlohn-2026','kindergeld-2026','deutschlandticket-2027'].map(story).join('')}</div>
  </div></section>
  <section class="pm-fields"><div class="container">
    <div class="pm-section-head"><h2>${l('Chủ đề đang được quan tâm','Themen im Fokus')}</h2><a class="lvd-link" href="#/tra-cuu">${l('Xem tất cả lĩnh vực','Alle Rechtsgebiete')} ${arrow}</a></div>
    <div class="pm-fields-grid">${C.featuredGroups.map(g => `<a href="#/chu-de/${g.id}"><span class="pm-field-icon">${icon(g.icon || 'book')}</span><h3>${esc(window.LVD_I18N.groupTitle(g.title))}</h3><span class="pm-field-bottom"><span class="pm-topic-stat"><b class="pm-topic-number">${g.count}</b><span class="pm-topic-unit">${l('chủ đề','Themen')}</span></span>${arrow}</span></a>`).join('')}</div>
  </div></section>`;

  let videoChoice = null;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function syncVideo() {
    const video = document.querySelector('.pm-hero-video');
    if (!video) return;
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
    }
    const paused = videoChoice === 'pause' || ((reducedMotion.matches || navigator.connection?.saveData) && videoChoice !== 'play') || document.hidden;
    video.autoplay = !paused;
    if (paused) video.pause();
    else video.play().catch(update);
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
  function scrollState() { document.body.classList.toggle('pm-scrolled', scrollY > 80); }
  document.addEventListener('DOMContentLoaded', () => {
    decorate(); scrollState(); shellLanguage();
    const main = document.getElementById('main');
    if (main) new MutationObserver(() => { topicCounts(); syncVideo(); }).observe(main, {childList:true});
  });
  window.addEventListener('hashchange', () => queueMicrotask(() => { decorate(); scrollState(); shellLanguage(); }));
  document.addEventListener('lvd:languagechange', shellLanguage);
  document.addEventListener('visibilitychange', syncVideo);
  reducedMotion.addEventListener('change', syncVideo);
  window.addEventListener('scroll', scrollState, {passive:true});
  decorate();
})();

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
    initTopicNetwork();
  }
  function shellLanguage() {
    const de = window.LVD_I18N?.get() === 'de';
    document.querySelectorAll('[data-language-toggle]').forEach(button => {
      button.setAttribute('aria-label', de ? 'Zu Vietnamesisch wechseln' : 'Chuyển sang tiếng Đức');
      button.querySelector('img').src = '/assets/flags/' + (de ? 'de' : 'vn') + '.svg';
      const label = button.querySelector('span');
      if (label.textContent !== (de ? 'DE' : 'VI')) label.textContent = de ? 'DE' : 'VI';
    });
    document.querySelectorAll('[data-shell-vi]').forEach(el => { el.textContent = de ? el.dataset.shellDe : el.dataset.shellVi; });
  }
  let scrolled=null;
  function scrollState() { const hero=document.querySelector('.pm-hero, .live-reading-hero'),header=document.querySelector('.site-header');const next=Boolean(hero&&header&&hero.getBoundingClientRect().bottom<=header.getBoundingClientRect().bottom+48);if(next!==scrolled){scrolled=next;document.body.classList.toggle('pm-scrolled',next);} }
  document.addEventListener('DOMContentLoaded', () => {
    decorate(); scrollState(); shellLanguage();
    const main = document.getElementById('main');
    if (main) new MutationObserver(() => { topicCounts(); syncVideo(); initTopicNetwork(); }).observe(main, {childList:true});
  });
  window.addEventListener('hashchange', () => queueMicrotask(() => { decorate(); scrollState(); shellLanguage(); }));
  document.addEventListener('click', event => {
    if (event.target.closest('[data-language-toggle]')) window.LVD_I18N?.set(window.LVD_I18N.get() === 'de' ? 'vi' : 'de');
  });
  document.addEventListener('lvd:languagechange', shellLanguage);
  document.addEventListener('visibilitychange', syncVideo);
  reducedMotion.addEventListener('change', syncVideo);
  navigator.connection?.addEventListener('change',syncVideo);
  window.addEventListener('scroll', scrollState, {passive:true});
  window.addEventListener('resize', scrollState, {passive:true});
  decorate();
})();

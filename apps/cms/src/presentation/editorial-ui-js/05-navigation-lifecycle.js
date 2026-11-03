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

'use strict';
/* Luật Việt Đức 0.8.0 — layout aligned with the live Terms reference.
   All articles, catalogue data and question handling remain the existing sources. */
(() => {
  const E = window.LVD_EDITORIAL;
  const C = window.LVD_CATALOG;
  if (!E || !C) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => window.LVD_ICON?.(name) || '';
  const href = story => `#/${story.type === 'news' ? 'tin' : story.type === 'qa' ? 'hoi-dap' : 'bai-viet'}/${story.id}`;
  function card(id, variant = '') {
    const story = E.find(id);
    if (!story) return '';
    return `<article class="s-story ${variant} press-card"><a class="s-story-image press-image-link" href="${href(story)}" aria-label="${esc(story.title)}">${E.image(story.photo)}</a><div class="s-story-copy">${E.tag(story)}<h3><a href="${href(story)}">${esc(story.title)}</a></h3>${variant === 's-lead' ? `<p>${esc(story.summary)}</p>` : ''}<span class="s-story-source">${esc(story.sourceName)}</span></div></article>`;
  }
  const featureHead = (title, description, name, link = '', linkText = '') => `<header class="t-feature-head"><div><h2>${title}</h2><p>${description}</p></div>${link ? `<a class="t-feature-action" href="${link}"><span>${linkText}</span>${icon('arrow')}</a>` : `<span class="t-feature-symbol" aria-hidden="true">${icon(name)}</span>`}</header>`;
  E.home = () => `<section class="s-hero chat-hero t-hero">
    <div class="container t-hero-inner"><div class="s-hero-copy">
      <span class="s-eyebrow">VIỆT NAM ↔ ĐỨC</span>
      <h1><span>Hỏi đáp pháp luật.</span><span>Tra cứu theo vấn đề.</span><strong>Cho người Việt tại Đức.</strong></h1>
      <div class="t-hero-actions"><button type="button" class="button t-hero-primary" data-home-compose>Đặt câu hỏi</button><a class="button t-hero-secondary" href="#/tra-cuu">Khám phá thư viện ${icon('arrow')}</a></div>
    </div></div>
  </section>
  <div class="container t-sections">
    <section class="t-feature t-composer-feature" aria-labelledby="home-ask-title">
      ${featureHead('Hỏi đáp pháp luật', 'Bắt đầu từ vấn đề bạn cần tìm hiểu.', 'chat')}
      <div class="t-composer-body"><h3 id="home-ask-title">Bạn cần tìm hiểu điều gì?</h3>
        <div class="s-ask-panel"><form id="home-ask" class="ask-box"><label for="home-question" class="sr-only">Câu hỏi pháp luật</label><textarea id="home-question" name="question" maxlength="2000" required placeholder="Nhập câu hỏi hoặc mô tả tình huống của bạn…"></textarea><div class="ask-bottom"><a class="ask-library" href="#/tra-cuu">${icon('book')} Tra cứu thư viện</a><button class="button" type="submit">Gửi câu hỏi ${icon('arrow')}</button></div></form></div>
        <nav class="s-topic-rail" aria-label="Gợi ý câu hỏi"><div class="s-topic-links">${C.promptTopics.map(([label,id]) => `<button type="button" data-ask-example="${esc(C.getTopic(id).title)}">${esc(label)}</button>`).join('')}</div></nav>
      </div>
    </section>
    <section class="t-feature s-library">
      ${featureHead('Thư viện pháp luật Việt Nam', '16 lĩnh vực · 303 chủ đề', 'book', '#/tra-cuu', 'Xem tất cả')}
      <div class="t-library-body"><div class="s-library-links">${C.featuredGroups.map(g => `<a href="#/chu-de/${g.id}" data-home-group="${g.id}"><span class="t-home-group-icon" aria-hidden="true">${icon(g.icon)}</span><span>${esc(g.title)}<small class="catalog-home-count">${g.count} chủ đề</small></span></a>`).join('')}</div></div>
    </section>
    <section class="t-feature s-news-section chat-news">
      ${featureHead('Tin pháp luật', 'Chính sách và quy định dành cho người Việt tại Đức.', 'news', '#/tin-tuc', 'Tất cả bài viết')}
      <div class="t-news-body"><div class="s-news-grid">${card('mindestlohn-2026','s-lead')}<div class="s-side-stories">${card('kindergeld-2026','s-side')}${card('deutschlandticket-2027','s-side')}</div></div></div>
    </section>
    <section class="t-feature s-guides-section chat-news">
      ${featureHead('Cuộc sống tại Đức', 'Giấy tờ, học tập và những điều cần biết.', 'compass', '#/song-o-duc', 'Tất cả cẩm nang')}
      <div class="t-guides-body"><div class="s-guides-grid">${['anmeldung-berlin','anh-so-the-cu-tru','tim-ausbildung','dong-xuan-berlin'].map(id => card(id)).join('')}</div></div>
    </section>
  </div>`;
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-home-compose]')) return;
    const field = document.getElementById('home-question');
    if (!field) return;
    field.focus({preventScroll:true});
    field.closest('.t-composer-feature').scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
  });
  function decorate() { document.body.classList.toggle('s-home', ['', '#/', '#'].includes(location.hash)); }
  document.addEventListener('DOMContentLoaded', decorate);
  window.addEventListener('hashchange', decorate);
})();

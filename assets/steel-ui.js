'use strict';
/* Original Luat Viet Duc presentation, informed by the user's Steel reference.
   Existing chat, content, account and form behavior is intentionally unchanged. */
(() => {
  const E = window.LVD_EDITORIAL;
  const K = window.LVD_CONTENT;
  if (!E || !K) return;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>';
  const up = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
  const destination = story => `#/${story.type === 'news' ? 'tin' : story.type === 'qa' ? 'hoi-dap' : 'bai-viet'}/${story.id}`;
  const topics = window.LVD_CATALOG.promptTopics.map(([label,id])=>[label,window.LVD_CATALOG.getTopic(id).title]);
  function card(id, variant='') {
    const story=E.find(id);
    if(!story) return '';
    return `<article class="s-story ${variant} press-card"><a class="s-story-image press-image-link" href="${destination(story)}" aria-label="${escape(story.title)}">${E.image(story.photo)}</a><div class="s-story-copy">${E.tag(story)}<h3><a href="${destination(story)}">${escape(story.title)}</a></h3>${variant==='s-lead'?`<p>${escape(story.summary)}</p>`:''}<span class="s-story-source">${escape(story.sourceName)}</span></div></article>`;
  }
  E.home = () => `<section class="s-hero chat-hero">
    <div class="container s-hero-grid">
      <div class="s-hero-copy"><span class="s-eyebrow">VIỆT NAM ↔ ĐỨC</span><h1>Hỏi đáp pháp luật<br>cho người Việt<br>tại Đức.</h1><p>Tra cứu các vấn đề pháp luật tại Việt Nam.</p></div>
      <div class="s-ask-panel"><div class="s-panel-top"><span class="s-panel-dot" aria-hidden="true"></span><span>HỎI ĐÁP PHÁP LUẬT</span><span class="s-panel-index" aria-hidden="true">01</span></div>
        <form id="home-ask" class="ask-box"><label for="home-question" class="sr-only">Câu hỏi pháp luật</label><textarea id="home-question" name="question" maxlength="2000" required placeholder="Bạn cần tìm hiểu vấn đề gì?"></textarea><div class="ask-bottom"><a class="ask-library" href="#/tra-cuu">Tra cứu thư viện ${arrow}</a><button class="button" type="submit">Gửi câu hỏi ${up}</button></div></form>
      </div>
    </div>
    <nav class="container s-topic-rail" aria-label="Lĩnh vực hỏi đáp"><div class="s-topic-links">${topics.map(([label,q])=>`<button type="button" data-ask-example="${escape(q)}"><span>${label}</span>${arrow}</button>`).join('')}</div></nav>
  </section>
  <div class="container s-main">
    <section class="s-news-section chat-news"><div class="s-section-head"><div><span class="s-eyebrow">01 / TIN PHÁP LUẬT</span><h2>Chính sách & quy định</h2></div><a class="s-all" href="#/tin-tuc">Tất cả bài viết ${arrow}</a></div><div class="s-news-grid">${card('mindestlohn-2026','s-lead')}<div class="s-side-stories">${card('kindergeld-2026','s-side')}${card('deutschlandticket-2027','s-side')}</div></div></section>
  </div>
  <section class="s-library"><div class="container s-library-inner"><div class="s-library-intro"><span class="s-eyebrow">02 / THƯ VIỆN</span><h2>Thư viện<br>pháp luật Việt Nam.</h2><p class="catalog-library-total">16 lĩnh vực · 303 chủ đề</p><a class="s-all" href="#/tra-cuu">Xem tất cả lĩnh vực ${arrow}</a></div><div class="s-library-links">${window.LVD_CATALOG.featuredGroups.map(({id,title:label,count},i)=>`<a href="#/chu-de/${id}"><span class="s-topic-number">${String(i+1).padStart(2,'0')}</span><span>${escape(label)}<small class="catalog-home-count">${count} chủ đề</small></span>${arrow}</a>`).join('')}</div></div></section>
  <div class="container s-main"><section class="s-guides-section chat-news"><div class="s-section-head"><div><span class="s-eyebrow">03 / CẨM NANG</span><h2>Cuộc sống tại Đức</h2></div><a class="s-all" href="#/song-o-duc">Tất cả cẩm nang ${arrow}</a></div><div class="s-guides-grid">${['anmeldung-berlin','anh-so-the-cu-tru','tim-ausbildung','dong-xuan-berlin'].map(id=>card(id)).join('')}</div></section></div>`;

  function decorate(){
    const isHome=['','#/','#'].includes(location.hash);
    document.body.classList.toggle('s-home',isHome);
    const footer=document.querySelector('.site-footer .container');
    if(footer&&!footer.querySelector('.s-footer-wordmark')){
      const mark=document.createElement('a');mark.href='#/';mark.className='s-footer-wordmark';
      mark.textContent='luật việt đức';mark.setAttribute('aria-label','Luật Việt Đức — Trang chủ');footer.append(mark);
    }
  }
  document.addEventListener('DOMContentLoaded',decorate);
  window.addEventListener('hashchange',decorate);
})();

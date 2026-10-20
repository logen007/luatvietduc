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
  const topics = [
    ['Ủy quyền','Tôi muốn ủy quyền từ Đức'],
    ['Cư trú','Tôi cần hỏi về giấy phép cư trú tại Đức'],
    ['Lao động','Tôi cần hỏi về hợp đồng lao động tại Đức'],
    ['Gia đình','Tôi cần hỏi về thủ tục hộ tịch'],
    ['Nhà đất','Tôi cần hỏi về nhà đất tại Việt Nam'],
    ['Thừa kế','Tôi có tài sản thừa kế tại Việt Nam']
  ];
  function architecture() {
    // New vector geometry: deliberately not a copied Steel image or brand asset.
    const points = [[380,30,180,15],[720,70,100,210],[890,265,165,-25],[420,380,240,110]];
    const frames = points.map(([x,y,w,h]) => Array.from({length:11},(_,i) => {
      const t=i/10, sx=x+(605-x)*t*.68, sy=y+(225-y)*t*.68;
      const width=w*(1-t*.66), height=(h||120)*(1-t*.5);
      return `<path d="M${sx} ${sy}l${width} ${height*.25}l${width*.22} ${110*(1-t*.55)}l${-width} ${-height*.25}z"/>`;
    }).join('')).join('');
    return `<svg class="s-architecture" viewBox="0 0 1100 600" fill="none" aria-hidden="true"><g>${frames}</g></svg>`;
  }
  function card(id, variant='') {
    const story=E.find(id);
    if(!story) return '';
    return `<article class="s-story ${variant} press-card"><a class="s-story-image press-image-link" href="${destination(story)}" aria-label="${escape(story.title)}">${E.image(story.photo)}</a><div class="s-story-copy">${E.tag(story)}<h3><a href="${destination(story)}">${escape(story.title)}</a></h3>${variant==='s-lead'?`<p>${escape(story.summary)}</p>`:''}<span class="s-story-source">${escape(story.sourceName)}</span></div></article>`;
  }
  E.home = () => `<section class="s-hero chat-hero">
    ${architecture()}
    <div class="container s-hero-grid">
      <div class="s-hero-copy"><span class="s-eyebrow">VIỆT NAM ↔ ĐỨC</span><h1>Hỏi đáp pháp luật<br>cho người Việt<br>tại Đức.</h1><p>Tra cứu quy định, thủ tục tại Việt Nam và Đức.</p></div>
      <div class="s-ask-panel"><div class="s-panel-top"><span class="s-panel-dot" aria-hidden="true"></span><span>HỎI ĐÁP PHÁP LUẬT</span><span class="s-panel-index" aria-hidden="true">01</span></div>
        <form id="home-ask" class="ask-box"><label for="home-question" class="sr-only">Câu hỏi pháp luật</label><textarea id="home-question" name="question" maxlength="2000" required placeholder="Bạn cần tìm hiểu vấn đề gì?"></textarea><div class="ask-bottom"><a class="ask-library" href="#/tra-cuu">Tra cứu thư viện ${arrow}</a><button class="button" type="submit">Gửi câu hỏi ${up}</button></div></form>
      </div>
    </div>
    <nav class="container s-topic-rail" aria-label="Lĩnh vực hỏi đáp"><div class="s-topic-links">${topics.map(([label,q])=>`<button type="button" data-ask-example="${escape(q)}"><span>${label}</span>${arrow}</button>`).join('')}</div></nav>
  </section>
  <div class="container s-main">
    <section class="s-news-section chat-news"><div class="s-section-head"><div><span class="s-eyebrow">01 / TIN PHÁP LUẬT</span><h2>Chính sách & quy định</h2></div><a class="s-all" href="#/tin-tuc">Tất cả bài viết ${arrow}</a></div><div class="s-news-grid">${card('mindestlohn-2026','s-lead')}<div class="s-side-stories">${card('kindergeld-2026','s-side')}${card('deutschlandticket-2027','s-side')}</div></div></section>
  </div>
  <section class="s-library"><div class="container s-library-inner"><div class="s-library-intro"><span class="s-eyebrow">02 / THƯ VIỆN</span><h2>Tìm theo<br>lĩnh vực pháp luật.</h2><a class="s-all" href="#/tra-cuu">Mở thư viện ${arrow}</a></div><div class="s-library-links">${K.topics.map(([id,label],i)=>`<a href="#/chu-de/${id}"><span class="s-topic-number">${String(i+1).padStart(2,'0')}</span><span>${escape(label)}</span>${arrow}</a>`).join('')}</div></div></section>
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

// Compatibility for bookmarked hash URLs. Native pages own rendering; the
// retained legacy renderer below stays inactive without its original globals.
(()=>{
 if(!document.documentElement.hasAttribute('data-lvd-native'))return;
 const redirect=async()=>{if(!location.hash.startsWith('#/'))return;const {legacyTarget}=await import('/public-shell.mjs');const target=legacyTarget(location.hash);if(target)location.replace(target);};
 window.addEventListener('hashchange',()=>void redirect().catch(()=>{}));
 void redirect().catch(()=>{});
})();
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
      ${items.map(([vi,de,id,x,y,size]) => `<a class="pm-network-node pm-network-node--${size}" style="--node-x:${x}%;--node-y:${y}%" href="#/chu-de/${id}"><span>${l(vi,de)}</span><span class="pm-network-arrow" aria-hidden="true">↗</span></a>`).join('')}
    </div></div></section>`;
  };
  let disposeTopicNetwork = null;
  let currentTopicNetwork = null;
  function initTopicNetwork() {
    const root = document.querySelector('.pm-topic-network');
    if (root === currentTopicNetwork) return;
    disposeTopicNetwork?.();
    currentTopicNetwork = root;
    disposeTopicNetwork = null;
    if (!root) return;
    const nodes = [...root.querySelectorAll('.pm-network-node')];
    const svg = root.querySelector('.pm-network-lines');
    const paths = [...svg.querySelectorAll('path')];
    const mobile = matchMedia('(max-width: 600px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, bounds, pointer = null, visible = false, frame = 0, previous = 0, elapsed = 0;
    let focus = null, driftFocus = null, entered = 0, disposed = false;
    const entries = nodes.map(node => ({node, x:parseFloat(node.style.getPropertyValue('--node-x'))/100, y:parseFloat(node.style.getPropertyValue('--node-y'))/100, leanX:{value:0,velocity:0}, leanY:{value:0,velocity:0},w:0,h:0}));
    const spring = (state, target, rate, dt) => {
      const distance = state.value-target;
      const momentum = state.velocity+rate*distance;
      const decay = Math.exp(-rate*dt);
      state.value = target+(distance+momentum*dt)*decay;
      state.velocity = (state.velocity-rate*momentum*dt)*decay;
      return state.value;
    };
    function measure() {
      bounds=root.getBoundingClientRect();width=root.clientWidth;height=root.clientHeight;
      svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
      entries.forEach(item=>{item.w=item.node.offsetWidth;item.h=item.node.offsetHeight;});
    }
    function render(now) {
      frame=0;
      if(disposed||!visible||document.hidden||mobile.matches)return;
      const dt=previous?Math.min((now-previous)/1000,.05):0;
      previous=now;elapsed+=dt;
      const target=pointer||{x:width/2,y:height/2};
      if(!focus)focus={x:{value:target.x,velocity:0},y:{value:target.y,velocity:0}};
      if(!driftFocus)driftFocus={x:{value:target.x,velocity:0},y:{value:target.y,velocity:0}};
      const fx=spring(focus.x,target.x,1.58/.38,dt),fy=spring(focus.y,target.y,1.58/.38,dt);
      const px=spring(driftFocus.x,target.x,39.5,dt),py=spring(driftFocus.y,target.y,39.5,dt);
      entered+=(Number(Boolean(pointer))-entered)*Math.min(1,dt*19.75);
      const still=motion.matches;
      const centerX=width/2+(still?0:14*(.8*Math.sin(.9*elapsed)+.2*Math.sin(2.1*elapsed+1.3)));
      const centerY=height*.52+(still?0:14*(.6*Math.sin(.7*elapsed+2.1)+.15*Math.sin(1.7*elapsed)));
      entries.forEach((item,index)=>{
        let x=item.x*width+(still?0:Math.sin(1.1*elapsed*.35+index*2.39996)*11),y=item.y*height;
        const distance=Math.hypot(x-fx,y-fy);
        const attention=still?1:Math.exp(-Math.pow(distance/220,2));
        const scale=still?1:(16+17*attention)/33;
        const dx=px-x,dy=py-y,away=Math.hypot(dx,dy)||1;
        const proximity=still?0:entered*Math.exp(-Math.pow(Math.hypot(Math.max(0,Math.abs(dx)-item.w*scale/2),Math.max(0,Math.abs(dy)-item.h*scale/2))/96,2));
        const pull=Math.min(20,away*.15)*proximity;
        x+=spring(item.leanX,dx/away*pull,4740/320,dt);
        y+=spring(item.leanY,dy/away*pull,4740/320,dt);
        x=Math.max(item.w*scale/2+8,Math.min(width-item.w*scale/2-8,x));
        y=Math.max(item.h*scale/2+8,Math.min(height-item.h*scale/2-8,y));
        const focused=item.node.matches(':focus-visible');
        item.node.style.left=x+'px';item.node.style.top=y+'px';
        item.node.style.transform=`translate(-50%,-50%) scale(${focused?1:scale})`;
        item.node.style.opacity=focused?'1':String(still?1:.36+.64*attention);
        const lineX=x-centerX,lineY=y-centerY,length=Math.hypot(lineX,lineY)||1;
        const ux=lineX/length,uy=lineY/length;
        const gap=Math.min(ux?(item.w*scale/2+6)/Math.abs(ux):Infinity,uy?(item.h*scale/2+6)/Math.abs(uy):Infinity);
        paths[index].setAttribute('d',gap>=length?'':`M${centerX.toFixed(1)} ${centerY.toFixed(1)}L${(x-ux*gap).toFixed(1)} ${(y-uy*gap).toFixed(1)}`);
      });
      if(!still)frame=requestAnimationFrame(render);
    }
    function start(){if(!frame&&!disposed&&visible&&!document.hidden&&!mobile.matches){previous=0;frame=requestAnimationFrame(render);}}
    function stop(){cancelAnimationFrame(frame);frame=0;previous=0;}
    function change(){stop();measure();if(mobile.matches)entries.forEach(({node})=>{node.style.removeProperty('left');node.style.removeProperty('top');node.style.removeProperty('transform');node.style.removeProperty('opacity');});else start();}
    function move(event){if(event.pointerType==='touch')return;pointer={x:event.clientX-bounds.left,y:event.clientY-bounds.top};start();}
    function leave(){pointer=null;start();}
    function scroll(){bounds=root.getBoundingClientRect();}
    function visibility(){if(document.hidden)stop();else start();}
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)start();else stop();});
    const resize=new ResizeObserver(change);
    root.addEventListener('pointermove',move);root.addEventListener('pointerleave',leave);root.addEventListener('focusin',start);
    window.addEventListener('scroll',scroll,{passive:true});document.addEventListener('visibilitychange',visibility);
    mobile.addEventListener('change',change);motion.addEventListener('change',change);
    measure();observer.observe(root);resize.observe(root);document.fonts?.ready.then(()=>{if(!disposed)change();});
    disposeTopicNetwork=()=>{disposed=true;stop();observer.disconnect();resize.disconnect();root.removeEventListener('pointermove',move);root.removeEventListener('pointerleave',leave);root.removeEventListener('focusin',start);window.removeEventListener('scroll',scroll);document.removeEventListener('visibilitychange',visibility);mobile.removeEventListener('change',change);motion.removeEventListener('change',change);};
  }
  E.home = () => `<section class="pm-hero" aria-labelledby="pm-title">
    <video class="pm-hero-video" muted loop playsinline preload="none" poster="/media/legal-hero-montage-poster-v2.webp" aria-hidden="true" tabindex="-1"><source data-src="/media/legal-hero-montage-v2.mp4" type="video/mp4"></video>
    <button class="pm-video-toggle" type="button" aria-label="${l('Tạm dừng video','Video anhalten')}" aria-pressed="false"><svg class="pm-video-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg><svg class="pm-video-play" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg></button>
    <div class="container pm-hero-inner"><div class="pm-hero-copy">
      <h1 id="pm-title">${l('Giải đáp pháp luật <br>Việt Nam và Đức.','Recht in Vietnam <br>und Deutschland.')}</h1>
      <p class="pm-hero-description">${l('Từ cư trú, quốc tịch đến các vấn đề về gia đình, tài&nbsp;sản và công việc.','Von Aufenthalt und Staatsangehörigkeit bis zu Familie, Eigentum und Arbeit.')}</p>
      <form id="home-ask" class="pm-ask ask-box"><label class="sr-only" for="home-question">${l('Bạn cần làm rõ vấn đề gì?','Was möchten Sie klären?')}</label><div class="pm-ask-row"><textarea id="home-question" name="question" maxlength="2000" required placeholder="${l('Bạn cần làm rõ vấn đề gì?','Was möchten Sie klären?')}" rows="1"></textarea><button class="button" type="submit" aria-label="${l('Gửi câu hỏi','Frage senden')}">${l('Gửi câu hỏi','Frage senden')} ${arrow}</button></div></form>
      <div class="pm-hero-links"><a href="#/tra-cuu">${l('Thư viện','Rechtsbibliothek')} ${arrow}</a></div>
    </div></div>${partnerStrip()}
  </section>
  <section class="pm-countries container" aria-label="${l('Thư viện','Rechtsbibliotheken')}">
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
  function scrollState() { const next=scrollY>80;if(next!==scrolled){scrolled=next;document.body.classList.toggle('pm-scrolled',next);} }
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
  decorate();
})();

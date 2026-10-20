'use strict';
(() => {
  const D = window.LVD_NEWS;
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>';
  const cat = id => D.categories.find(x=>x[0]===id)?.[1] || 'Chuyên mục';
  const find = id => D.stories.find(s=>s.id===id);
  const href = s => '#'+(s.type==='news'?'/tin/':'/bai-viet/')+s.id;
  const date = d => d ? d.split('-').reverse().join('.') : 'Cẩm nang';
  const link = (url,label) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span><span class="sr-only"> (mở nguồn ở tab mới)</span></a>`;
  const image = (id,priority=false,cls='') => {
    const p=D.photos.find(x=>x.id===id); if(!p) return '';
    const positions={family:'50% 40%',work:'50% 42%',train:'50% 53%',housing:'50% 52%',library:'50% 50%',berlin:'50% 50%',tram:'50% 44%','dong-xuan':'50% 48%'};
    return `<div class="press-photo ${cls}"><img src="assets/photos/${id}-1200.webp?v=0.6.4" srcset="assets/photos/${id}-600.webp?v=0.6.4 600w, assets/photos/${id}-1200.webp?v=0.6.4 1200w, assets/photos/${id}-1800.webp?v=0.6.4 1800w" sizes="${priority?'(max-width: 700px) 100vw, 70vw':'(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw'}" width="1200" height="800" alt="${esc(p.title)} — ${id==='dong-xuan'?'ảnh tư liệu 2012':'ảnh minh họa'}" loading="${priority?'eager':'lazy'}" ${priority?'fetchpriority="high"':''} decoding="async" style="object-position:${positions[id]||'50% 50%'}"></div>`;
  };
  const tag = s => `<div class="press-meta"><a href="#/tin-tuc?nhom=${s.category}">${cat(s.category)}</a><span>${s.type==='news'?date(s.published):'Cẩm nang'}</span></div>`;
  const card = (s,mode='standard',priority=false) => `<article class="press-card ${mode}"><a href="${href(s)}" class="press-image-link" aria-label="${esc(s.title)}">${image(s.photo,priority)}</a><div class="press-copy">${tag(s)}<h2><a href="${href(s)}">${esc(s.title)}</a></h2>${mode==='lead'||mode==='wide'?`<p>${esc(s.summary)}</p>`:''}<div class="press-source">${esc(s.sourceName)}</div></div></article>`;
  const sectionHead=(title,url,sub='')=>`<div class="press-section-head"><div>${sub?`<div class="press-kicker">${sub}</div>`:''}<h2>${title}</h2></div><a class="text-link" href="${url}">Xem tất cả ${arrow}</a></div>`;
  const categories = (selected='',path='/tin-tuc') => `<nav class="press-categories" aria-label="Chuyên mục tin"><a class="${!selected?'active':''}" href="#${path}" ${!selected?'aria-current="page"':''}>Tất cả</a>${D.categories.map(([id,label])=>`<a href="#${path}?nhom=${id}" class="${selected===id?'active':''}" ${selected===id?'aria-current="page"':''}>${label}</a>`).join('')}</nav>`;
  const crumb = title => `<div class="breadcrumb"><a href="#/">Trang chủ</a><span>/</span><span>${esc(title)}</span></div>`;

  function home(){return "";}
  function listing(route){
    const group=route.q.get('nhom')||'',kind=route.q.get('loai')||'',q=route.q.get('q')||'';
    const isLife=['/song-o-duc','/cam-nang','/goc-viet-kieu'].includes(route.path),isCommunity=route.path==='/cong-dong';
    const title=isCommunity?'Cộng đồng người Việt':isLife?'Cẩm nang tại Đức':'Tin pháp luật';
    let items=D.stories.filter(s=>(!group||s.category===group)&&(!isLife||s.type==='guide')&&(!isCommunity||s.category==='cong-dong')&&(!kind||s.type===kind));
    if(q){const n=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();items=items.filter(s=>n(s.title+' '+s.summary).includes(n(q)));}
    const base=isLife?'/song-o-duc':isCommunity?'/cong-dong':'/tin-tuc';
    return `<div class="container page newsroom-list">${crumb(isCommunity?'Cộng đồng':isLife?'Sống ở Đức':'Tin tức')}<div class="page-heading"><div class="press-kicker">LUẬT VIỆT ĐỨC</div><h1>${title}</h1><p>Quy định, chính sách và thông tin dành cho người Việt tại Đức.</p></div>${isCommunity?'':categories(group,base)}<div class="press-list-tools"><span>${items.length} bài viết</span><form data-news-search><label for="news-keyword" class="sr-only">Tìm trong tin tức và cẩm nang</label><input id="news-keyword" type="search" name="q" value="${esc(q)}" placeholder="Tìm trong tin & cẩm nang…" maxlength="100"><button type="submit" class="icon-button" aria-label="Tìm tin">${arrow}</button></form></div>${items.length?`<div class="press-grid listing-grid">${items.map((s,i)=>card(s,i===0?'lead':'standard',i===0)).join('')}</div>`:`<div class="empty-state"><h2>Không tìm thấy bài viết</h2><p>Thử từ khóa khác hoặc xem tất cả bài viết.</p><a class="button secondary" href="#/tin-tuc">Xem tất cả tin</a></div>`}</div>`;
  }

  function story(s,context={}){
    const photo=D.photos.find(p=>p.id===s.photo),related=D.stories.filter(a=>a.id!==s.id&&(a.category===s.category||a.type===s.type)).slice(0,3);
    return `<div class="container page news-detail">${crumb(cat(s.category))}<header class="news-title">${tag(s)}<h1>${esc(s.title)}</h1><p>${esc(s.summary)}</p><div class="news-byline"><div><strong>Tóm tắt từ ${esc(s.sourceName)}</strong><span>${s.published?'Ngày nguồn: '+date(s.published)+' · ':''}Đối chiếu: 19.10.2026</span></div><div class="button-row"><button class="button quiet small" data-save="${s.id}" aria-pressed="${!!context.saved}">${context.saved?'Đã lưu':'Lưu bài'}</button><button class="button quiet small" data-copy>Chia sẻ ↗</button></div></div></header>
      <figure class="news-figure">${image(s.photo,true)}<figcaption>${esc(s.caption)} <span>Ảnh: ${link(photo.page,photo.author)} · ${link(photo.licenseUrl,photo.license)}.</span></figcaption></figure>
      <div class="news-reading"><article class="news-text"><div class="news-summary"><div class="press-kicker">ĐIỂM CẦN NHỚ</div><ul>${s.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></div>${s.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}<section class="news-sources"><h2>Nguồn thông tin</h2>${link(s.sourceUrl,s.sourceName)}${(s.secondary||[]).map(x=>link(x.url,x.name)).join('')}<p>Xem nguồn gốc để đọc đầy đủ phạm vi và điều kiện áp dụng.</p></section><details class="news-photo-license"><summary>Thông tin ảnh & giấy phép</summary><p>${esc(photo.note)}</p><p>Giữ màu ảnh gốc, điều chỉnh kích thước và định dạng cho website. ${link(photo.licenseUrl,photo.license)}.</p><a href="#/nguon-anh">Xem toàn bộ nguồn ảnh →</a></details><div class="news-bottom-nav"><a href="#/tin-tuc">← Trở lại chuyên mục</a><a href="#/hoi-dap-ai">Đặt câu hỏi →</a></div></article><aside class="news-aside"><div class="press-kicker">TIẾP TỤC TÌM HIỂU</div>${related.map(a=>card(a,'aside')).join('')}<div class="press-aside-legal"><strong>Có câu hỏi cần giải đáp?</strong><a class="text-link" href="#/tra-cuu">Tra cứu thư viện ${arrow}</a></div></aside></div></div>`;
  }
  function credits(){return `<div class="container page">${crumb('Nguồn ảnh')}<div class="page-heading"><div class="press-kicker">LUẬT VIỆT ĐỨC / MINH BẠCH NGUỒN</div><h1>Nguồn ảnh</h1><p>Thông tin tác giả, ảnh gốc và giấy phép sử dụng hình ảnh trên Luật Việt Đức.</p></div><div class="credits-grid">${D.photos.map(p=>`<article class="credit-card">${image(p.id)}<div><h2>${esc(p.title)}</h2><p>${esc(p.author)}</p><div class="credit-links">${link(p.page,'Ảnh gốc')}${link(p.licenseUrl,p.license)}</div><p>${esc(p.note)}</p><small>Giữ màu ảnh gốc; ảnh được điều chỉnh kích thước và định dạng.</small></div></article>`).join('')}</div><div class="notice info">Ảnh minh họa và ảnh tư liệu được ghi rõ trong chú thích. Ảnh Dong Xuan Center sử dụng giấy phép CC BY-SA 3.0; giấy phép này áp dụng riêng cho ảnh.</div></div>`;}
  document.addEventListener('submit',e=>{if(e.target.matches('[data-news-search]')){e.preventDefault();const q=String(new FormData(e.target).get('q')||'').trim();location.hash='/tin-tuc'+(q?'?q='+encodeURIComponent(q):'');}});
  window.LVD_EDITORIAL={home,listing,story,credits,find,image,tag};
})();

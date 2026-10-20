'use strict';
(() => {
  const DATA = window.LVD_CONTENT;
  const main = document.getElementById('main');
  const state = {user:null, saved:new Map(), requests:[], lastRequest:null, draft:{}, pending:null, auth:null, feedback:new Set(), sequence:1, preferences:new Map()};
  let timer = null, toastTimer = null, viewSerial = 0;
  const paths = {
    arrow:'M4 12h16M14 6l6 6-6 6', search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    home:'M3 10l9-7 9 7M5 9v12h14V9M9 21v-8h6v8', user:'M20 21v-3a8 8 0 0 0-16 0v3M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    family:'M16 21v-3a6 6 0 0 0-12 0v3M13 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0M17 3a3 3 0 0 1 0 6M20 21v-4a6 6 0 0 0-3-5',
    pen:'M14 5l5 5M4 20l4-1L21 6a2 2 0 0 0-4-4L4 15z',
    file:'M14 2H5v20h14V7zM14 2v6h5M8 12h8M8 16h8',
    briefcase:'M9 6V3h6v3M3 6h18v14H3zM3 11l9 3 9-3M10 11h4v5h-4z',
    wallet:'M3 5h18v15H3zM3 9h18M15 13h6M17 16h1',
    globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18',
    shield:'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6zM8 12l3 3 5-6',
    bulb:'M9 21h6M9 18h6M8 14a7 7 0 1 1 8 0l-1 3H9z',
    bookmark:'M5 3h14v19l-7-5-7 5z', check:'M5 12l4 4L19 6', close:'M6 6l12 12M18 6L6 18', menu:'M4 6h16M4 12h16M4 18h16',
    filter:'M4 6h16M7 12h10M10 18h4', chevron:'M6 9l6 6 6-6', link:'M10 13a5 5 0 0 0 7 0l4-4a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-4 4a5 5 0 0 0 7 7l2-2',
    mail:'M3 5h18v14H3zM3 6l9 7 9-7', clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2', book:'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3zM12 6v16'
  };
  const icon = (name, cls='') => `<svg viewBox="0 0 24 24" aria-hidden="true" class="${cls}"><path d="${paths[name] || paths.file}"/></svg>`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim();
  const url = (path, params={}) => {const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v !== '' && v != null)); return '#' + path + (q.size ? '?' + q : '');};
  const articleURL = a => url((a.type === 'qa' ? '/hoi-dap/' : a.type === 'news' ? '/tin/' : '/bai-viet/') + a.id);
  const labelType = type => ({qa:'Hỏi đáp',guide:'Cẩm nang',news:'Tin pháp luật'}[type] || 'Nội dung');
  const topicName = id => DATA.topics.find(t => t[0] === id)?.[1] || 'Chưa phân loại';
  const article = id => DATA.articles.find(a => a.id === id);
  const parseRoute = () => {
    const legacy = {WF01:'/',WF02:'/chu-de',WF03:'/chu-de/nha-dat',WF04:'/tim-kiem?q=uy+quyen',WF05:'/hoi-dap/uy-quyen-quan-ly-nha',WF06:'/hoi-dap',WF07:'/cam-nang',WF08:'/ve-chuyen-trang',WF09:'/gui-cau-hoi',WF10:'/da-tiep-nhan',WF11:'/dang-nhap',WF12:'/tai-khoan',WF13:'/tai-khoan/cau-hoi/DEMO-0001'};
    const raw = location.hash.slice(1) || '/';
    const value = legacy[raw] || raw;
    try {const parsed = new URL(value.startsWith('/') ? value : '/not-found', 'https://preview.invalid'); return {path:parsed.pathname.replace(/\/$/,'') || '/',q:parsed.searchParams};}
    catch {return {path:'/not-found',q:new URLSearchParams()};}
  };
  const go = (path,params={}) => {const next=url(path,params); if(location.hash===next) render(); else location.hash=next;};
  const savedSet = () => {if(!state.user) return new Set(); if(!state.saved.has(state.user.email)) state.saved.set(state.user.email,new Set()); return state.saved.get(state.user.email);};
  const mine = () => state.user ? state.requests.filter(r => r.owner === state.user.email) : [];
  const crumb = (title,parent) => `<div class="breadcrumb"><a href="#/">Trang chủ</a><span>/</span>${parent ? `<a href="${parent[1]}">${esc(parent[0])}</a><span>/</span>` : ''}<span>${esc(title)}</span></div>`;
  const heading = (title,description='',eyebrow='') => `<div class="page-heading">${eyebrow?`<div class="eyebrow">${esc(eyebrow)}</div>`:''}<h1>${esc(title)}</h1>${description?`<p>${esc(description)}</p>`:''}</div>`;
  const meta = a => a.editorial ? window.LVD_EDITORIAL.tag(a) : `<div class="meta"><span>${labelType(a.type)}</span><span>${esc(a.country)}</span></div>`;
  const searchForm = (q='', id='search-page') => `<form class="search-form" data-search role="search"><label class="sr-only" for="${id}">Nhập từ khóa cần tìm…</label>${icon('search')}<input id="${id}" name="q" type="search" maxlength="180" placeholder="Nhập từ khóa cần tìm…" value="${esc(q)}" autocomplete="off"><button type="submit" class="button" aria-label="Tìm kiếm"><span class="search-label">Tìm kiếm</span>${icon('arrow')}</button></form>`;
  const suggestions = () => `<div class="suggestions"><span class="try-label">Thử tìm:</span>${['Ủy quyền','Thừa kế','Quốc tịch','Chuyển tiền'].map(q=>`<a class="pill" href="${url('/tim-kiem',{q})}">${q}</a>`).join('')}</div>`;
  const cta = () => `<section class="cta-band"><div><h2>Bạn có câu hỏi khác?</h2><p></p></div><a class="button" href="#/hoi-dap-ai">Đặt câu hỏi ${icon('arrow')}</a></section>`;
  const situationCard = s => `<a class="situation-card" href="${url('/tra-cuu',{'tinh-huong':s[0]})}"><span class="tile-icon">${icon(s[3])}</span><div><strong>${s[1]}</strong><p>${s[2]}</p></div>${icon('arrow','arrow')}</a>`;
  const questionRow = a => `<a class="question-row" href="${articleURL(a)}"><div><strong>${esc(a.title)}</strong>${meta(a)}</div>${icon('arrow')}</a>`;
  const featureCard = a => `<a class="feature-card" href="${articleURL(a)}"><span class="tag">${labelType(a.type)}</span><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p><span class="text-link">${a.type==='news'?'Đọc bài':'Đọc bài'} ${icon('arrow')}</span></a>`;
  const empty = (title,description,action='<a class="button" href="#/tra-cuu">Tra cứu thư viện</a>') => `<div class="empty-state"><span class="tile-icon">${icon('search')}</span><h2>${esc(title)}</h2><p>${esc(description)}</p><div class="button-row center">${action}</div></div>`;


  const selectOptions = (values,current) => values.map(([value,label])=>`<option value="${esc(value)}"${value===current?' selected':''}>${esc(label)}</option>`).join('');
  function browseView(route){
    const q=route.q, keyword=q.get('q')||'', situation=q.get('tinh-huong')||'', topic=route.path.startsWith('/chu-de/')?route.path.split('/')[2]:(q.get('linh-vuc')||'');
    const kind=route.path==='/hoi-dap'?'qa':q.get('loai')||'', country=q.get('quoc-gia')||'', tab=route.path==='/chu-de'?'fields':q.get('xem')||'situations';
    const isSearch=route.path==='/tim-kiem'||!!keyword, s=DATA.situations.find(x=>x[0]===situation);
    const title=isSearch?'Kết quả tìm kiếm':s?s[1]:topic?topicName(topic):route.path==='/hoi-dap'?'Câu hỏi thường gặp':tab==='fields'?'Lĩnh vực pháp luật':'Thư viện pháp luật';
    const tokens=norm(keyword).split(/[^a-z0-9]+/).filter(Boolean);
    const matches=DATA.articles.map(a=>{const hay=norm(a.title+' '+a.summary+' '+a.keywords+' '+topicName(a.topic)); return {a,match:tokens.every(t=>hay.split(/[^a-z0-9]+/).some(w=>w===t||(t.length>=3&&w.startsWith(t)))),score:tokens.reduce((n,t)=>n+(norm(a.title).includes(t)?3:1),0)};}).filter(x=>x.match&&(!topic||x.a.topic===topic)&&(!situation||x.a.situations.includes(situation))&&(!kind||x.a.type===kind)&&(!country||x.a.country===country));
    if(q.get('sap-xep')==='a-z') matches.sort((x,y)=>x.a.title.localeCompare(y.a.title,'vi')); else matches.sort((x,y)=>y.score-x.score);
    const size=6,total=matches.length,pages=Math.max(1,Math.ceil(total/size)),page=Math.min(pages,Math.max(1,parseInt(q.get('trang'),10)||1));
    const params={q:keyword,'tinh-huong':situation,'linh-vuc':topic,'loai':kind,'quoc-gia':country,'sap-xep':q.get('sap-xep')||''};
    const filterItems=[['q',keyword],['tinh-huong',s?.[1]],['linh-vuc',topic?topicName(topic):''],['loai',kind?labelType(kind):''],['quoc-gia',country]].filter(([,v])=>v);
    const showHub=['/tra-cuu','/chu-de'].includes(route.path)&&!keyword&&!situation&&!topic&&!country&&!kind;
    return `<div class="container page">${crumb(title)}${heading(title,isSearch?'':'Tìm theo chủ đề, tình huống hoặc từ khóa.')}${searchForm(keyword)}${showHub?`<nav class="tabs" aria-label="Cách tra cứu"><a class="${tab==='situations'?'active':''}" href="#/tra-cuu" ${tab==='situations'?'aria-current="page"':''}>Theo tình huống</a><a class="${tab==='fields'?'active':''}" href="#/chu-de" ${tab==='fields'?'aria-current="page"':''}>Theo lĩnh vực</a><a href="#/hoi-dap">Tất cả hỏi đáp</a></nav>${tab==='fields'?`<div class="domain-grid">${DATA.topics.map(t=>`<a class="situation-card" href="${url('/chu-de/'+t[0])}"><span class="tile-icon">${icon(t[2])}</span><div><strong>${t[1]}</strong><p>${DATA.articles.filter(a=>a.topic===t[0]).length} nội dung</p></div>${icon('arrow','arrow')}</a>`).join('')}</div>`:`<div class="situation-grid">${DATA.situations.map(situationCard).join('')}</div>`}`:''}<div class="browse-layout"><details class="filter-panel" id="filters" ${matchMedia('(min-width:681px)').matches?'open':''}><summary>Bộ lọc ${icon('filter')}</summary><form id="filter-form" class="filter-body"><input type="hidden" name="q" value="${esc(keyword)}"><input type="hidden" name="tinh-huong" value="${esc(situation)}"><div><label for="filter-topic">Lĩnh vực</label><select id="filter-topic" name="linh-vuc">${selectOptions([['','Tất cả lĩnh vực'],...DATA.topics.map(t=>[t[0],t[1]])],topic)}</select></div><div><label for="filter-country">Phạm vi pháp luật</label><select id="filter-country" name="quoc-gia">${selectOptions([['','Tất cả phạm vi'],['Việt Nam','Việt Nam'],['Đức','Đức'],['Việt Nam – Đức','Việt Nam – Đức']],country)}</select></div><div><label for="filter-type">Loại nội dung</label><select id="filter-type" name="loai">${selectOptions([['','Tất cả nội dung'],['qa','Hỏi đáp'],['guide','Cẩm nang'],['news','Tin pháp luật']],kind)}</select></div><div class="filter-actions"><button class="button" type="submit">Áp dụng</button><a class="clear" href="${url('/tim-kiem',{q:keyword})}">Xóa bộ lọc</a></div></form></details><div><div class="results-top" role="status"><span><strong>${total}</strong> nội dung${total?` · Trang ${page}/${pages}`:''}</span><label class="sr-only" for="sort-results">Sắp xếp kết quả</label><select id="sort-results" data-sort>${selectOptions([['relevance','Phù hợp nhất'],['a-z','Theo tiêu đề A–Z']],q.get('sap-xep')||'relevance')}</select></div>${filterItems.length?`<div class="active-filters">${filterItems.map(([key,value])=>`<a class="pill active" aria-label="Bỏ lọc ${esc(value)}" href="${url('/tim-kiem',{...params,[key]:''})}">${esc(value)} <span aria-hidden="true">×</span></a>`).join('')}</div>`:''}${total?`<div class="question-list">${matches.slice((page-1)*size,page*size).map(({a})=>`<article class="result-item">${a.editorial?`<img class="press-search-thumb" src="assets/photos/${a.photo}-600.webp" alt="Ảnh minh họa cho bài viết" width="110" height="82" loading="lazy">`:""}${meta(a)}<h2><a href="${articleURL(a)}">${esc(a.title)}</a></h2><p>${esc(a.summary)}</p><a class="text-link read-link" href="${articleURL(a)}">${a.editorial?'Đọc tóm tắt & nguồn':a.type==='qa'?'Xem nội dung':'Đọc nội dung'} ${icon('arrow')}</a></article>`).join('')}</div>${pages>1?`<nav class="pagination" aria-label="Phân trang">${Array.from({length:pages},(_,i)=>`<a href="${url('/tim-kiem',{...params,trang:i+1})}" aria-label="Trang ${i+1}" ${page===i+1?'aria-current="page"':''}>${i+1}</a>`).join('')}</nav>`:''}`:empty('Không tìm thấy kết quả','Thử từ khóa khác hoặc bỏ bớt bộ lọc.',`<a class="button secondary" href="#/tra-cuu">Khám phá chủ đề</a><a class="button" href="#/hoi-dap-ai">Đặt câu hỏi ${icon('arrow')}</a>`)}</div></div>${cta()}</div>`;
  }
  function articleView(a){
    if(!a) return notFound();
    if(a.editorial) return window.LVD_EDITORIAL.story(a,{saved:savedSet().has(a.id)});
    const related=DATA.articles.filter(x=>x.id!==a.id&&(x.topic===a.topic||x.situations.some(s=>a.situations.includes(s)))).slice(0,3);
    return `<div class="container page">${crumb('Thư viện',['Tra cứu','#/tra-cuu'])}<header class="article-head">${meta(a)}<h1>${esc(a.title)}</h1><p>${esc(a.summary)}</p></header><div class="article-meta"><div class="meta"><span>${esc(topicName(a.topic))}</span></div><div class="button-row"><button class="button secondary" data-save="${a.id}">${icon('bookmark')}Lưu bài</button><button class="button quiet" data-copy>${icon('link')}Chia sẻ</button></div></div><div class="article-layout"><article class="article-body"><section class="answer-box" id="answer"><h2>Thông tin cần làm rõ</h2><p>Để tìm hiểu đúng thủ tục, bạn nên xác định những thông tin sau:</p><ul class="clean-list">${a.checks.map(t=>`<li>${icon('check')}<span>${esc(t)}</span></li>`).join('')}</ul></section><section class="article-section" id="questions"><h2>Hỏi về trường hợp của bạn</h2><p>Nêu công việc cần giải quyết, nơi thực hiện và điều bạn còn băn khoăn. Không gửi số hộ chiếu, thông tin ngân hàng hoặc giấy tờ cá nhân trong câu hỏi.</p><a class="button" href="${url('/hoi-dap-ai',{bai:a.id})}">Đặt câu hỏi ${icon('arrow')}</a></section>${related.length?`<section class="article-section"><h2>Nội dung liên quan</h2><div class="question-list">${related.map(questionRow).join('')}</div></section>`:''}</article><aside class="article-aside"><details class="toc" open><summary>Trong bài viết</summary><nav aria-label="Mục lục"><a href="${articleURL(a)}" data-scroll="answer">Thông tin cần làm rõ</a><a href="${articleURL(a)}" data-scroll="questions">Đặt câu hỏi</a></nav></details></aside></div></div>`;
  }
  function aboutView(){return `<div class="container page">${crumb('Giới thiệu')}${heading('Về Luật Việt Đức','Chuyên trang hỏi đáp và thông tin pháp luật dành cho người Việt tại Đức.')}<div class="prose"><p>Luật Việt Đức tập trung vào những vấn đề pháp luật gắn với cuộc sống tại Đức và các công việc cần giải quyết tại Việt Nam: cư trú, lao động, gia đình, nhà đất, thừa kế và ủy quyền.</p><h2>Hỏi đáp pháp luật</h2><p>Đặt câu hỏi từ tình huống của bạn hoặc tìm nội dung có sẵn trong thư viện. Khi đọc một bài viết, bạn có thể chọn “Hỏi về bài viết” để tiếp tục tìm hiểu.</p><h2>Thư viện kiến thức</h2><p>Thư viện pháp luật Việt Nam gồm 16 lĩnh vực và 303 chủ đề. Chọn chủ đề để đặt câu hỏi về vấn đề cần làm rõ.</p><h2>Tin pháp luật và cẩm nang</h2><p>Các bài viết giới thiệu quy định, chính sách và thủ tục đáng chú ý với cộng đồng người Việt tại Đức. Đường dẫn nguồn gốc được đặt trong từng bài để bạn đọc đầy đủ thông tin.</p><h2>Góp ý nội dung</h2><p>Phát hiện thông tin cần sửa hoặc có chủ đề muốn tìm hiểu? Hãy gửi đường dẫn bài viết cùng nội dung góp ý.</p><a class="text-link" href="#/gui-cau-hoi?muc-dich=feedback">Gửi góp ý ${icon('arrow')}</a></div></div>`;}
  function field(name,label,type='text',value='',optional=false){return `<div class="field"><label for="${name}">${label}${optional?' <span class="muted">(không bắt buộc)</span>':' <span class="required">*</span>'}</label><input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${optional?'':'required'} ${type==='email'?'maxlength="254"':'maxlength="120"'} aria-describedby="${name}-error" autocomplete="${type==='email'?'email':name==='name'?'name':'off'}"><div class="error" id="${name}-error" role="alert"></div></div>`;}
  function contactView(route){
    const d=state.draft,context=article(route.q.get('bai')),purpose=route.q.get('muc-dich')||d.purpose||'question',feedback=purpose==='feedback';
    return `<div class="container page">${crumb(feedback?'Góp ý nội dung':'Liên hệ')}${heading(feedback?'Góp ý nội dung':'Gửi yêu cầu',feedback?'Cho chúng tôi biết bài viết và thông tin cần sửa.':'Mô tả vấn đề bạn cần hỗ trợ và để lại email liên hệ.')}<div class="contact-layout"><form id="contact-form" class="form-card" novalidate>${context?`<div class="notice info">Về bài viết: <strong>${esc(context.title)}</strong></div><input name="context" type="hidden" value="${esc(context.id)}">`:''}<div class="field"><label for="purpose">Nội dung liên hệ</label><select id="purpose" name="purpose">${selectOptions([['question','Câu hỏi pháp luật'],['discussion','Đề nghị trao đổi'],['feedback','Góp ý nội dung']],purpose)}</select></div><div class="field"><label for="question">Nội dung <span class="required">*</span></label><textarea id="question" name="question" required maxlength="3000" placeholder="Nêu vấn đề bạn cần hỗ trợ…" aria-describedby="question-hint question-error">${esc(d.question||'')}</textarea><small id="question-hint">Tối đa 3.000 ký tự. Không gửi số hộ chiếu, thông tin tài khoản hoặc giấy tờ cá nhân.</small><div id="question-error" class="error" role="alert"></div></div><div class="field" id="topic-field" ${feedback?'hidden':''}><label for="topic">Lĩnh vực</label><select id="topic" name="topic">${selectOptions([['unknown','Chưa xác định'],...DATA.topics.map(t=>[t[0],t[1]])],d.topic||context?.topic||'unknown')}</select></div><div class="field-row">${field('name','Họ và tên','text',d.name||'')}${field('email','Email liên hệ','email',d.email||'')}</div><div class="checkbox-row"><input id="consent" name="consent" type="checkbox" ${d.consent?'checked':''} aria-describedby="consent-error"><div><label for="consent">Tôi đồng ý sử dụng thông tin liên hệ để phản hồi yêu cầu này. <a href="#/chinh-sach-thong-tin">Quyền riêng tư</a></label><div id="consent-error" class="error" role="alert"></div></div></div><div id="form-error" class="notice" role="alert" tabindex="-1" hidden></div><button type="submit" class="button">${feedback?'Gửi góp ý':'Gửi yêu cầu'} ${icon('arrow')}</button></form><aside class="contact-aside"><h3>Tìm trong thư viện</h3><p class="muted">Tra cứu chủ đề liên quan trước khi gửi yêu cầu.</p><a class="text-link" href="#/tra-cuu">Mở thư viện ${icon('arrow')}</a><hr style="border:0;border-top:1px solid #ddd;margin:24px 0"><h3>Hỏi đáp pháp luật</h3><a class="text-link" href="#/hoi-dap-ai">Đặt câu hỏi ${icon('arrow')}</a></aside></div></div>`;
  }
  function successView(){return `<div class="container page">${crumb('Yêu cầu')}${heading('Chưa có yêu cầu được xác nhận','Trở lại biểu mẫu để kiểm tra nội dung và gửi yêu cầu.')}<a class="button" href="#/gui-cau-hoi">Trở lại biểu mẫu ${icon('arrow')}</a></div>`;}
  function authView(){return `<div class="container page"><div class="auth-wrap"><h1>Đăng nhập</h1><p>Nhập email để nhận mã đăng nhập.</p><div class="form-card"><form id="email-form" novalidate>${field('login-email','Email','email',state.pending?.email||'')}<button class="button full" type="submit">Nhận mã đăng nhập ${icon('arrow')}</button></form></div><a class="text-link" href="#/tra-cuu">Tiếp tục đọc không cần đăng nhập ${icon('arrow')}</a></div></div>`;}
  function accountView(){return authView();}
  function threadView(){return authView();}
  function policyView(kind){const privacy=kind==='privacy';return `<div class="container page">${crumb(privacy?'Quyền riêng tư':'Điều khoản sử dụng')}${heading(privacy?'Quyền riêng tư':'Điều khoản sử dụng')}<div class="prose">${privacy?`<h2>Thông tin bạn nhập</h2><p>Nội dung nhập vào ô hỏi đáp và biểu mẫu hiện được giữ trong bộ nhớ của trang, không gửi đến dịch vụ xử lý yêu cầu. Tải lại hoặc đóng trang sẽ xóa nội dung này.</p><h2>Thông tin cá nhân</h2><p>Không cung cấp số hộ chiếu, số tài khoản ngân hàng, mật khẩu hoặc giấy tờ cá nhân trong câu hỏi. Chỉ nêu những thông tin cần thiết để mô tả vấn đề.</p><h2>Truy cập website</h2><p>Website không tích hợp công cụ phân tích người dùng. Đơn vị lưu trữ có thể ghi nhật ký truy cập để cung cấp dịch vụ. Các website được liên kết trong bài áp dụng chính sách riêng. Kiểu chữ được tải từ Google Fonts; trình duyệt kết nối với nhà cung cấp font nhưng không gửi kèm nội dung câu hỏi.</p>`:`<h2>Phạm vi thông tin</h2><p>Nội dung trên Luật Việt Đức phục vụ việc tìm hiểu pháp luật và thủ tục. Thông tin chung không thay thế việc xem xét hồ sơ của từng trường hợp.</p><h2>Nguồn và thời điểm</h2><p>Khi áp dụng quy định, hãy đọc nguồn gốc được dẫn trong bài và kiểm tra phạm vi, điều kiện cùng thời điểm áp dụng. Ngày đối chiếu nguồn không phải ngày ban hành văn bản.</p><h2>Sử dụng nội dung và hình ảnh</h2><p>Vui lòng ghi rõ nguồn khi trích dẫn. Hình ảnh có thông tin tác giả và giấy phép riêng tại mục Nguồn ảnh.</p>`}<a class="text-link" href="#/ve-chuyen-trang">Về Luật Việt Đức ${icon('arrow')}</a></div></div>`;}
  function reviewView(){return `<div class="container page">${crumb('Trợ giúp')}${heading('Trợ giúp')}<div class="prose"><h2>Đặt câu hỏi</h2><p>Nêu vấn đề cần giải quyết và quốc gia liên quan. Bạn có thể hỏi tiếp trong cùng cuộc trò chuyện.</p><h2>Tra cứu kiến thức</h2><p>Nhập từ khóa trong thư viện hoặc chọn một lĩnh vực để xem nội dung liên quan.</p><h2>Hỏi từ bài viết</h2><p>Chọn “Hỏi về bài viết” ở cuối bài. Tên bài viết sẽ được giữ trong cuộc trò chuyện.</p></div></div>`;}
  function notFound(){return `<div class="container page not-found">${heading('Không tìm thấy trang','Đường dẫn có thể đã thay đổi hoặc nội dung không còn được cung cấp.')}<div class="button-row"><a class="button secondary" href="#/">Về trang chủ</a><a class="button" href="#/tra-cuu">Tra cứu thư viện ${icon('arrow')}</a></div></div>`;}

  function toast(text){const el=document.getElementById('toast');el.textContent=text;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),4200);}
  function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.querySelectorAll('[data-dialog]').forEach(b=>b.setAttribute('aria-expanded','false'));}
  function render(){
    viewSerial++; clearInterval(timer); closeDialogs(); const route=parseRoute(); let html;
    if(window.LVD_CATALOG_UI?.accepts(route)) html=window.LVD_CATALOG_UI.view(route);
    else if(route.path==='/') html=window.LVD_EDITORIAL.home();
    else if(['/tin-tuc','/song-o-duc','/cong-dong'].includes(route.path)) html=window.LVD_EDITORIAL.listing(route);
    else if(route.path==='/nguon-anh') html=window.LVD_EDITORIAL.credits();
    else if(['/tra-cuu','/chu-de','/hoi-dap','/tim-kiem'].includes(route.path)||route.path.startsWith('/chu-de/')) html=browseView(route);
    else if(/^\/(hoi-dap|bai-viet|tin)\//.test(route.path)) html=articleView(article(route.path.split('/')[2]));
    else if(['/cam-nang','/goc-viet-kieu','/tin-phap-luat'].includes(route.path)) html=window.LVD_EDITORIAL.listing(route);
    else if(route.path==='/ve-chuyen-trang') html=aboutView();
    else if(['/gui-cau-hoi','/lien-he'].includes(route.path)) html=contactView(route);
    else if(['/da-tiep-nhan','/lien-he/da-tiep-nhan'].includes(route.path)) html=successView();
    else if(['/dang-nhap','/tai-khoan/dang-nhap'].includes(route.path)) html=authView();
    else if(route.path==='/tai-khoan') html=accountView(route);
    else if(route.path.startsWith('/tai-khoan/cau-hoi/')) html=threadView(route.path.split('/')[3]);
    else if(route.path==='/chinh-sach-thong-tin') html=policyView('privacy');
    else if(route.path==='/dieu-khoan') html=policyView('terms');
    else if(route.path==='/so-do') html=reviewView();
    else html=notFound();
    main.innerHTML=html;
    const h1=main.querySelector('h1'); document.title=(h1?h1.textContent:'Luật Việt Đức')+' | Luật Việt Đức';
    document.querySelectorAll('.desktop-nav a').forEach(a=>{const active=a.dataset.nav==='lookup'?/\/(tra-cuu|tim-kiem|chu-de|hoi-dap)/.test(route.path):a.dataset.nav==='news'?route.path==='/tin-tuc'||route.path.startsWith('/tin/'):a.dataset.nav==='life'?['/song-o-duc','/cam-nang','/goc-viet-kieu'].includes(route.path)||route.path.startsWith('/bai-viet/'):a.dataset.nav==='community'?route.path==='/cong-dong':false; if(active) a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    main.focus({preventScroll:true});window.scrollTo(0,0);
    document.getElementById('page-announcement').textContent=h1?h1.textContent:'Nội dung đã mở';
  }
  function setError(form,id,message){const input=form.querySelector('#'+id),error=form.querySelector('#'+id+'-error'); if(input)input.setAttribute('aria-invalid',message?'true':'false'); if(error)error.textContent=message;}
  function captureDraft(form){const data=Object.fromEntries(new FormData(form));state.draft={...data,consent:form.elements.consent.checked};return state.draft;}
  document.addEventListener('input',e=>{const form=e.target.closest('#contact-form');if(form)captureDraft(form);});
  document.addEventListener('change',e=>{
    if(e.target.id==='purpose'){document.getElementById('topic-field').hidden=e.target.value==='feedback';captureDraft(e.target.form);}
    if(e.target.matches('[data-sort]')){const r=parseRoute(),p=Object.fromEntries(r.q);if(r.path.startsWith('/chu-de/'))p['linh-vuc']=r.path.split('/')[2];if(r.path==='/hoi-dap')p.loai='qa';p['sap-xep']=e.target.value;delete p.trang;go('/tim-kiem',p);}
  });
  document.addEventListener('click',async e=>{
    const target=e.target.closest('button,a');if(!target)return;
    if(target.id==='skip-main'){e.preventDefault();main.focus({preventScroll:true});main.scrollIntoView({block:'start'});return;}
    if(target.hasAttribute('data-scroll')){e.preventDefault();const section=document.getElementById(target.dataset.scroll);section?.scrollIntoView({block:'start'});if(section){section.tabIndex=-1;section.focus({preventScroll:true});}return;}
    if(target.hasAttribute('data-dialog')){document.getElementById(target.dataset.dialog)?.showModal();target.setAttribute('aria-expanded','true');return;}
    if(target.hasAttribute('data-close')){closeDialogs();return;}
    if(target.hasAttribute('data-save')){state.pending={save:target.dataset.save,path:location.hash.slice(1)};go('/dang-nhap');return;}
    if(target.hasAttribute('data-copy')){try{await navigator.clipboard.writeText(location.href);toast('Đã sao chép liên kết.');}catch{toast('Không thể sao chép. Vui lòng lấy liên kết trên thanh địa chỉ.');}return;}
    if(target.hasAttribute('data-feedback'))toast('Chưa thể gửi đánh giá. Vui lòng thử lại sau.');
  });
  document.addEventListener('submit',e=>{
    const form=e.target;if(!(form instanceof HTMLFormElement))return;
    if(form.matches('[data-search]')){e.preventDefault();const q=String(new FormData(form).get('q')||'').trim().slice(0,180);closeDialogs();go(q?'/tim-kiem':'/tra-cuu',q?{q}:{});return;}
    if(form.id==='filter-form'){e.preventDefault();go('/tim-kiem',Object.fromEntries(new FormData(form)));return;}
    if(form.id==='email-form'){e.preventDefault();const input=form.elements['login-email'];if(!input.value.trim()||!input.validity.valid){setError(form,'login-email','Vui lòng nhập email hợp lệ.');input.focus();return;}setError(form,'login-email','Chưa thể gửi mã đăng nhập. Vui lòng thử lại sau.');return;}
    if(form.id==='contact-form'){
      e.preventDefault();const d=captureDraft(form);let invalid=false;
      for(const id of ['question','name','email','consent'])setError(form,id,'');
      const error=(id,text)=>{setError(form,id,text);invalid=true;};
      if(!d.question?.trim())error('question','Vui lòng nhập nội dung cần hỗ trợ.');
      if(!d.name?.trim())error('name','Vui lòng nhập họ và tên.');
      if(!d.email?.trim()||!form.elements.email.validity.valid)error('email','Vui lòng nhập email hợp lệ.');
      if(!d.consent)error('consent','Vui lòng đồng ý sử dụng thông tin liên hệ để gửi yêu cầu.');
      if(invalid){form.querySelector('[aria-invalid=true]')?.focus();return;}
      const alert=document.getElementById('form-error');alert.textContent='Chưa gửi được yêu cầu. Nội dung bạn nhập vẫn được giữ trên trang; vui lòng thử lại sau.';alert.hidden=false;alert.focus();
    }
  });

  document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
  document.getElementById('search-dialog-body').innerHTML=searchForm('','dialog-search')+suggestions();
  document.querySelectorAll('dialog').forEach(dialog=>{
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
    dialog.addEventListener('close',()=>document.querySelectorAll(`[data-dialog="${dialog.id}"]`).forEach(b=>b.setAttribute('aria-expanded','false')));
    dialog.querySelectorAll('a[href^="#/"]').forEach(a=>a.addEventListener('click',()=>closeDialogs()));
  });
  window.addEventListener('hashchange',render);
  window.addEventListener('resize',()=>{const panel=document.getElementById('filters');if(panel&&innerWidth>680)panel.open=true;});
  render();
})();

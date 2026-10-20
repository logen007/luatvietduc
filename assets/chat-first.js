'use strict';
/* Public conversation UI. Server-dependent actions require an actual response before success. */
(() => {
  const E=window.LVD_EDITORIAL, N=window.LVD_NEWS, K=window.LVD_CONTENT;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
  const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${{arrow:'M12 19V5M6 11l6-6 6 6',chat:'M4 4h16v13H9l-5 4zM8 8h8M8 12h5',book:'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3zM12 6v16',human:'M20 21v-3a8 8 0 0 0-16 0v3M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',check:'M5 12l4 4L19 6',plus:'M12 5v14M5 12h14',right:'M4 12h16M14 6l6 6-6 6'}[name]||'M4 12h16M14 6l6 6-6 6'}"/></svg>`;
  const state={threads:[],current:null,sequence:0,render:null,draft:null,knowledge:[],pendingQuestion:'',focusInput:false};
  const thread=()=>state.threads.find(t=>t.id===state.current);
  const route=()=>{const u=new URL((location.hash.slice(1)||'/'),'https://local.invalid');return {path:u.pathname,q:u.searchParams};};
  const go=path=>{if(location.hash==='#'+path)redraw();else location.hash=path;};
  const C=window.LVD_CATALOG;
  const buttons=()=>`<div class="chat-prompts">${C.promptTopics.slice(0,4).map(([label,id])=>`<button type="button" data-ask-example="${esc(C.getTopic(id).title)}">${esc(label)}</button>`).join('')}</div>`;
  const openContext=id=>C.getTopic(id)||N.stories.find(s=>s.id===id)||K.articles.find(s=>s.id===id);
  const contextURL=c=>c.catalog?C.topicURL(c):`#/${c.type==='news'?'tin':c.type==='qa'?'hoi-dap':'bai-viet'}/${c.id}`;
  function create(context=null){const t={id:'CHAT-'+String(++state.sequence).padStart(3,'0'),title:'Cuộc trò chuyện mới',context,messages:[],mode:'ai',loading:false,input:'',email:'',handoffOpen:false};state.threads.unshift(t);state.current=t.id;return t;}
  function currentFor(r){let t=thread();const context=openContext(r.q.get('chu-de')||r.q.get('bai'));if(context&&(!t||t.context?.id!==context.id))t=create(context);if(!t)t=create();return t;}
  function contextBlock(t){return t.context?`<div class="chat-context ${t.context.catalog?'catalog-context':''}">${t.context.catalog?'Chủ đề · Pháp luật Việt Nam':'Về bài viết'}<strong>${esc(t.context.title)}</strong><a href="${t.context.catalog?'#/chu-de/'+t.context.groupId:contextURL(t.context)}">${t.context.catalog?'Xem lĩnh vực':'Đọc lại bài'}</a></div>`:'';}
  function newsCard(s){return `<article class="press-card"><a href="${contextURL(s)}" class="press-image-link" aria-label="${esc(s.title)}">${E.image(s.photo)}</a><div class="press-copy">${E.tag(s)}<h2><a href="${contextURL(s)}">${esc(s.title)}</a></h2><div class="press-source">${esc(s.sourceName)}</div></div></article>`;}
  function newsCTA(s){return `<section class="news-to-chat"><h2>Bạn cần hỏi thêm?</h2><a class="button" href="#/hoi-dap-ai?bai=${encodeURIComponent(s.id)}">Hỏi về bài viết ${icon('right')}</a></section>`;}
  const oldStory=E.story;
  E.story=(s,c)=>oldStory(s,c).replace('<section class="news-sources">',newsCTA(s)+'<section class="news-sources">');
  E.home=()=>`<section class="chat-hero"><div class="chat-hero-inner"><h1>Hỏi đáp pháp luật<br>cho người Việt tại Đức</h1><p class="intro">Tra cứu quy định, thủ tục tại Việt Nam và Đức.</p><form id="home-ask" class="ask-box"><label for="home-question" class="sr-only">Câu hỏi pháp luật</label><textarea id="home-question" name="question" maxlength="2000" required placeholder="Nhập câu hỏi của bạn…" ></textarea><div class="ask-bottom"><a class="ask-library" href="#/tra-cuu">Tra cứu thư viện ${icon('right')}</a><button class="button" type="submit">Gửi câu hỏi ${icon('arrow')}</button></div></form>${buttons()}</div></section><div class="container"><section class="chat-news"><div class="press-section-head"><h2>Tin pháp luật</h2><a class="text-link" href="#/tin-tuc">Xem tất cả ${icon('right')}</a></div><div class="press-grid">${['mindestlohn-2026','kindergeld-2026','deutschlandticket-2027'].map(id=>newsCard(E.find(id))).join('')}</div></section><section class="chat-news"><div class="press-section-head"><h2>Cẩm nang tại Đức</h2><a class="text-link" href="#/song-o-duc">Xem tất cả ${icon('right')}</a></div><div class="press-grid four">${['anmeldung-berlin','anh-so-the-cu-tru','tim-ausbildung','dong-xuan-berlin'].map(id=>newsCard(E.find(id))).join('')}</div></section></div>`;
  function sourceCard(a){return `<a class="chat-source ${a.catalog?'catalog-source':''}" href="${contextURL(a)}"><small>${a.catalog?'CHỦ ĐỀ LIÊN QUAN':'NỘI DUNG LIÊN QUAN'}</small><strong>${esc(a.title)} ${icon('right')}</strong><span>${a.catalog?'Pháp luật Việt Nam · '+esc(C.getGroup(a.groupId).title):esc(a.country)}</span></a>`;}
  function message(m){
    if(m.role==='user')return `<div class="chat-message user"><div class="chat-message-body">${esc(m.text)}</div></div>`;
    return `<div class="chat-status" role="status"><p>${esc(m.text)}</p>${(m.sources||(m.source?[m.source]:[])).map(sourceCard).join('')}<a class="text-link" href="#/tra-cuu">Tra cứu thư viện ${icon('right')}</a></div>`;
  }
  function handoffForm(t){return `<form id="handoff-form" class="chat-handoff" novalidate><h2>Liên hệ chuyên viên</h2><p>Gửi câu hỏi cùng nội dung trao đổi để chuyên viên xem xét.</p><label for="handoff-email">Email nhận phản hồi</label><input id="handoff-email" name="email" type="email" maxlength="254" value="${esc(t.email)}" placeholder="Email của bạn" autocomplete="email" aria-describedby="handoff-error"><div class="checkbox-row"><input type="checkbox" id="handoff-consent" name="consent"><label for="handoff-consent">Tôi đồng ý chuyển nội dung trao đổi cho chuyên viên. <a href="#/chinh-sach-thong-tin">Quyền riêng tư</a></label></div><p class="error" id="handoff-error" role="alert" tabindex="-1"></p><div class="button-row"><button class="button" type="submit">Gửi yêu cầu</button><button class="button secondary" type="button" data-cancel-handoff>Hủy</button></div></form>`;}
  function conversation(r){const t=currentFor(r);return `<div class="chat-shell"><aside class="chat-sidebar"><button class="button" data-new-chat>${icon('plus')} Cuộc trò chuyện mới</button><div class="chat-history"><div class="chat-side-label">Gần đây</div>${state.threads.map(x=>`<button data-thread="${x.id}" class="${x.id===t.id?'active':''}" ${x.id===t.id?'aria-current="true"':''}>${esc(x.title)}</button>`).join('')}</div><div class="chat-side-bottom"><a href="#/tra-cuu">${icon('book')} Thư viện kiến thức</a><a href="#/tin-tuc">Tin pháp luật ${icon('right')}</a></div></aside><section class="chat-main"><header class="chat-top"><div><h1>Hỏi đáp pháp luật</h1><p>Trợ lý AI</p></div><div class="chat-top-actions"><button class="icon-button chat-new-mobile" data-new-chat aria-label="Cuộc trò chuyện mới">${icon('plus')}</button><button class="button secondary" data-handoff>Gặp chuyên viên</button></div></header><div class="chat-log" id="chat-log" role="log" aria-label="Nội dung hội thoại" aria-live="polite">${contextBlock(t)}${!t.messages.length?`<div class="chat-welcome"><span class="chat-welcome-symbol">${icon('chat')}</span><h2>Bạn cần tìm hiểu vấn đề gì?</h2>${buttons()}</div>`:t.messages.map(message).join('')}${t.handoffOpen?handoffForm(t):''}</div><div class="chat-compose-wrap"><form id="chat-compose" class="chat-compose"><label for="chat-question" class="sr-only">Câu hỏi của bạn</label><textarea id="chat-question" name="question" maxlength="2000" required placeholder="Nhập câu hỏi của bạn…">${esc(t.input)}</textarea><button type="submit" aria-label="Gửi câu hỏi">${icon('arrow')}</button></form></div></section></div>`;}
  function workspace(title){return `<div class="container page"><div class="breadcrumb"><a href="#/">Trang chủ</a><span>/</span><span>${esc(title)}</span></div><div class="page-heading"><h1>${esc(title)}</h1><p>Đăng nhập để truy cập khu vực này.</p></div><a class="button" href="#/dang-nhap">Đăng nhập ${icon('right')}</a></div>`;}
  function process(){return `<div class="container page"><div class="page-heading" style="margin-top:32px"><h1>Trợ giúp</h1></div><div class="prose"><h2>Đặt câu hỏi</h2><p>Nêu vấn đề cần giải quyết và quốc gia liên quan. Bạn có thể hỏi tiếp trong cùng cuộc trò chuyện.</p><a class="text-link" href="#/hoi-dap-ai">Mở hỏi đáp ${icon('right')}</a><h2>Tìm trong thư viện</h2><p>Nhập từ khóa hoặc chọn lĩnh vực để xem nội dung liên quan.</p><a class="text-link" href="#/tra-cuu">Mở thư viện ${icon('right')}</a><h2>Hỏi từ bài viết</h2><p>Chọn “Hỏi về bài viết” ở cuối bài. Tên bài viết được giữ trong cuộc trò chuyện để bạn không cần tìm lại.</p></div></div>`;}

  function redraw(bottom=false,focus=false){if(!state.render)return;const pos=document.getElementById('chat-log')?.scrollTop||0;const y=scrollY;state.render();window.scrollTo(0,y);const log=document.getElementById('chat-log');if(log)log.scrollTop=bottom?log.scrollHeight:pos;if(focus)document.getElementById('chat-question')?.focus({preventScroll:true});}
  function submitQuestion(text){
    text=text.trim().slice(0,2000);if(!text)return;
    const t=thread()||create();if(!t.messages.length)t.title=text.slice(0,75);
    t.input='';t.messages.push({role:'user',text});
    // A live answer requires a server response. Do not manufacture advice or delivery receipts.
    const related=C.related(text,3);
    t.messages.push({role:'system',text:'Chưa thể trả lời câu hỏi lúc này. Bạn có thể tra cứu thư viện hoặc liên hệ chuyên viên.',sources:related});
    redraw(true,true);
  }

  function startQuestion(text){if(route().path!=='/hoi-dap-ai')create();if(route().path==='/hoi-dap-ai')submitQuestion(text);else{state.pendingQuestion=text;go('/hoi-dap-ai');}}
  function activateHandoff(){const t=thread()||create();t.handoffOpen=true;redraw(true);document.getElementById('handoff-email')?.focus({preventScroll:true});}
  document.addEventListener('input',e=>{if(e.target.id==='chat-question'&&thread())thread().input=e.target.value;if(e.target.id==='handoff-email'&&thread())thread().email=e.target.value;});
  document.addEventListener('keydown',e=>{if((e.target.id==='chat-question'||e.target.id==='home-question')&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();e.target.form.requestSubmit();}});
  document.addEventListener('click',e=>{const b=e.target.closest('button,a');if(!b)return;
    if(b.hasAttribute('data-ask-example'))startQuestion(b.dataset.askExample);
    else if(b.hasAttribute('data-new-chat')){create();if(route().path==='/hoi-dap-ai')redraw(false,true);else go('/hoi-dap-ai');}
    else if(b.hasAttribute('data-thread')){state.current=b.dataset.thread;history.replaceState(null,'','#/hoi-dap-ai');redraw(true);}
    else if(b.hasAttribute('data-handoff'))activateHandoff();
    else if(b.hasAttribute('data-cancel-handoff')){thread().handoffOpen=false;redraw(true,true);}
  });
  document.addEventListener('submit',e=>{const f=e.target;if(!(f instanceof HTMLFormElement))return;
    if(f.id==='home-ask'){e.preventDefault();startQuestion(f.elements.question.value);}
    else if(f.id==='chat-compose'){e.preventDefault();submitQuestion(f.elements.question.value);}
    else if(f.id==='handoff-form'){
      e.preventDefault();const error=document.getElementById('handoff-error'),email=f.elements.email;
      if(!f.elements.consent.checked){error.textContent='Vui lòng đồng ý chuyển nội dung trao đổi.';f.elements.consent.focus();return;}
      if(!email.value.trim()||!email.validity.valid){error.textContent='Vui lòng nhập email hợp lệ.';email.focus();return;}
      error.textContent='Chưa gửi được yêu cầu cho chuyên viên. Nội dung trao đổi vẫn được giữ trên trang; vui lòng thử lại sau.';error.focus();
    }
  });

  window.LVD_CHAT={
    accepts:r=>['/hoi-dap-ai','/chuyen-vien','/thu-vien-quan-tri','/so-do'].includes(r.path),
    view:r=>r.path==='/hoi-dap-ai'?conversation(r):r.path==='/chuyen-vien'?workspace('Hộp thư chuyên viên'):r.path==='/thu-vien-quan-tri'?workspace('Quản lý kiến thức'):process(),
    afterRender(r,render){state.render=render;document.body.classList.toggle('chat-mode',r.path==='/hoi-dap-ai');document.querySelectorAll('.desktop-nav a').forEach(a=>{const active=a.dataset.nav==='chat'?r.path==='/'||r.path==='/hoi-dap-ai':a.dataset.nav==='lookup'?/^\/(tra-cuu|chu-de|hoi-dap|tim-kiem)(\/|$)/.test(r.path):a.dataset.nav==='news'?/^\/(tin|tin-tuc|song-o-duc|bai-viet|cong-dong)/.test(r.path):false;if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});if(r.path==='/hoi-dap-ai'&&state.pendingQuestion){const q=state.pendingQuestion;state.pendingQuestion='';queueMicrotask(()=>submitQuestion(q));}}
  };
})();

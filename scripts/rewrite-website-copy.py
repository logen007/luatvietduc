"""One-time source rewrite. Preserve news facts, sources, imagery and the monochrome layout."""
from pathlib import Path
import re,json,subprocess
R=Path.cwd()
def load(p):return (R/p).read_text()
def save(p,s):(R/p).write_text(s)
def between(s,start,end,new):
 assert s.count(start)==1,(start,s.count(start))
 a=s.index(start);b=s.index(end,a)
 return s[:a]+new+'\n'+s[b:]
s=load('index.html').replace('0.5.1','0.5.2')
s=s.replace('Luật Việt Đức — hỏi đáp pháp luật từ thư viện kiến thức, kết nối chuyên viên khi cần. Bản duyệt giao diện, chưa kết nối AI thật.','Luật Việt Đức — hỏi đáp, tra cứu pháp luật và thông tin thiết thực dành cho người Việt tại Đức.')
s=s.replace('<span>Bản xem thử · Chưa tiếp nhận yêu cầu thật.</span>','<span>Thông tin pháp luật Việt Nam – Đức</span>')
s=s.replace('>Chính sách thông tin<','>Quyền riêng tư<').replace('>Về chuyên trang<','>Giới thiệu<')
s=s.replace('aria-label="Tài khoản của tôi"','aria-label="Đăng nhập"')
s=s.replace('Tìm trong thư viện, tin pháp luật và cẩm nang.','Nhập chủ đề, từ khóa hoặc tên thủ tục.').replace('>Bạn đang tìm điều gì?<','>Tìm kiếm<')
s=s.replace('<a class="button" href="#/hoi-dap-ai">Đặt câu hỏi <span data-icon="arrow"></span></a></nav></dialog>','</nav></dialog>')
save('index.html',s)
s=load('assets/app.js')
s=s.replace('<span>Bài mẫu</span>','').replace(' · Bài mẫu','').replace('Xem cấu trúc bản tin','Đọc bài').replace('Khám phá cẩm nang','Đọc bài')
s=between(s,'  const notice = () =>','  function homeView()', '')
s=between(s,'  function homeView(){','  const selectOptions', '')
s=s.replace('nội dung minh họa','nội dung').replace('câu trả lời mẫu','nội dung').replace('nội dung mẫu','nội dung')
s=s.replace('Tìm trong tin tức, cẩm nang và hỏi đáp. Có thể nhập tiếng Việt có dấu hoặc không dấu.','').replace('Chọn chủ đề hoặc nhập từ khóa cần tìm.','Tìm theo chủ đề, tình huống hoặc từ khóa.')
s=s.replace('Chưa có nội dung phù hợp','Không tìm thấy kết quả').replace('Thử từ khóa ngắn hơn, bỏ một vài bộ lọc hoặc mô tả điều bạn cần tìm hiểu.','Thử từ khóa khác hoặc bỏ bớt bộ lọc.')
s=s.replace('Bỏ các bộ lọc','Xóa bộ lọc').replace('Áp dụng bộ lọc','Áp dụng')
s=s.replace('Chưa tìm thấy điều bạn cần?','Bạn có câu hỏi khác?').replace('Đặt câu hỏi về tình huống riêng. Không cần tạo tài khoản trước.','')
s=s.replace('class="button" href="#/gui-cau-hoi">Gửi câu hỏi','class="button" href="#/hoi-dap-ai">Đặt câu hỏi')
s=between(s,'  function articleView(a){','  function toast(text)',r'''  function articleView(a){
    if(!a) return notFound();
    if(a.editorial) return window.LVD_EDITORIAL.story(a,{saved:savedSet().has(a.id)});
    const related=DATA.articles.filter(x=>x.id!==a.id&&(x.topic===a.topic||x.situations.some(s=>a.situations.includes(s)))).slice(0,3);
    return `<div class="container page">${crumb('Thư viện',['Tra cứu','#/tra-cuu'])}<header class="article-head">${meta(a)}<h1>${esc(a.title)}</h1><p>${esc(a.summary)}</p></header><div class="article-meta"><div class="meta"><span>${esc(topicName(a.topic))}</span></div><div class="button-row"><button class="button secondary" data-save="${a.id}">${icon('bookmark')}Lưu bài</button><button class="button quiet" data-copy>${icon('link')}Chia sẻ</button></div></div><div class="article-layout"><article class="article-body"><section class="answer-box" id="answer"><h2>Thông tin cần làm rõ</h2><p>Để tìm hiểu đúng thủ tục, bạn nên xác định những thông tin sau:</p><ul class="clean-list">${a.checks.map(t=>`<li>${icon('check')}<span>${esc(t)}</span></li>`).join('')}</ul></section><section class="article-section" id="questions"><h2>Hỏi về trường hợp của bạn</h2><p>Nêu công việc cần giải quyết, nơi thực hiện và điều bạn còn băn khoăn. Không gửi số hộ chiếu, thông tin ngân hàng hoặc giấy tờ cá nhân trong câu hỏi.</p><a class="button" href="${url('/hoi-dap-ai',{bai:a.id})}">Đặt câu hỏi ${icon('arrow')}</a></section>${related.length?`<section class="article-section"><h2>Nội dung liên quan</h2><div class="question-list">${related.map(questionRow).join('')}</div></section>`:''}</article><aside class="article-aside"><details class="toc" open><summary>Trong bài viết</summary><nav aria-label="Mục lục"><a href="${articleURL(a)}" data-scroll="answer">Thông tin cần làm rõ</a><a href="${articleURL(a)}" data-scroll="questions">Đặt câu hỏi</a></nav></details></aside></div></div>`;
  }
  function aboutView(){return `<div class="container page">${crumb('Giới thiệu')}${heading('Về Luật Việt Đức','Chuyên trang hỏi đáp và thông tin pháp luật dành cho người Việt tại Đức.')}<div class="prose"><p>Luật Việt Đức tập trung vào những vấn đề pháp luật gắn với cuộc sống tại Đức và các công việc cần giải quyết tại Việt Nam: cư trú, lao động, gia đình, nhà đất, thừa kế và ủy quyền.</p><h2>Hỏi đáp pháp luật</h2><p>Đặt câu hỏi từ tình huống của bạn hoặc tìm nội dung có sẵn trong thư viện. Khi đọc một bài viết, bạn có thể chọn “Hỏi về bài viết” để tiếp tục tìm hiểu.</p><h2>Thư viện kiến thức</h2><p>Nội dung được sắp xếp theo lĩnh vực và tình huống. Tìm bằng từ khóa hoặc chọn chủ đề để xem các vấn đề liên quan.</p><h2>Tin pháp luật và cẩm nang</h2><p>Các bài viết giới thiệu quy định, chính sách và thủ tục đáng chú ý với cộng đồng người Việt tại Đức. Đường dẫn nguồn gốc được đặt trong từng bài để bạn đọc đầy đủ thông tin.</p><h2>Góp ý nội dung</h2><p>Phát hiện thông tin cần sửa hoặc có chủ đề muốn tìm hiểu? Hãy gửi đường dẫn bài viết cùng nội dung góp ý.</p><a class="text-link" href="#/gui-cau-hoi?muc-dich=feedback">Gửi góp ý ${icon('arrow')}</a></div></div>`;}
  function field(name,label,type='text',value='',optional=false){return `<div class="field"><label for="${name}">${label}${optional?' <span class="muted">(không bắt buộc)</span>':' <span class="required">*</span>'}</label><input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${optional?'':'required'} ${type==='email'?'maxlength="254"':'maxlength="120"'} aria-describedby="${name}-error" autocomplete="${type==='email'?'email':name==='name'?'name':'off'}"><div class="error" id="${name}-error" role="alert"></div></div>`;}
  function contactView(route){
    const d=state.draft,context=article(route.q.get('bai')),purpose=route.q.get('muc-dich')||d.purpose||'question',feedback=purpose==='feedback';
    return `<div class="container page">${crumb(feedback?'Góp ý nội dung':'Liên hệ')}${heading(feedback?'Góp ý nội dung':'Gửi yêu cầu',feedback?'Cho chúng tôi biết bài viết và thông tin cần sửa.':'Mô tả vấn đề bạn cần hỗ trợ và để lại email liên hệ.')}<div class="contact-layout"><form id="contact-form" class="form-card" novalidate>${context?`<div class="notice info">Về bài viết: <strong>${esc(context.title)}</strong></div><input name="context" type="hidden" value="${esc(context.id)}">`:''}<div class="field"><label for="purpose">Nội dung liên hệ</label><select id="purpose" name="purpose">${selectOptions([['question','Câu hỏi pháp luật'],['discussion','Đề nghị trao đổi'],['feedback','Góp ý nội dung']],purpose)}</select></div><div class="field"><label for="question">Nội dung <span class="required">*</span></label><textarea id="question" name="question" required maxlength="3000" placeholder="Nêu vấn đề bạn cần hỗ trợ…" aria-describedby="question-hint question-error">${esc(d.question||'')}</textarea><small id="question-hint">Tối đa 3.000 ký tự. Không gửi số hộ chiếu, thông tin tài khoản hoặc giấy tờ cá nhân.</small><div id="question-error" class="error" role="alert"></div></div><div class="field" id="topic-field" ${feedback?'hidden':''}><label for="topic">Lĩnh vực</label><select id="topic" name="topic">${selectOptions([['unknown','Chưa xác định'],...DATA.topics.map(t=>[t[0],t[1]])],d.topic||context?.topic||'unknown')}</select></div><div class="field-row">${field('name','Họ và tên','text',d.name||'')}${field('email','Email liên hệ','email',d.email||'')}</div><div class="checkbox-row"><input id="consent" name="consent" type="checkbox" ${d.consent?'checked':''} aria-describedby="consent-error"><div><label for="consent">Tôi đồng ý sử dụng thông tin liên hệ để phản hồi yêu cầu này. <a href="#/chinh-sach-thong-tin">Quyền riêng tư</a></label><div id="consent-error" class="error" role="alert"></div></div></div><div id="form-error" class="notice" role="alert" tabindex="-1" hidden></div><button type="submit" class="button">${feedback?'Gửi góp ý':'Gửi yêu cầu'} ${icon('arrow')}</button></form><aside class="contact-aside"><h3>Tìm trong thư viện</h3><p class="muted">Tra cứu chủ đề liên quan trước khi gửi yêu cầu.</p><a class="text-link" href="#/tra-cuu">Mở thư viện ${icon('arrow')}</a><hr style="border:0;border-top:1px solid #ddd;margin:24px 0"><h3>Hỏi đáp pháp luật</h3><a class="text-link" href="#/hoi-dap-ai">Đặt câu hỏi ${icon('arrow')}</a></aside></div></div>`;
  }
  function successView(){return `<div class="container page">${crumb('Yêu cầu')}${heading('Chưa có yêu cầu được xác nhận','Trở lại biểu mẫu để kiểm tra nội dung và gửi yêu cầu.')}<a class="button" href="#/gui-cau-hoi">Trở lại biểu mẫu ${icon('arrow')}</a></div>`;}
  function authView(){return `<div class="container page"><div class="auth-wrap"><h1>Đăng nhập</h1><p>Nhập email để nhận mã đăng nhập.</p><div class="form-card"><form id="email-form" novalidate>${field('login-email','Email','email',state.pending?.email||'')}<button class="button full" type="submit">Nhận mã đăng nhập ${icon('arrow')}</button></form></div><a class="text-link" href="#/tra-cuu">Tiếp tục đọc không cần đăng nhập ${icon('arrow')}</a></div></div>`;}
  function accountView(){return authView();}
  function threadView(){return authView();}
  function policyView(kind){const privacy=kind==='privacy';return `<div class="container page">${crumb(privacy?'Quyền riêng tư':'Điều khoản sử dụng')}${heading(privacy?'Quyền riêng tư':'Điều khoản sử dụng')}<div class="prose">${privacy?`<h2>Thông tin bạn nhập</h2><p>Nội dung nhập vào ô hỏi đáp và biểu mẫu hiện được giữ trong bộ nhớ của trang, không gửi đến dịch vụ xử lý yêu cầu. Tải lại hoặc đóng trang sẽ xóa nội dung này.</p><h2>Thông tin cá nhân</h2><p>Không cung cấp số hộ chiếu, số tài khoản ngân hàng, mật khẩu hoặc giấy tờ cá nhân trong câu hỏi. Chỉ nêu những thông tin cần thiết để mô tả vấn đề.</p><h2>Truy cập website</h2><p>Website không tích hợp công cụ phân tích người dùng. Đơn vị lưu trữ có thể ghi nhật ký truy cập để cung cấp dịch vụ. Các website được liên kết trong bài áp dụng chính sách riêng.</p>`:`<h2>Phạm vi thông tin</h2><p>Nội dung trên Luật Việt Đức phục vụ việc tìm hiểu pháp luật và thủ tục. Thông tin chung không thay thế việc xem xét hồ sơ của từng trường hợp.</p><h2>Nguồn và thời điểm</h2><p>Khi áp dụng quy định, hãy đọc nguồn gốc được dẫn trong bài và kiểm tra phạm vi, điều kiện cùng thời điểm áp dụng. Ngày đối chiếu nguồn không phải ngày ban hành văn bản.</p><h2>Sử dụng nội dung và hình ảnh</h2><p>Vui lòng ghi rõ nguồn khi trích dẫn. Hình ảnh có thông tin tác giả và giấy phép riêng tại mục Nguồn ảnh.</p>`}<a class="text-link" href="#/ve-chuyen-trang">Về Luật Việt Đức ${icon('arrow')}</a></div></div>`;}
  function reviewView(){return `<div class="container page">${crumb('Trợ giúp')}${heading('Trợ giúp')}<div class="prose"><h2>Đặt câu hỏi</h2><p>Nêu vấn đề cần giải quyết và quốc gia liên quan. Bạn có thể hỏi tiếp trong cùng cuộc trò chuyện.</p><h2>Tra cứu kiến thức</h2><p>Nhập từ khóa trong thư viện hoặc chọn một lĩnh vực để xem nội dung liên quan.</p><h2>Hỏi từ bài viết</h2><p>Chọn “Hỏi về bài viết” ở cuối bài. Tên bài viết sẽ được giữ trong cuộc trò chuyện.</p></div></div>`;}
  function notFound(){return `<div class="container page not-found">${heading('Không tìm thấy trang','Đường dẫn có thể đã thay đổi hoặc nội dung không còn được cung cấp.')}<div class="button-row"><a class="button secondary" href="#/">Về trang chủ</a><a class="button" href="#/tra-cuu">Tra cứu thư viện ${icon('arrow')}</a></div></div>`;}
''')
s=between(s,'  function login(email,seed=false){',"  document.querySelectorAll('[data-icon]')",r'''  function captureDraft(form){const data=Object.fromEntries(new FormData(form));state.draft={...data,consent:form.elements.consent.checked};return state.draft;}
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
''')
s=re.sub(r"    if\(document.getElementById\('resend-code'\)\).*?\n",'',s)
save('assets/app.js',s)
s=load('assets/chat-first.js')
s=s.replace('aria-describedby="home-demo"','').replace('<p class="demo-fine" id="home-demo">Bản xem thử: câu trả lời mẫu, chưa kết nối AI hoặc chuyên viên.</p>','')
s=s.replace('Tìm hiểu quy định và thủ tục tại Việt Nam, Đức.','Tra cứu quy định, thủ tục tại Việt Nam và Đức.')
s=s.replace('Bạn có câu hỏi về nội dung này?','Bạn cần hỏi thêm?').replace('>Hỏi thêm ${icon(\'right\')}','>Hỏi về bài viết ${icon(\'right\')}').replace('Thư viện pháp luật','Thư viện kiến thức')
s=between(s,'  function sourceCard(a){','  function redraw(',r'''  function sourceCard(a){return `<a class="chat-source" href="${contextURL(a)}"><small>NỘI DUNG LIÊN QUAN</small><strong>${esc(a.title)} ${icon('right')}</strong><span>${esc(a.country)}</span></a>`;}
  function message(m){
    if(m.role==='user')return `<div class="chat-message user"><div class="chat-message-body">${esc(m.text)}</div></div>`;
    return `<div class="chat-status" role="status"><p>${esc(m.text)}</p>${m.source?sourceCard(m.source):''}<a class="text-link" href="#/tra-cuu">Tra cứu thư viện ${icon('right')}</a></div>`;
  }
  function handoffForm(t){return `<form id="handoff-form" class="chat-handoff" novalidate><h2>Liên hệ chuyên viên</h2><p>Gửi câu hỏi cùng nội dung trao đổi để chuyên viên xem xét.</p><label for="handoff-email">Email nhận phản hồi</label><input id="handoff-email" name="email" type="email" maxlength="254" value="${esc(t.email)}" placeholder="Email của bạn" autocomplete="email" aria-describedby="handoff-error"><div class="checkbox-row"><input type="checkbox" id="handoff-consent" name="consent"><label for="handoff-consent">Tôi đồng ý chuyển nội dung trao đổi cho chuyên viên. <a href="#/chinh-sach-thong-tin">Quyền riêng tư</a></label></div><p class="error" id="handoff-error" role="alert" tabindex="-1"></p><div class="button-row"><button class="button" type="submit">Gửi yêu cầu</button><button class="button secondary" type="button" data-cancel-handoff>Hủy</button></div></form>`;}
  function conversation(r){const t=currentFor(r);return `<div class="chat-shell"><aside class="chat-sidebar"><button class="button" data-new-chat>${icon('plus')} Cuộc trò chuyện mới</button><div class="chat-history"><div class="chat-side-label">Gần đây</div>${state.threads.map(x=>`<button data-thread="${x.id}" class="${x.id===t.id?'active':''}" ${x.id===t.id?'aria-current="true"':''}>${esc(x.title)}</button>`).join('')}</div><div class="chat-side-bottom"><a href="#/tra-cuu">${icon('book')} Thư viện kiến thức</a><a href="#/tin-tuc">Tin pháp luật ${icon('right')}</a></div></aside><section class="chat-main"><header class="chat-top"><div><h1>Hỏi đáp pháp luật</h1><p>Trợ lý AI</p></div><div class="chat-top-actions"><button class="icon-button chat-new-mobile" data-new-chat aria-label="Cuộc trò chuyện mới">${icon('plus')}</button><button class="button secondary" data-handoff>Gặp chuyên viên</button></div></header><div class="chat-log" id="chat-log" role="log" aria-label="Nội dung hội thoại" aria-live="polite">${contextBlock(t)}${!t.messages.length?`<div class="chat-welcome"><span class="chat-welcome-symbol">${icon('chat')}</span><h2>Bạn cần tìm hiểu vấn đề gì?</h2>${buttons()}</div>`:t.messages.map(message).join('')}${t.handoffOpen?handoffForm(t):''}</div><div class="chat-compose-wrap"><form id="chat-compose" class="chat-compose"><label for="chat-question" class="sr-only">Câu hỏi của bạn</label><textarea id="chat-question" name="question" maxlength="2000" required placeholder="Nhập câu hỏi của bạn…">${esc(t.input)}</textarea><button type="submit" aria-label="Gửi câu hỏi">${icon('arrow')}</button></form></div></section></div>`;}
  function workspace(title){return `<div class="container page"><div class="breadcrumb"><a href="#/">Trang chủ</a><span>/</span><span>${esc(title)}</span></div><div class="page-heading"><h1>${esc(title)}</h1><p>Đăng nhập để truy cập khu vực này.</p></div><a class="button" href="#/dang-nhap">Đăng nhập ${icon('right')}</a></div>`;}
  function process(){return `<div class="container page"><div class="page-heading" style="margin-top:32px"><h1>Trợ giúp</h1></div><div class="prose"><h2>Đặt câu hỏi</h2><p>Nêu vấn đề cần giải quyết và quốc gia liên quan. Bạn có thể hỏi tiếp trong cùng cuộc trò chuyện.</p><a class="text-link" href="#/hoi-dap-ai">Mở hỏi đáp ${icon('right')}</a><h2>Tìm trong thư viện</h2><p>Nhập từ khóa hoặc chọn lĩnh vực để xem nội dung liên quan.</p><a class="text-link" href="#/tra-cuu">Mở thư viện ${icon('right')}</a><h2>Hỏi từ bài viết</h2><p>Chọn “Hỏi về bài viết” ở cuối bài. Tên bài viết được giữ trong cuộc trò chuyện để bạn không cần tìm lại.</p></div></div>`;}
''')
s=between(s,'  function submitQuestion(text){','  function startQuestion(',r'''  function submitQuestion(text){
    text=text.trim().slice(0,2000);if(!text)return;
    const t=thread()||create();if(!t.messages.length)t.title=text.slice(0,75);
    t.input='';t.messages.push({role:'user',text});
    // A live answer requires a server response. Do not manufacture advice or delivery receipts.
    const q=norm(text),key=/uy quyen/.test(q)?'uy-quyen-quan-ly-nha':/thua ke/.test(q)?'nhan-thua-ke-tai-viet-nam':/quoc tich|ho chieu/.test(q)?'ho-chieu-quoc-tich':null;
    const related=K.articles.find(a=>a.id===key);
    t.messages.push({role:'system',text:'Chưa thể trả lời câu hỏi lúc này. Bạn có thể tra cứu thư viện hoặc thử lại sau.',source:related||null});
    redraw(true,true);
  }
''')
s=between(s,'  function activateHandoff(){','  window.LVD_CHAT=',r'''  function activateHandoff(){const t=thread()||create();t.handoffOpen=true;redraw(true);document.getElementById('handoff-email')?.focus({preventScroll:true});}
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
''')
s=s.replace("r.path==='/chuyen-vien'?inbox(r):r.path==='/thu-vien-quan-tri'?knowledgeView():process()","r.path==='/chuyen-vien'?workspace('Hộp thư chuyên viên'):r.path==='/thu-vien-quan-tri'?workspace('Quản lý kiến thức'):process()")
s=s.replace("'CHAT-MAU-'","'CHAT-'").replace('/* Interface prototype only. No AI calls, personal data storage or real operator queue. */','/* Public conversation UI. Server-dependent actions require an actual response before success. */')
save('assets/chat-first.js',s)
save('assets/chat-router.js',load('assets/chat-router.js').replace(' · Bản duyệt','').replace('local demo data','ephemeral browser state'))
s=load('assets/newsroom.js')
s=s.replace('Thông tin được đối chiếu nguồn ngày 19.10.2026. Tin có ngày nguồn; cẩm nang không được giả lập thành tin mới.','').replace('<div class="press-reading-note"></div>','')
s=s.replace('Chưa có bài ở lựa chọn này.','Không tìm thấy bài viết').replace('Thử bỏ bộ lọc hoặc xem tất cả thông tin chọn lọc.','Thử từ khóa khác hoặc xem tất cả bài viết.').replace('bài chọn lọc','bài viết').replace('>CHUYÊN MỤC<','>LUẬT VIỆT ĐỨC<')
s=s.replace('Nội dung tham khảo, chưa kiểm duyệt pháp lý. Vui lòng xem nguồn đầy đủ trước khi áp dụng.','Xem nguồn gốc để đọc đầy đủ phạm vi và điều kiện áp dụng.').replace('>Đọc nguồn gốc<','>Nguồn thông tin<')
s=s.replace('Tám ảnh được chọn từ Unsplash và Wikimedia Commons. Bản đen trắng được lưu trực tiếp trên website, không gọi máy chủ ảnh bên ngoài khi người đọc truy cập.','Thông tin tác giả, ảnh gốc và giấy phép sử dụng hình ảnh trên Luật Việt Đức.')
s=s.replace('Chuyển đen trắng, thu nhỏ và đổi định dạng WebP. Không thêm hoặc tạo sinh chi tiết.','Ảnh đã chuyển đen trắng, điều chỉnh kích thước và định dạng.').replace('Biên tập hình ảnh: chuyển đen trắng, thu nhỏ, đổi WebP; khung ảnh có thể cắt cúp.','Ảnh đã chuyển đen trắng và điều chỉnh kích thước.')
s=s.replace('Ảnh minh họa không được coi là bằng chứng về một sự kiện, danh tính, tình trạng pháp lý hoặc hoàn cảnh của người trong ảnh. Bản chuyển đổi ảnh Dong Xuan Center tiếp tục mang giấy phép CC BY-SA 3.0; giấy phép này áp dụng cho ảnh, không tự động áp dụng cho toàn bộ website.','Ảnh minh họa và ảnh tư liệu được ghi rõ trong chú thích. Ảnh Dong Xuan Center sử dụng giấy phép CC BY-SA 3.0; giấy phép này áp dụng riêng cho ảnh.')
s=s.replace('href="#/gui-cau-hoi">Đặt câu hỏi','href="#/hoi-dap-ai">Đặt câu hỏi')
s=between(s,'  function home(){','  function listing(route){','  function home(){return "";}')
save('assets/newsroom.js',s)
# Existing article checklists remain unchanged. Empty editorial placeholders are not published.
code="const vm=require('vm'),fs=require('fs'),s={window:{}};vm.runInNewContext(fs.readFileSync('assets/content.js','utf8'),s);console.log(JSON.stringify(s.window.LVD_CONTENT));"
d=json.loads(subprocess.check_output(['node','-e',code]));d['version']='0.5.2';d['articles']=[a for a in d['articles'] if a['type']!='news']
patches={'cam-nang-uy-quyen':('Ủy quyền từ Đức: những vấn đề cần tìm hiểu','Xác định công việc cần ủy quyền, giấy tờ liên quan và nơi sử dụng văn bản.'),'cam-nang-tai-san':('Quản lý tài sản tại Việt Nam khi sống ở Đức','Sắp xếp thông tin về tài sản, nhu cầu quản lý và các bên liên quan.'),'cam-nang-nguon-tin':('Cách kiểm tra nguồn thông tin pháp luật','Đọc phạm vi bài viết, kiểm tra nguồn gốc và ghi lại những điểm cần làm rõ.')}
for a in d['articles']:
 if a['id'] in patches:a['title'],a['summary']=patches[a['id']]
save('assets/content.js',"'use strict';\nwindow.LVD_CONTENT = Object.freeze("+json.dumps(d,ensure_ascii=False,indent=2)+");\n")
code="const vm=require('vm'),fs=require('fs'),s={window:{LVD_CONTENT:{articles:[]}}};vm.runInNewContext(fs.readFileSync('assets/news-content.js','utf8'),s);console.log(JSON.stringify(s.window.LVD_NEWS));"
n=json.loads(subprocess.check_output(['node','-e',code]))
cap={'deutschlandticket-2027':'Tàu điện tại Berlin. Ảnh minh họa.','mindestlohn-2026':'Công việc pha chế. Ảnh minh họa.','kindergeld-2026':'Ảnh minh họa gia đình.','anmeldung-berlin':'Nhà ở tại Berlin. Ảnh minh họa.','anh-so-the-cu-tru':'Friedrichstraße, Berlin. Ảnh minh họa.','tim-ausbildung':'Thư viện Stuttgart. Ảnh minh họa.','dong-xuan-berlin':'Cổng Dong Xuan Center, Berlin. Ảnh tư liệu ngày 12/04/2012; bản đen trắng theo CC BY-SA 3.0.','minijob-603':'Ảnh minh họa công việc.','hoc-tieng-duc':'Thư viện Stuttgart. Ảnh minh họa.','ho-chieu-duc-ve-viet-nam':'Phương tiện công cộng tại Berlin. Ảnh minh họa.'}
for a in n['stories']:a['caption']=cap[a['id']]
for x in n['photos']:x['note']='Ảnh tư liệu ngày 12/04/2012. Bản đen trắng, điều chỉnh kích thước theo giấy phép CC BY-SA 3.0.' if x['id']=='dong-xuan' else 'Ảnh minh họa.'
save('assets/news-content.js',"'use strict';\nwindow.LVD_NEWS = "+json.dumps(n,ensure_ascii=False,indent=2)+";\nwindow.LVD_CONTENT.articles.push(...window.LVD_NEWS.stories);\n")
print('Website copy rewritten; original factual news content and sources preserved.')

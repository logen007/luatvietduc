"""One-time, reviewed public-copy migration. No user records or external services."""
from pathlib import Path
import re


def replace_line(text, prefix, replacement):
    lines=text.splitlines()
    matches=[i for i,line in enumerate(lines) if line.lstrip().startswith(prefix)]
    assert len(matches)==1,(prefix,len(matches))
    lines[matches[0]]=replacement
    return '\n'.join(lines)+'\n'

p=Path('assets/chat-first.js');s=p.read_text()
s=replace_line(s,'const prompts=',"  const prompts=['Ủy quyền','Thừa kế','Cư trú','Lao động'];")
s=replace_line(s,'const buttons=',"  const buttons=()=>`<div class=\"chat-prompts\">${prompts.map(p=>`<button type=\"button\" data-ask-example=\"${esc(p==='Ủy quyền'?'Tôi muốn ủy quyền từ Đức':p==='Thừa kế'?'Tôi có tài sản thừa kế tại Việt Nam':p==='Cư trú'?'Tôi cần hỏi về giấy phép cư trú tại Đức':'Tôi cần hỏi về hợp đồng lao động tại Đức')}\">${esc(p)}</button>`).join('')}</div>`;")
s=replace_line(s,'function contextBlock',"  function contextBlock(t){return t.context?`<div class=\"chat-context\">Về bài viết<strong>${esc(t.context.title)}</strong><a href=\"${contextURL(t.context)}\">Đọc lại bài</a></div>`:'';}")
s=replace_line(s,'function newsCTA',"  function newsCTA(s){return `<section class=\"news-to-chat\"><h2>Bạn có câu hỏi về nội dung này?</h2><a class=\"button\" href=\"#/hoi-dap-ai?bai=${encodeURIComponent(s.id)}\">Hỏi thêm ${icon('right')}</a></section>`;}")
s=replace_line(s,'E.home=',r'''  E.home=()=>`<section class="chat-hero"><div class="chat-hero-inner"><h1>Hỏi đáp pháp luật<br>cho người Việt tại Đức</h1><p class="intro">Tìm hiểu quy định và thủ tục tại Việt Nam, Đức.</p><form id="home-ask" class="ask-box"><label for="home-question" class="sr-only">Câu hỏi pháp luật</label><textarea id="home-question" name="question" maxlength="2000" required placeholder="Nhập câu hỏi của bạn…" aria-describedby="home-demo"></textarea><div class="ask-bottom"><a class="ask-library" href="#/tra-cuu">Tra cứu thư viện ${icon('right')}</a><button class="button" type="submit">Gửi câu hỏi ${icon('arrow')}</button></div></form>${buttons()}<p class="demo-fine" id="home-demo">Bản xem thử: câu trả lời mẫu, chưa kết nối AI hoặc chuyên viên.</p></div></section><div class="container"><section class="chat-news"><div class="press-section-head"><h2>Tin pháp luật</h2><a class="text-link" href="#/tin-tuc">Xem tất cả ${icon('right')}</a></div><div class="press-grid">${['mindestlohn-2026','kindergeld-2026','deutschlandticket-2027'].map(id=>newsCard(E.find(id))).join('')}</div></section><section class="chat-news"><div class="press-section-head"><h2>Cẩm nang tại Đức</h2><a class="text-link" href="#/song-o-duc">Xem tất cả ${icon('right')}</a></div><div class="press-grid four">${['anmeldung-berlin','anh-so-the-cu-tru','tim-ausbildung','dong-xuan-berlin'].map(id=>newsCard(E.find(id))).join('')}</div></section></div>`;''')
s=replace_line(s,'function sourceCard',r'''  function sourceCard(a){return `<a class="chat-source" href="#/hoi-dap/${a.id}"><small>BÀI LIÊN QUAN</small><strong>${esc(a.title)} ↗</strong><span>${esc(a.country)} · Chưa kiểm duyệt</span></a>`;}''')
s=replace_line(s,'function handoffForm',r'''  function handoffForm(t){return `<form id="handoff-form" class="chat-handoff" novalidate><h2>Chuyển cho chuyên viên</h2><p>Nội dung trao đổi sẽ được gửi kèm, không cần trình bày lại.</p><label for="handoff-email">Email nhận phản hồi (tùy chọn)</label><input id="handoff-email" name="email" type="email" maxlength="254" value="${esc(t.email)}" placeholder="Email của bạn" autocomplete="off"><div class="checkbox-row"><input type="checkbox" id="handoff-consent" name="consent"><label for="handoff-consent">Tôi đồng ý chuyển nội dung trao đổi cho chuyên viên.</label></div><p class="error" id="handoff-error" role="alert"></p><div class="button-row"><button class="button" type="submit">Gửi yêu cầu</button><button class="button secondary" type="button" data-cancel-handoff>Quay lại</button></div><p class="demo-fine">Bản xem thử: chưa gửi yêu cầu hoặc email. Không nhập thông tin thật.</p></form>`;}''')
s=replace_line(s,'function conversation',r'''  function conversation(r){const t=currentFor(r);const mode=t.mode==='queued'?'Chờ chuyên viên · Bản xem thử':t.mode==='specialist'?'Chuyên viên · Bản xem thử':'Trợ lý AI · Bản xem thử';return `<div class="chat-shell"><aside class="chat-sidebar"><button class="button" data-new-chat>${icon('plus')} Cuộc trò chuyện mới</button><div class="chat-history"><div class="chat-side-label">Gần đây</div>${state.threads.map(x=>`<button data-thread="${x.id}" class="${x.id===t.id?'active':''}" ${x.id===t.id?'aria-current="true"':''}>${esc(x.title)}</button>`).join('')}</div><div class="chat-side-bottom"><a href="#/tra-cuu">${icon('book')} Thư viện pháp luật</a><a href="#/tin-tuc">Tin pháp luật ↗</a><p>Lịch sử được xóa khi tải lại trang.</p></div></aside><section class="chat-main"><header class="chat-top"><div><h1>Hỏi đáp pháp luật</h1><p>${mode}</p></div><div class="chat-top-actions"><button class="icon-button chat-new-mobile" data-new-chat aria-label="Cuộc trò chuyện mới">${icon('plus')}</button><button class="button secondary" data-handoff ${t.mode!=='ai'?'disabled':''}>${t.mode==='ai'?'Gặp chuyên viên':'Đã chuyển yêu cầu'}</button></div></header><div class="chat-log" id="chat-log" role="log" aria-label="Nội dung hội thoại" aria-live="polite">${contextBlock(t)}${!t.messages.length?`<div class="chat-welcome"><span class="chat-welcome-symbol">${icon('chat')}</span><h2>Bạn muốn hỏi gì?</h2><p>Nhập câu hỏi hoặc chọn một chủ đề.</p>${buttons()}</div>`:t.messages.map(message).join('')}${t.loading?'<div class="chat-status" role="status">Đang tra cứu…</div>':''}${t.handoffOpen?handoffForm(t):''}${t.mode!=='ai'?`<div class="chat-status">${t.mode==='queued'?'Đã tạo yêu cầu mẫu. Chưa có chuyên viên tiếp nhận thật.':'Chuyên viên đang xử lý trong bản xem thử. AI đã dừng trả lời.'}</div>`:''}</div><div class="chat-compose-wrap"><form id="chat-compose" class="chat-compose"><label for="chat-question" class="sr-only">${t.mode==='ai'?'Câu hỏi của bạn':'Thông tin bổ sung'}</label><textarea id="chat-question" name="question" maxlength="2000" required placeholder="${t.mode==='ai'?'Nhập câu hỏi của bạn…':'Bổ sung thông tin…'}">${esc(t.input)}</textarea><button type="submit" aria-label="Gửi câu hỏi" ${t.loading?'disabled':''}>${icon('arrow')}</button></form><div class="chat-compose-help"><span>Câu trả lời mẫu, chưa kết nối AI hoặc chuyên viên. Không gửi thông tin cá nhân.</span></div></div></section></div>`;}''')
replacements={
 'Cuộc hỏi đáp mới':'Cuộc trò chuyện mới',
 'Trợ lý Luật Việt Đức':'Trợ lý AI',
 'AI mô phỏng':'Phản hồi mẫu',
 'Mời chuyên viên tiếp tục':'Gặp chuyên viên',
 'Bạn có thể chuyển cuộc trao đổi cho chuyên viên. Lịch sử vẫn được giữ để không cần kể lại từ đầu.':'Bạn có thể chuyển câu hỏi cho chuyên viên bên dưới.',
 'Tôi tìm thấy một mục liên quan trong thư viện mẫu. Để làm rõ tình huống, nội dung này được tổ chức quanh các điểm sau:':'Có bài viết liên quan trong thư viện. Bạn cần làm rõ những thông tin sau:',
 'Đây là minh họa cách AI trình bày thông tin. Chưa có kết luận pháp lý hoặc căn cứ đã được duyệt; không dùng như hướng dẫn thủ tục.':'Nội dung chưa được kiểm duyệt, không dùng làm hướng dẫn thủ tục.',
 'Bạn có thể nói rõ việc mình đang cần giải quyết và vấn đề liên quan Việt Nam, Đức hay cả hai nước không? Chỉ cần thông tin khái quát, không cần giấy tờ hoặc dữ liệu cá nhân.':'Bạn muốn hỏi về việc gì, tại Việt Nam hay Đức?',
 'Thư viện mẫu hiện chưa có đủ kiến thức phù hợp để giải đáp câu hỏi này. Tôi không tự suy đoán hoặc lấy một bài tin làm kết luận pháp lý. Bạn có thể mời chuyên viên tiếp tục.':'Thư viện chưa có câu trả lời phù hợp. Bạn có thể chuyển câu hỏi cho chuyên viên.',
 'Vui lòng xác nhận chuyển cuộc trao đổi (mô phỏng).':'Vui lòng đồng ý chuyển nội dung trao đổi.',
 'Nhập email mẫu đúng định dạng, hoặc để trống.':'Kiểm tra định dạng email hoặc để trống.',
 'Tiếp tục, không bắt đầu lại.':'Yêu cầu cần xử lý',
 'Kiến thức được duyệt, rồi mới dùng lại.':'Quản lý kiến thức',
 'Hỏi. Giải đáp. Tích lũy kiến thức.':'Quy trình hỏi đáp',
}
for a,b in replacements.items():s=s.replace(a,b)
p.write_text(s)

# Remove review-room chrome from public navigation; keep direct internal-demo routes intact.
p=Path('index.html');s=p.read_text()
s=re.sub(r'^  <div class="preview-bar">.*?</div></div>\n','',s,flags=re.M)
s=s.replace('HỎI ĐÁP PHÁP LUẬT · KẾT NỐI CHUYÊN VIÊN','PHÁP LUẬT VIỆT NAM – ĐỨC')
s=s.replace('>Hỏi đáp pháp luật</a>','>Hỏi đáp</a>').replace('>Thư viện kiến thức</a>','>Thư viện</a>').replace('>Tin pháp luật & Đời sống</a>','>Tin pháp luật</a>')
s=s.replace('>Hỏi ngay <span','>Đặt câu hỏi <span')
s=s.replace('Đang mở bản duyệt Luật Việt Đức…','Đang tải…')
s=s.replace('Bản HTML bấm thử cần JavaScript để chuyển trang. Hãy bật JavaScript trong trình duyệt. Bản này không tiếp nhận dữ liệu thật.','Vui lòng bật JavaScript để sử dụng chức năng hỏi đáp.')
s=s.replace('Hỏi đáp từ thư viện kiến thức.<br>Chuyên viên đồng hành khi cần làm rõ.','Pháp luật dành cho người Việt tại Đức.')
s=s.replace('Luật Việt Đức · Bản duyệt UX 0.5 · Đơn vị quản trị chờ xác nhận','© Luật Việt Đức').replace('Bản mô phỏng · Không tiếp nhận hồ sơ thật.','Bản xem thử · Chưa tiếp nhận yêu cầu thật.')
s=s.replace('Tìm trong tin tức, cẩm nang và hỏi đáp · Không gửi từ khóa ra ngoài.','Tìm trong thư viện, tin pháp luật và cẩm nang.')
start=s.index('<nav class="dialog-links"');end=s.index('</nav>',start)+6
s=s[:start]+'''<nav class="dialog-links" aria-label="Menu điện thoại"><a href="#/">Trang chủ</a><a href="#/hoi-dap-ai">Hỏi đáp pháp luật</a><a href="#/tra-cuu">Thư viện pháp luật</a><a href="#/tin-tuc">Tin pháp luật</a><a href="#/ve-chuyen-trang">Giới thiệu</a><a href="#/tai-khoan">Tài khoản</a><a class="button" href="#/hoi-dap-ai">Đặt câu hỏi <span data-icon="arrow"></span></a></nav>'''+s[end:]
s=s.replace('Luật Việt Đức · Bản duyệt HTML 0.5','Luật Việt Đức | Hỏi đáp pháp luật')
s=s.replace('0.5.0','0.5.1')
p.write_text(s)

# Tighten adjacent public pages without changing legal text, dates, credits or original sources.
p=Path('assets/newsroom.js');s=p.read_text()
for a,b in {
 'Tin tức & thông tin chọn lọc.':'Tin pháp luật',
 'Sống ở Đức, bắt đầu từ điều thiết thực.':'Cẩm nang tại Đức',
 'Chuyện Việt giữa lòng nước Đức.':'Cộng đồng người Việt',
 'Tóm tắt bằng tiếng Việt, giữ rõ nguồn gốc và phạm vi thông tin. Không phải bản tin cập nhật tự động.':'Quy định, chính sách và thông tin dành cho người Việt tại Đức.',
 'LUẬT VIỆT ĐỨC / CHUYÊN MỤC':'CHUYÊN MỤC',
 'Ảnh có nguồn. Thông tin có ngữ cảnh.':'Nguồn ảnh',
 'Pháp luật gắn với câu chuyện của bạn.':'Có câu hỏi cần giải đáp?',
 'Vào thư viện hỏi đáp':'Tra cứu thư viện',
 'Cần làm rõ trường hợp riêng?':'Đặt câu hỏi',
 'Bản tóm tắt để duyệt chuyên trang; chưa có người kiểm duyệt pháp lý được xác nhận. Với quyết định hoặc hồ sơ cụ thể, đọc nguồn đầy đủ và kiểm tra hướng dẫn hiện hành.':'Nội dung tham khảo, chưa kiểm duyệt pháp lý. Vui lòng xem nguồn đầy đủ trước khi áp dụng.',
}.items():s=s.replace(a,b)
p.write_text(s)
p=Path('assets/app.js');s=p.read_text()
for a,b in {
 'Bắt đầu từ điều bạn cần':'Thư viện pháp luật',
 'Tra cứu theo lĩnh vực':'Lĩnh vực pháp luật',
 'Ngân hàng hỏi đáp':'Câu hỏi thường gặp',
 'Tình huống, lĩnh vực và hỏi đáp cùng dẫn về một thư viện nội dung.':'Chọn chủ đề hoặc nhập từ khóa cần tìm.',
 'Tìm trong nội dung minh họa. Có thể nhập tiếng Việt có dấu hoặc không dấu.':'Tìm câu hỏi và bài viết trong thư viện.',
 'Bạn đang cần tìm hiểu điều gì?':'Nhập từ khóa cần tìm…',
 'Tiếp tục tra cứu':'Tra cứu thư viện',
 'Ở xa, vẫn có thể bắt đầu từ thông tin rõ ràng.':'Về Luật Việt Đức',
 'Lưu điều cần nhớ. Theo dõi điều đang hỏi.':'Đăng nhập',
 'Không gian của bạn':'Tài khoản của bạn',
 "+' | Luật Việt Đức · Bản duyệt'":"+' | Luật Việt Đức'",
 'Chưa kiểm duyệt · Nội dung mẫu':'Nội dung mẫu · Chưa kiểm duyệt',
}.items():s=s.replace(a,b)
p.write_text(s)

# Reduce the hero height and duplicate scaffolding. Preserve the monochrome design and photos.
p=Path('assets/chat-first.css');s=p.read_text()
s+='''
/* Public-facing copy refinement 0.5.1 */
.chat-hero{padding:38px 24px 27px;background:#f7f7f7}.chat-hero-inner{max-width:740px}.chat-hero h1{font-size:42px;line-height:1.16;letter-spacing:-.04em;margin-bottom:12px}.chat-hero .intro{font-size:15px;line-height:1.6;margin-bottom:20px}.ask-box{padding:14px 17px 12px;border-radius:12px;box-shadow:none}.ask-box textarea{height:54px;min-height:54px;font-size:16px;line-height:1.5}.ask-bottom{margin-top:0}.ask-library{font-size:12px;color:#666;display:inline-flex;align-items:center;gap:7px;min-height:44px}.ask-library svg{width:14px}.ask-bottom .button{min-height:44px;padding:9px 15px;font-size:13px}.chat-prompts{margin:13px 0 0;gap:8px}.chat-prompts button{font-size:12px;min-height:36px;padding:6px 14px}.chat-hero .demo-fine{font-size:11px;color:#737373;margin-top:12px}.chat-news{padding-top:32px}.chat-news .press-section-head{align-items:center;margin-bottom:20px}.chat-news .press-section-head h2{font-size:27px}.chat-news .press-section-head .text-link{font-size:13px}.chat-news .press-copy h2{font-size:21px;letter-spacing:-.025em}.chat-news .press-grid.four{padding-bottom:12px}.chat-shell{height:calc(100dvh - 79px);min-height:0}.chat-welcome{margin:36px auto 25px}.chat-welcome h2{font-size:28px}.chat-welcome p{font-size:14px}.chat-compose-help{justify-content:center;color:#737373;font-size:11px}.chat-top p{color:#666}.chat-source small{color:#666}.news-to-chat{padding:20px 22px}.news-to-chat h2{font-size:20px!important;margin-bottom:15px!important}.chat-handoff h2{font-size:21px}.chat-top-actions .button{min-height:44px}.chat-context small{display:none}.site-footer{margin-top:44px}.site-footer .footer-main>div>p{margin-top:14px;font-size:13px}.brand-tagline{letter-spacing:.12em}.footer-bottom{font-size:11px}
@media(max-width:800px){.chat-hero{padding-top:30px}.chat-hero h1{font-size:36px}.chat-news .press-grid>article:first-child .press-photo{aspect-ratio:1.8}.chat-shell{height:calc(100dvh - 79px)}}
@media(max-width:680px){.chat-hero{padding:27px 18px 22px}.chat-hero h1{font-size:30px;line-height:1.2;margin-bottom:11px}.chat-hero .intro{font-size:13px;line-height:1.6;margin-bottom:19px}.ask-box{padding:12px 14px}.ask-box textarea{height:66px;min-height:66px;font-size:16px}.ask-bottom{gap:10px;flex-direction:row;align-items:center}.ask-library{font-size:11px}.ask-bottom .button{width:auto;min-height:42px;font-size:12px;gap:8px;padding:9px 12px}.chat-prompts{gap:7px;justify-content:center;margin-top:12px}.chat-prompts button{font-size:11px;padding:5px 11px;min-height:34px}.chat-hero .demo-fine{font-size:10px;line-height:1.6;max-width:310px;margin:12px auto 0}.chat-news{padding-top:28px}.chat-news .press-section-head h2{font-size:24px}.chat-news .press-copy h2{font-size:19px}.chat-news .press-section-head .text-link{font-size:12px}.chat-news .press-grid.four{gap:22px 16px}.chat-news .four .press-copy h2{font-size:17px}.chat-shell{height:calc(100dvh - 71px);min-height:0}.chat-welcome h2{font-size:24px}.chat-compose-help{font-size:10px;line-height:1.6;text-align:center}.chat-top h1{font-size:16px}.chat-top-actions .button{font-size:11px;min-height:42px}.news-to-chat{padding:19px}.news-to-chat h2{font-size:20px!important}}
@media(max-width:359px){.chat-hero h1{font-size:27px}.chat-hero{padding-inline:14px}.ask-library{font-size:10px}.ask-library svg{display:none}.chat-prompts{gap:5px}.chat-prompts button{padding-inline:9px;font-size:10px}.chat-shell{height:calc(100dvh - 67px)}}
'''
p.write_text(s)
# Keep the deployment verifier aligned with the revision; no change in its verification requirements.
p=Path('.github/workflows/check-preview.yml');s=p.read_text().replace('0.5.0','0.5.1');p.write_text(s)
print('Public copy updated. Chat behavior, prepared news, images and source attribution retained.')

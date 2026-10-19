"""Apply reviewed integration and small source refinements within this repository only."""
from pathlib import Path
p=Path('assets/app.js')
s=p.read_text(encoding='utf-8')
old="    if(route.path==='/') html=window.LVD_EDITORIAL.home();"
new="    if(window.LVD_CHAT?.accepts(route)) html=window.LVD_CHAT.view(route);\n    else if(route.path==='/') html=window.LVD_EDITORIAL.home();"
if new not in s:
    assert s.count(old)==1,'App router changed; reconcile before applying.'
    s=s.replace(old,new,1)
old="    document.getElementById('page-announcement').textContent=h1?h1.textContent:'Nội dung đã mở';"
new=old+"\n    window.LVD_CHAT?.afterRender(route,render);"
if new not in s:
    assert s.count(old)==1,'Render completion hook changed.'
    s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
p=Path('index.html');s=p.read_text(encoding='utf-8')
if 'assets/chat-first.js' not in s:
    s=s.replace('  <script src="assets/app.js?v=0.4.0" defer></script>', '  <link rel="stylesheet" href="assets/chat-first.css?v=0.5.0">\n  <script src="assets/chat-first.js?v=0.5.0" defer></script>\n  <script src="assets/app.js?v=0.5.0" defer></script>')
    assert 'assets/chat-first.js' in s,'Expected index asset marker not found.'
s=s.replace('0.4.0','0.5.0').replace('0.4','0.5')
s=s.replace('GÓC NHÌN VIỆT · CUỘC SỐNG ĐỨC','HỎI ĐÁP PHÁP LUẬT · KẾT NỐI CHUYÊN VIÊN')
start=s.index('    <nav class="desktop-nav"');end=s.index('</nav>',start)+6
s=s[:start]+'    <nav class="desktop-nav" aria-label="Điều hướng chính"><a data-nav="chat" href="#/hoi-dap-ai">Hỏi đáp pháp luật</a><a data-nav="lookup" href="#/tra-cuu">Thư viện kiến thức</a><a data-nav="news" href="#/tin-tuc">Tin pháp luật & Đời sống</a></nav>'+s[end:]
s=s.replace('href="#/gui-cau-hoi">Gửi câu hỏi <span','href="#/hoi-dap-ai">Hỏi ngay <span')
s=s.replace('· Tin có nguồn · Biểu mẫu dùng thử','· Giao diện chat AI & chuyên viên · Chỉ mô phỏng')
s=s.replace('Sơ đồ & ghi chú ↗','Xem luồng vận hành ↗')
s=s.replace('Tin tức, đời sống và pháp luật.<br>Một góc nhìn Việt, giữa nhịp sống Đức.','Hỏi đáp từ thư viện kiến thức.<br>Chuyên viên đồng hành khi cần làm rõ.')
s=s.replace('Tin chọn lọc có nguồn · Không thay thế tư vấn riêng.','Bản mô phỏng · Không tiếp nhận hồ sơ thật.')
s=s.replace('<a href="#/">Trang chủ</a><a href="#/tra-cuu">Tra cứu theo tình huống</a>','<a href="#/">Trang chủ</a><a href="#/hoi-dap-ai">Hỏi đáp với AI & chuyên viên</a><a href="#/tra-cuu">Thư viện kiến thức</a>')
s=s.replace('Luật Việt Đức — tin tức, đời sống và pháp luật dành cho người Việt tại Đức. Bản duyệt giao diện đen trắng; không tiếp nhận hồ sơ thật.','Luật Việt Đức — hỏi đáp pháp luật từ thư viện kiến thức, kết nối chuyên viên khi cần. Bản duyệt giao diện, chưa kết nối AI thật.')
p.write_text(s,encoding='utf-8')
p=Path('assets/chat-first.js');s=p.read_text(encoding='utf-8')
old="if(b.hasAttribute('data-new-chat')){create();if(route().path==='/hoi-dap-ai')redraw(false,true);else go('/hoi-dap-ai');}"
new="if(b.hasAttribute('data-new-chat')){create();if(location.hash==='#/hoi-dap-ai')redraw(false,true);else go('/hoi-dap-ai');}"
if new not in s:
    assert s.count(old)==1,'New-chat handler changed.'
    s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
p=Path('assets/chat-first.css');s=p.read_text(encoding='utf-8')
if '/* Exact shell height */' not in s:
    s+='\n/* Exact shell height */\n@media(min-width:681px){.chat-shell{height:calc(100dvh - 112px)}}\n@media(max-width:680px){.chat-shell{height:calc(100dvh - 100px);min-height:0}}\n'
p.write_text(s,encoding='utf-8')
print('Conversation-first shell integrated.')

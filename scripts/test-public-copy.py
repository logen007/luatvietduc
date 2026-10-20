"""Public copy and interaction checks. No external data services or real personal information."""
from pathlib import Path
import os,re,functools,http.server,threading
from playwright.sync_api import sync_playwright,expect
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(Path.cwd())))
threading.Thread(target=srv.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{srv.server_port}/'
forbidden=re.compile(r'bản xem thử|bản duyệt|mô phỏng|bấm thử|dùng thử|câu trả lời mẫu|phản hồi mẫu|nội dung mẫu|bài mẫu|kiến thức mẫu|điền thông tin mẫu|chưa kết nối AI|duyệt giao diện|chờ xác nhận|thiết kế dành|sẽ trình bày|xem luồng vận hành',re.I)
count=0
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce',locale='vi-VN')
 errors=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.on('request',lambda r:requests.append(r.url))
 def go(route):page.goto(base+'#'+route,wait_until='load');page.wait_for_timeout(40)
 def checkcopy():
  text=page.locator('body').inner_text()+' '+page.title()
  m=forbidden.search(text);assert not m,(page.url,m.group() if m else '')
  attributes=page.evaluate("()=>Array.from(document.querySelectorAll('[aria-label],input,textarea')).map(e=>[e.getAttribute('aria-label'),e.getAttribute('placeholder')].join(' ')).join(' ')")
  assert not forbidden.search(attributes),(page.url,'labels')
 def passed(name):
  global count
  count+=1;print('PASS',name,flush=True)
 go('/')
 ids=page.evaluate('window.LVD_CONTENT.articles.map(a=>({id:a.id,type:a.type}))')
 routes=['/','/hoi-dap-ai','/tra-cuu','/chu-de','/chu-de/nha-dat','/hoi-dap','/tim-kiem?q=uy+quyen','/tim-kiem?q=xxxkhongcoketqua','/tin-tuc','/song-o-duc','/cong-dong','/ve-chuyen-trang','/gui-cau-hoi','/gui-cau-hoi?muc-dich=feedback','/dang-nhap','/tai-khoan','/tai-khoan/cau-hoi/khong-co','/da-tiep-nhan','/chinh-sach-thong-tin','/dieu-khoan','/nguon-anh','/so-do','/chuyen-vien','/thu-vien-quan-tri','/khong-co-trang']
 routes+=[('/hoi-dap/' if a['type']=='qa' else '/tin/' if a['type']=='news' else '/bai-viet/')+a['id'] for a in ids]
 for w in [320,390,768,1440]:
  page.set_viewport_size({'width':w,'height':1000})
  for route in routes:
   go(route);checkcopy()
   assert page.locator('#main h1').count()==1,(route,'heading')
   assert page.evaluate('document.documentElement.scrollWidth')<=w+1,(w,route,'overflow')
   if route=='/':
    assert page.locator('#home-question').is_visible()
    assert page.locator('#home-demo,.demo-fine,.preview-bar').count()==0
    assert page.locator('.chat-hero').bounding_box()['height']<440
    assert page.locator('.press-photo img').count()==7
   passed(f'Copy and layout {w}px {route}')
 page.set_viewport_size({'width':1440,'height':1000});go('/')
 for image in page.locator('.press-photo img').all():image.scroll_into_view_if_needed();image.evaluate('(el)=>el.decode()');assert image.evaluate('(el)=>el.naturalWidth>0')
 page.locator('#home-question').fill('Tôi muốn ủy quyền từ Đức');page.locator('#home-ask button').click()
 expect(page.locator('.chat-message.user')).to_have_count(1)
 expect(page.locator('.chat-source')).to_be_visible();expect(page.locator('#chat-log')).to_contain_text('Chưa thể trả lời')
 checkcopy();assert 'quyen' not in page.url
 passed('Question: related library link without fabricated legal answer')
 page.locator('.chat-top [data-handoff]').click();page.locator('#handoff-form [type=submit]').click()
 expect(page.locator('#handoff-error')).to_contain_text('đồng ý')
 page.locator('#handoff-consent').check();page.locator('#handoff-form [type=submit]').click()
 expect(page.locator('#handoff-error')).to_contain_text('email')
 page.locator('#handoff-email').fill('reader@example.invalid');page.locator('#handoff-form [type=submit]').click()
 expect(page.locator('#handoff-error')).to_contain_text('Chưa gửi được')
 expect(page.locator('#handoff-email')).to_have_value('reader@example.invalid')
 assert 'Đã chuyển' not in page.locator('body').inner_text()
 checkcopy();passed('Handoff: consent, validation, no false delivery confirmation')
 page.locator('[data-cancel-handoff]').click();page.locator('#chat-question').fill('Tôi cần hỏi thêm về giấy tờ');page.locator('#chat-question').press('Enter')
 expect(page.locator('.chat-message.user')).to_have_count(2);checkcopy();passed('Follow-up in same conversation')
 go('/tin/mindestlohn-2026');page.locator('.news-to-chat .button').click()
 expect(page.locator('.chat-context strong')).to_contain_text('Lương tối thiểu');checkcopy();passed('Article context')
 page.reload();expect(page.locator('.chat-message.user')).to_have_count(0)
 assert page.evaluate('localStorage.length')==0 and page.evaluate('sessionStorage.length')==0
 passed('No persistent conversations')
 go('/tim-kiem?q=uy+quyen');expect(page.locator('.result-item')).to_have_count(3)
 page.locator('#sort-results').select_option('a-z');checkcopy();passed('Search and sorting')
 go('/tin/mindestlohn-2026');page.locator('[data-save]').click();expect(page.locator('#email-form')).to_be_visible()
 page.locator('#email-form button').click();expect(page.locator('#login-email-error')).to_contain_text('email hợp lệ')
 page.locator('#login-email').fill('reader@example.invalid');page.locator('#email-form button').click()
 expect(page.locator('#login-email-error')).to_contain_text('Chưa thể gửi mã')
 assert page.locator('#otp,[data-demo-login]').count()==0
 checkcopy();passed('Login: validation, no fabricated email or account')
 go('/gui-cau-hoi');page.locator('#contact-form [type=submit]').click();expect(page.locator('#question')).to_have_attribute('aria-invalid','true')
 page.locator('#question').fill('Nội dung kiểm tra kỹ thuật.');page.locator('#name').fill('Reader');page.locator('#email').fill('reader@example.invalid');page.locator('#consent').check()
 page.locator('#contact-form [type=submit]').click();expect(page.locator('#form-error')).to_contain_text('Chưa gửi được')
 expect(page.locator('#question')).to_have_value('Nội dung kiểm tra kỹ thuật.')
 assert page.locator('.reference').count()==0
 checkcopy();passed('Contact: draft preserved, no fabricated receipt')
 page.set_viewport_size({'width':390,'height':844});go('/')
 page.locator('.menu-button').click();page.locator('#menu-dialog a[href="#/hoi-dap-ai"]').click()
 expect(page.locator('#menu-dialog')).not_to_be_visible();expect(page.locator('#chat-compose')).to_be_visible()
 page.locator('#chat-question').fill('<img src=x onerror=alert(1)>');page.locator('#chat-compose button').click()
 expect(page.locator('.chat-message.user')).to_contain_text('<img');assert page.locator('.chat-message img').count()==0
 page.locator('.chat-new-mobile').click();expect(page.locator('.chat-welcome')).to_be_visible();checkcopy();passed('Mobile menu, escaping and fresh conversation')
 if os.environ.get('VISUAL_QA'):
  out=Path(os.environ['VISUAL_QA']);out.mkdir(exist_ok=True,parents=True)
  for w in [390,1440]:
   page.set_viewport_size({'width':w,'height':1000})
   for name,route in [('home','/'),('chat','/hoi-dap-ai'),('library','/tra-cuu'),('article','/hoi-dap/uy-quyen-quan-ly-nha'),('contact','/gui-cau-hoi')]:
    go(route)
    for image in page.locator('img').all():image.scroll_into_view_if_needed();image.evaluate('(el)=>el.decode()')
    page.evaluate('scrollTo(0,0)');page.screenshot(path=str(out/f'{name}-{w}.png'),full_page=True)
 assert not errors,errors
 assert not [u for u in requests if u.startswith('http') and not u.startswith(base)],'Unexpected data request'
 passed('No browser errors or outgoing data');browser.close()
srv.shutdown();print(count,'checks passed')

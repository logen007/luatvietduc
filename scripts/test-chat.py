"""UI checks only; no external services, real personal data or exported deliverable files."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import functools,http.server,threading
root=Path.cwd()
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=srv.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{srv.server_port}/'
count=0
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 ctx=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
 page=ctx.new_page();errors=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.on('request',lambda r:requests.append(r.url))
 def go(route):
  page.goto(base+'#'+route,wait_until='load');page.wait_for_timeout(80)
 def passed(name):
  global count
  count+=1;print('PASS',name,flush=True)
 routes=['/','/hoi-dap-ai','/tin-tuc','/tin/mindestlohn-2026','/tra-cuu','/chuyen-vien','/thu-vien-quan-tri','/so-do','/gui-cau-hoi']
 for w in [320,390,768,1440]:
  page.set_viewport_size({'width':w,'height':1000})
  for route in routes:
   go(route)
   assert page.locator('#main h1').count()==1,(route,'heading')
   assert page.evaluate('document.documentElement.scrollWidth')<=w+1,(w,route)
   assert page.locator('#main').inner_text().strip(),route
   if route=='/':
    assert page.locator('#home-question').is_visible()
    assert page.locator('#home-question').bounding_box()['y']<550
    assert page.locator('#home-question').bounding_box()['y']<page.locator('.chat-news').first.bounding_box()['y']
    assert page.locator('.press-photo img').count()>=6
   passed(f'Layout {w}px {route}')
 page.set_viewport_size({'width':1440,'height':1000});go('/')
 for img in page.locator('.press-photo img').all():
  img.scroll_into_view_if_needed()
  expect(img).to_be_visible()
  img.evaluate('(el)=>el.decode()')
  assert img.evaluate('(el)=>el.naturalWidth>0')
 passed('All seven homepage photographs load')
 page.locator('#home-question').fill('Tôi muốn ủy quyền từ Đức')
 page.locator('#home-ask button').click()
 expect(page.locator('.chat-source')).to_be_visible()
 expect(page.locator('.chat-message.user')).to_have_count(1)
 assert 'quy' not in page.url and 'q=' not in page.url
 page.locator('#chat-question').fill('Cần chuẩn bị những thông tin nào về nhà ở?')
 page.locator('#chat-compose button').click();expect(page.locator('.chat-message.user')).to_have_count(2)
 expect(page.locator('.chat-message-body').last).to_contain_text('chưa có đủ')
 passed('Home to chat, sample source, follow-up and no question in URL')
 page.locator('.chat-top [data-handoff]').click()
 page.locator('#handoff-form [type=submit]').click()
 expect(page.locator('#handoff-error')).not_to_be_empty()
 page.locator('#handoff-consent').check();page.locator('#handoff-form [type=submit]').click()
 expect(page.locator('.chat-top p')).to_contain_text('Đang chờ')
 n=page.locator('.chat-message:not(.user)').count()
 page.locator('#chat-question').fill('Bổ sung giả, không có dữ liệu thật.');page.locator('#chat-compose button').click()
 page.wait_for_timeout(450)
 assert page.locator('.chat-message:not(.user)').count()==n
 passed('Consent gate and AI stopped after handoff')
 page.locator('.chat-status a[href^="#/chuyen-vien"]').click()
 page.locator('[data-claim]').click();page.locator('[data-fill-reply]').click()
 page.locator('#specialist-reply [type=submit]').click()
 expect(page.locator('.chat-message.human')).to_have_count(1)
 page.locator('[data-create-knowledge]').click()
 expect(page.locator('#kb-title')).to_have_value('')
 page.locator('[data-fill-knowledge]').click();page.locator('#knowledge-form [type=submit]').click()
 page.locator('#knowledge-form [type=submit]').click();expect(page.locator('#kb-error')).not_to_be_empty()
 page.locator('#kb-private').check();page.locator('#kb-reviewed').check();page.locator('#knowledge-form [type=submit]').click()
 expect(page.locator('.ops-draft')).to_contain_text('Đã cập nhật thư viện mô phỏng')
 page.locator('[data-try-knowledge]').click();expect(page.locator('#chat-log')).to_contain_text('Kiến thức đã duyệt mô phỏng')
 passed('Specialist reply, blank knowledge draft, approval gate and sample reuse')
 go('/tin/mindestlohn-2026');page.locator('.news-to-chat .button').click()
 expect(page.locator('.chat-context strong')).to_contain_text('Lương')
 expect(page.locator('.chat-context')).to_contain_text('không tự động')
 passed('Article opens a context-linked conversation')
 page.reload();expect(page.locator('.chat-message')).to_have_count(0)
 assert page.evaluate('localStorage.length')==0 and page.evaluate('sessionStorage.length')==0
 passed('No persistent conversations')
 page.set_viewport_size({'width':390,'height':844});go('/')
 page.locator('.menu-button').click();page.locator('#menu-dialog a[href="#/hoi-dap-ai"]').first.click()
 expect(page.locator('#menu-dialog')).not_to_be_visible();expect(page.locator('#chat-compose')).to_be_visible()
 page.locator('#chat-question').fill('Tôi muốn gặp chuyên viên');page.locator('#chat-question').press('Enter')
 expect(page.locator('.chat-inline-actions [data-handoff]')).to_be_visible()
 page.locator('.chat-top [data-handoff]').click();expect(page.locator('#handoff-form')).to_be_visible()
 page.locator('#handoff-consent').check();page.locator('#handoff-form [type=submit]').click()
 expect(page.locator('.chat-top p')).to_contain_text('Đang chờ')
 page.locator('[data-new-chat]').last.click()
 expect(page.locator('.chat-welcome')).to_be_visible()
 passed('Mobile menu composer handoff and new conversation')
 go('/tim-kiem?q=uy+quyen');expect(page.locator('.result-item')).to_have_count(3)
 go('/gui-cau-hoi');page.locator('#contact-form [type=submit]').click();expect(page.locator('#question')).to_have_attribute('aria-invalid','true')
 passed('Library search and existing request form regression')
 go('/hoi-dap-ai');page.locator('#chat-question').fill('<img src=x onerror=alert(1)>');page.locator('#chat-compose button').click()
 expect(page.locator('.chat-message.user')).to_contain_text('<img')
 assert page.locator('.chat-message img').count()==0
 page.wait_for_timeout(400)
 assert not errors,errors
 assert not [u for u in requests if u.startswith('http') and not u.startswith(base)],'Outgoing data requests'
 passed('Escaping, no runtime errors, no data calls')
 browser.close()
srv.shutdown();print(f'{count} checks passed. UI prototype only; not production security validation.')

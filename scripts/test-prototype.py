"""Browser QA for the static Luat Viet Duc prototype.
Run from the repository root: python scripts/test-prototype.py
Requires Playwright and Chromium. Only fake fixture data is used.
"""
from __future__ import annotations
import functools
import http.server
import json
import re
import shutil
import threading
import traceback
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path.cwd()
OUT=ROOT/'build'
QA=OUT/'qa'
QA.mkdir(parents=True,exist_ok=True)
checks=[]
failures=[]
errors=[]
requests=[]

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass

server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{server.server_port}/'

def record(name,func):
    try:
        func()
        checks.append(name)
        print('PASS:',name,flush=True)
    except Exception as exc:
        item={'name':name,'error':str(exc),'trace':traceback.format_exc()[-7000:]}
        failures.append(item)
        print('FAIL:',name,str(exc),flush=True)
        try:
            page.screenshot(path=str(QA/f'failure-{len(failures)}.png'),full_page=True)
        except Exception:
            pass

def navigate(route):
    page.goto(BASE+'#'+route,wait_until='load')
    page.wait_for_timeout(90)
    expect(page.locator('#main')).not_to_contain_text('Đang mở bản duyệt')

def responsive(route,width):
    page.set_viewport_size({'width':width,'height':920})
    navigate(route)
    measure=page.evaluate('''() => ({width:innerWidth,body:document.body.scrollWidth,html:document.documentElement.scrollWidth,heading:document.querySelector('#main h1, #main h2')?.textContent})''')
    assert measure['body']<=width+1 and measure['html']<=width+1,measure
    assert measure['heading'],measure
    assert page.locator('#main').inner_text().strip(),route
    if route=='/':
        h=page.locator('#main h1').bounding_box()
        header=page.locator('.site-header').bounding_box()
        assert h['y']>=header['y']+header['height'],(h,header)
        assert page.locator('#skip-main').bounding_box()['y']<0,'Skip link visible without keyboard focus'
    names={'/':'home','/tim-kiem?q=uy+quyen':'search','/hoi-dap/uy-quyen-quan-ly-nha':'article','/gui-cau-hoi':'contact','/cam-nang':'editorial','/so-do':'review'}
    if width in [390,1440] and route in names:
        suffix='desktop' if width==1440 else 'mobile'
        page.screenshot(path=str(QA/f'{names[route]}-{suffix}.png'),full_page=True)

def search_flow():
    page.set_viewport_size({'width':1440,'height':920})
    navigate('/')
    page.locator('#search-page').fill('uy quyen')
    page.locator('form[data-search]').first.locator('button').click()
    expect(page.locator('.result-item')).to_have_count(3)
    first=page.locator('.result-item h2 a').all_text_contents()
    navigate('/tim-kiem?q=%E1%BB%A6Y+QUY%E1%BB%80N')
    assert page.locator('.result-item h2 a').all_text_contents()==first
    page.locator('.result-item h2 a').first.click()
    expect(page.locator('#answer')).to_be_visible()
    page.go_back()
    expect(page.locator('#search-page')).to_have_value('ỦY QUYỀN')

def pagination_flow():
    navigate('/hoi-dap')
    expect(page.locator('.result-item')).to_have_count(6)
    page.get_by_role('link',name='Trang 2',exact=True).click()
    assert 'loai=qa' in page.url and 'trang=2' in page.url,page.url
    expect(page.locator('.result-item')).to_have_count(6)
    page.get_by_role('link',name='Trang 3',exact=True).click()
    expect(page.locator('.result-item')).to_have_count(2)

def filter_flow():
    navigate('/tra-cuu')
    page.locator('#filter-topic').select_option('nha-dat')
    page.locator('#filter-type').select_option('qa')
    page.locator('#filter-form button').click()
    expect(page.locator('.result-item')).to_have_count(2)
    assert 'linh-vuc=nha-dat' in page.url and 'loai=qa' in page.url
    page.locator('#sort-results').select_option('a-z')
    assert 'linh-vuc=nha-dat' in page.url and 'sap-xep=a-z' in page.url
    page.get_by_role('link',name='Bỏ lọc Nhà đất và bất động sản',exact=True).click()
    assert 'linh-vuc' not in page.url

def empty_and_invalid_routes():
    navigate('/tim-kiem?q=xyzkhongcoketqua')
    expect(page.locator('.empty-state')).to_contain_text('Chưa có nội dung phù hợp')
    navigate('/hoi-dap/khong-co-bai')
    expect(page.locator('.empty-state')).to_contain_text('Trang này chưa có')
    navigate('/da-tiep-nhan')
    expect(page.locator('.empty-state')).to_contain_text('Chưa có lần gửi thử')
    assert page.locator('.reference').count()==0

def header_and_keyboard():
    navigate('/')
    page.locator('#skip-main').focus()
    page.locator('#skip-main').click()
    assert page.url.endswith('#/')
    assert page.evaluate('document.activeElement.id')=='main'
    page.get_by_role('button',name='Mở tìm kiếm',exact=True).click()
    expect(page.locator('#search-dialog')).to_be_visible()
    page.keyboard.press('Escape')
    expect(page.locator('#search-dialog')).not_to_be_visible()
    expect(page.get_by_role('button',name='Mở tìm kiếm',exact=True)).to_have_attribute('aria-expanded','false')
    page.set_viewport_size({'width':390,'height':844})
    page.get_by_role('button',name='Mở menu',exact=True).click()
    expect(page.locator('#menu-dialog')).to_be_visible()
    page.locator('#menu-dialog').get_by_role('link',name='Gửi câu hỏi',exact=True).click()
    expect(page.locator('#menu-dialog')).not_to_be_visible()
    expect(page.locator('#contact-form')).to_be_visible()
    navigate('/tim-kiem?q=uy+quyen')
    assert not page.locator('#filters').evaluate('(el)=>el.open')
    page.locator('#filters summary').click()
    expect(page.locator('#filter-topic')).to_be_visible()
    page.set_viewport_size({'width':1440,'height':920})

def save_and_resume():
    navigate('/hoi-dap/uy-quyen-quan-ly-nha')
    page.locator('[data-save]').click()
    expect(page.locator('#email-form')).to_be_visible()
    page.locator('[data-demo-login]').click()
    assert '/hoi-dap/uy-quyen-quan-ly-nha' in page.url
    expect(page.locator('[data-save]')).to_have_attribute('aria-pressed','true')
    navigate('/tai-khoan?muc=da-luu')
    expect(page.locator('.question-row')).to_have_count(1)
    page.locator('[data-save]').click()
    expect(page.locator('.empty-state')).to_contain_text('Chưa có bài viết đã lưu')
    navigate('/tai-khoan/cau-hoi/DEMO-0001')
    page.locator('#reply').fill('Nội dung giả dùng để thử bước bổ sung thông tin.')
    page.locator('#reply-form button').click()
    expect(page.locator('.message')).to_have_count(3)
    expect(page.locator('.status-badge')).to_contain_text('Đã tiếp nhận')
    page.screenshot(path=str(QA/'private-question-desktop.png'),full_page=True)
    navigate('/tai-khoan')
    page.locator('[data-logout]').click()

def form_errors_and_data_preservation():
    navigate('/gui-cau-hoi?test=error')
    page.locator('#contact-form [type=submit]').click()
    expect(page.locator('#question')).to_have_attribute('aria-invalid','true')
    expect(page.locator('#name')).to_have_attribute('aria-invalid','true')
    expect(page.locator('#email')).to_have_attribute('aria-invalid','true')
    page.locator('[data-fill-demo]').click()
    page.locator('#consent').check()
    original=page.locator('#question').input_value()
    page.locator('#contact-form [type=submit]').click()
    expect(page.locator('#form-error')).to_be_visible()
    expect(page.locator('#question')).to_have_value(original)
    assert page.locator('.reference').count()==0
    page.evaluate('''() => {const f=document.querySelector('#contact-form');f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}''')
    expect(page.locator('.reference')).to_be_visible()
    expect(page.locator('.reference')).to_contain_text('DEMO-LVD-0001')
    page.locator('[data-follow]').click()
    expect(page.locator('#login-email')).to_have_value('ban-doc@example.invalid')
    page.locator('#email-form button').click()
    page.locator('#otp').fill('000000')
    page.locator('#otp-form button').click()
    expect(page.locator('#otp-error')).to_contain_text('Mã chưa đúng')
    page.locator('#otp').fill('123456')
    page.locator('#otp-form button').click()
    assert 'DEMO-LVD-0001' in page.url
    expect(page.locator('.message')).to_have_count(1)
    expect(page.locator('.message')).to_contain_text(original)
    page.locator('#reply').fill('Thông tin bổ sung giả, không phải dữ liệu hồ sơ.')
    page.locator('#reply-form button').click()
    expect(page.locator('.message')).to_have_count(2)
    navigate('/tai-khoan')
    expect(page.locator('.request-card')).to_have_count(2)
    page.locator('[data-logout]').click()

def private_route_boundary():
    navigate('/dang-nhap')
    page.locator('#login-email').fill('nguoi-khac@example.invalid')
    page.locator('#email-form button').click()
    page.locator('#otp').fill('123456')
    page.locator('#otp-form button').click()
    expect(page.locator('.request-card')).to_have_count(0)
    navigate('/tai-khoan/cau-hoi/DEMO-LVD-0001')
    expect(page.locator('.empty-state')).to_contain_text('Không tìm thấy câu hỏi')
    assert page.locator('.message').count()==0
    navigate('/tai-khoan')
    page.locator('[data-logout]').click()

def otp_expiry():
    page.clock.install()
    navigate('/dang-nhap')
    page.locator('#login-email').fill('ma-het-han@example.invalid')
    page.locator('#email-form button').click()
    page.clock.fast_forward(301000)
    page.locator('#otp').fill('123456')
    page.locator('#otp-form button').click()
    expect(page.locator('#otp-error')).to_contain_text('hết hạn')
    page.locator('[data-resend]').click()
    page.locator('#otp').fill('123456')
    page.locator('#otp-form button').click()
    expect(page.locator('.account-head')).to_be_visible()
    page.locator('[data-logout]').click()

def injection_and_no_persistence():
    navigate('/tim-kiem?q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E')
    assert page.locator('#main img').count()==0
    navigate('/tai-khoan')
    page.locator('[data-demo-login]').click()
    page.reload(wait_until='load')
    expect(page.locator('#email-form')).to_be_visible()
    assert page.evaluate('localStorage.length')==0
    assert page.evaluate('sessionStorage.length')==0
    assert not [r for r in requests if r.startswith('http') and not r.startswith(BASE)],requests

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1440,'height':920},locale='vi-VN',reduced_motion='reduce')
    page=context.new_page()
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.on('console',lambda msg:errors.append(msg.text) if msg.type=='error' else None)
    page.on('request',lambda req:requests.append(req.url))
    routes=['/','/tra-cuu','/chu-de','/chu-de/nha-dat','/hoi-dap','/tim-kiem?q=uy+quyen','/hoi-dap/uy-quyen-quan-ly-nha','/cam-nang','/bai-viet/cam-nang-uy-quyen','/tin/tin-phap-luat-duc','/ve-chuyen-trang','/gui-cau-hoi','/dang-nhap','/tai-khoan','/chinh-sach-thong-tin','/dieu-khoan','/so-do']
    for width in [320,360,390,768,1024,1440]:
        for route in routes:
            record(f'Layout {width}px {route}',lambda r=route,w=width:responsive(r,w))
    record('Search accents and browser back',search_flow)
    record('Pagination preserves content type',pagination_flow)
    record('Filters sorting and individual reset',filter_flow)
    record('Empty missing and unsubmitted confirmation states',empty_and_invalid_routes)
    record('Keyboard skip link dialogs and mobile filters',header_and_keyboard)
    record('Save resume bookmark removal and demo reply',save_and_resume)
    record('Validation retry duplicate guard and OTP follow-up',form_errors_and_data_preservation)
    record('Demo requests isolated by current fixture email',private_route_boundary)
    record('Expired OTP and simulated resend',otp_expiry)
    record('Escaping in-memory reset and no outgoing data requests',injection_and_no_persistence)
    if errors:
        failures.append({'name':'Browser runtime / CSP errors','error':errors})
    else:
        checks.append('No browser runtime or CSP errors')
    browser.close()
server.shutdown()

# Package precisely the source used by the tests, not the runner's working directory.
for item in ['index.html','README.md']:
    if (ROOT/item).exists():
        (OUT/item).write_bytes((ROOT/item).read_bytes())
shutil.copytree(ROOT/'assets',OUT/'assets',dirs_exist_ok=True)
html=(ROOT/'index.html').read_text(encoding='utf-8')
html=re.sub(r'\s*<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
html=html.replace('<link rel="stylesheet" href="assets/styles.css?v=0.3.0">','<style>'+ (ROOT/'assets/styles.css').read_text(encoding='utf-8')+'</style>')
for name in ['content.js','app.js']:
    body=(ROOT/'assets'/name).read_text(encoding='utf-8').replace('</script','<\\/script')
    html=html.replace(f'  <script src="assets/{name}?v=0.3.0" defer></script>','')
    html=html.replace('</body>','<script>'+body+'</script>\n</body>')
(OUT/'LuatVietDuc_HTML_v0.3.html').write_text(html,encoding='utf-8')
report={'status':'passed' if not failures else 'failed','passed_checks':len(checks),'failed_checks':len(failures),'tested_widths':[320,360,390,768,1024,1440],'responsive_routes':len(routes),'checks':checks,'failures':failures,'runtime_errors':errors,'scope':'Chromium automated prototype checks. Not a production security audit or legal-content review.'}
(QA/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ['checks','failures']},ensure_ascii=False,indent=2))
raise SystemExit(1 if failures else 0)

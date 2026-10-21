"""Regression checks for the restored pre-0.8 layout with Terms-inspired styling.
Preserves the legal catalogue, truthful form status and source image credits.
The visual reference is not bundled in the public website.
"""
from pathlib import Path
import functools, http.server, json, os, threading
from playwright.sync_api import sync_playwright, expect

ROOT=Path.cwd()
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
out=Path(os.environ['LAYOUT_QA']) if os.environ.get('LAYOUT_QA') else None
if out:out.mkdir(parents=True,exist_ok=True)
report=[]
routes=[('home','/'),('catalog','/tra-cuu'),('category','/chu-de/hon-nhan-gia-dinh'),('topics','/tra-cuu?xem=tat-ca'),('chat','/hoi-dap-ai'),('news','/tin-tuc'),('article','/tin/mindestlohn-2026'),('contact','/lien-he'),('privacy','/chinh-sach-thong-tin'),('terms','/dieu-khoan'),('about','/ve-chuyen-trang'),('login','/dang-nhap')]
html=Path('index.html').read_text()
assert '#/nguon-anh' not in html and 'terms-alignment.css' in html
assert 'chromatic-editorial.css' not in html
assert 'lvd-footer-invite' not in html
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1440,'height':1000},locale='vi-VN',reduced_motion='reduce')
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    def go(route):
        page.goto(base+'#'+route,wait_until='load')
        page.evaluate('document.fonts.ready')
        page.wait_for_timeout(40)
    def no_overlap():
        cards=page.locator('.catalog-group')
        for card in cards.all():
            text=card.locator('.catalog-group-body').bounding_box()
            icon=card.locator(':scope > .catalog-group-icon').bounding_box()
            rect=card.bounding_box()
            assert text['x']+text['width']<=icon['x']-4,(text,icon)
            assert icon['x']+icon['width']<=rect['x']+rect['width']-5,(rect,icon)
            assert card.locator(':scope > svg').count()==0
    for width in [320,360,390,768,1024,1440]:
        page.set_viewport_size({'width':width,'height':1000})
        for name,route in routes:
            go(route)
            assert page.locator('#main h1').count()==1,(width,route,'h1')
            assert page.evaluate('document.documentElement.scrollWidth')<=width+1,(width,route,'overflow')
            assert page.locator('a[href="#/nguon-anh"]').count()==0
            assert page.locator('.s-footer-wordmark').count()==0
            header=page.locator('.site-header .container').bounding_box()
            if name=='home':
                assert page.locator('.s-hero-grid .s-ask-panel').count()==1
                assert page.locator('.s-news-grid').count()==1
                assert page.locator('.s-guides-grid .s-story').count()==4
                assert page.locator('.s-library-links > a').count()==8
                assert page.locator('.press-photo img').count()==7
                if width==1440:
                    left=page.locator('.s-hero-copy').bounding_box()
                    right=page.locator('.s-ask-panel').bounding_box()
                    assert left['x']+left['width']<=right['x']+10
                assert page.locator('#home-question').bounding_box()['y']<1000
                assert float(page.locator('#home-question').evaluate('(e)=>getComputedStyle(e).fontSize').replace('px',''))>=16
                assert page.locator('.s-topic-rail').evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgba(0, 0, 0, 0)'
                if width==1440:assert header['width']>=1100
            if name=='catalog':
                assert page.locator('.catalog-group').count()==16
                no_overlap()
            if name=='chat':
                box=page.locator('.chat-shell').bounding_box()
                assert abs(box['width']-header['width'])<1.5,(width,box,header)
                assert box['y']+box['height']<=1001,(width,'chat height',box)
            if name in ('privacy','terms'):
                assert page.locator('.lvd-legal-section').count()==11
            if name=='contact':assert page.locator('#contact-form').count()==1
            if out and width in (390,1440) and name in ('home','catalog','news','chat','contact'):
                for image in page.locator('.press-photo img').all():
                    image.scroll_into_view_if_needed();image.evaluate('(e)=>e.decode()')
                    assert image.evaluate('(e)=>getComputedStyle(e).filter')=='none'
                page.evaluate('scrollTo(0,0)')
                page.screenshot(path=str(out/f'{name}-{width}.png'),full_page=True)
            report.append({'width':width,'route':route,'status':'passed'})
        print('PASS: 12 routes at',width,flush=True)
    page.set_viewport_size({'width':1440,'height':1000});go('/')
    page.locator('#home-question').focus()
    expect(page.locator('#home-question')).to_be_focused()
    page.locator('#home-question').fill('Tôi muốn tìm hiểu việc ủy quyền quản lý nhà.')
    page.locator('#home-ask [type=submit]').click()
    expect(page.locator('.chat-message.user')).to_have_count(1)
    expect(page.locator('#chat-log')).to_contain_text('Chưa thể trả lời')
    page.locator('.chat-top [data-handoff]').click()
    expect(page.locator('#handoff-form')).to_be_visible()
    go('/tra-cuu')
    page.add_style_tag(content='.catalog-group-body strong{font-size:32px!important}')
    no_overlap()
    go('/lien-he')
    page.locator('#question').fill('Nội dung giả để kiểm tra biểu mẫu.')
    page.locator('#name').fill('Người kiểm tra')
    page.locator('#email').fill('qa@example.invalid')
    page.locator('#consent').check()
    page.locator('#contact-form [type=submit]').click()
    expect(page.locator('#form-error')).to_contain_text('Chưa gửi được')
    go('/chinh-sach-thong-tin')
    page.locator('[data-policy-anchor="data"]').click()
    assert page.url.endswith('#/chinh-sach-thong-tin')
    assert page.evaluate('document.activeElement.id')=='data'
    go('/tra-cuu')
    assert page.evaluate('window.LVD_CATALOG.topics.length')==303
    assert page.evaluate('window.LVD_CATALOG.groups.length')==16
    assert not errors,errors
    if out:(out/'report.json').write_text(json.dumps({'views':report,'additional_checks':6,'runtime_errors':errors},ensure_ascii=False,indent=2))
    browser.close()
server.shutdown()
print('PASS: 72 responsive views, typography scaling, form honesty and core journeys')

"""Luat Viet Duc editorial 0.4 browser checks. No real user data.
Run from repo root with Playwright/Chromium and Pillow installed.
This is prototype QA, not an audit of production security or legal accuracy.
"""
from __future__ import annotations
import functools, http.server, json, threading, traceback, shutil, re, base64
from pathlib import Path
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright, expect
ROOT=Path.cwd(); OUT=ROOT/'build'; QA=OUT/'qa'; QA.mkdir(parents=True,exist_ok=True)
passed=[]; failures=[]; errors=[]; network=[]
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{server.server_port}/'

def run(name,func):
    try:
        func();passed.append(name);print('PASS',name,flush=True)
    except Exception as exc:
        failures.append({'name':name,'error':str(exc),'trace':traceback.format_exc()[-5000:]})
        print('FAIL',name,str(exc),flush=True)
        try: page.screenshot(path=str(QA/f'failure-{len(failures)}.png'),full_page=True)
        except Exception: pass

def nav(route):
    page.goto(BASE+'#'+route,wait_until='load');page.wait_for_timeout(90)
    expect(page.locator('#main')).not_to_contain_text('Đang mở bản duyệt')

def layout(route,width):
    page.set_viewport_size({'width':width,'height':950});nav(route)
    dims=page.evaluate('''()=>({vw:innerWidth,body:document.body.scrollWidth,html:document.documentElement.scrollWidth})''')
    assert dims['body']<=width+1 and dims['html']<=width+1,dims
    assert page.locator('#main h1,#main h2').count()>0
    for img in page.locator('#main img').all():
        img.scroll_into_view_if_needed();expect(img).to_be_visible()
        expect(img).to_have_js_property('complete',True)
        assert img.evaluate('(el)=>el.naturalWidth')>100
        assert img.get_attribute('alt'),'Missing alternative text'
    if width in [390,1440] and route in ['/', '/tin-tuc','/tin/deutschlandticket-2027','/bai-viet/dong-xuan-berlin','/gui-cau-hoi','/nguon-anh']:
        page.evaluate('document.activeElement?.blur()');page.evaluate('scrollTo(0,0)');page.wait_for_timeout(150)
        name={'/':'home','/tin-tuc':'news','/tin/deutschlandticket-2027':'article','/bai-viet/dong-xuan-berlin':'community','/gui-cau-hoi':'contact','/nguon-anh':'credits'}[route]
        page.screenshot(path=str(QA/f'{name}-{width}.png'),full_page=True)

def photo_manifest():
    manifest=json.loads((ROOT/'assets/photo-sources.json').read_text())
    assert len(manifest)==8
    for p in manifest:
        assert p['author'] and p['page'].startswith('https://') and p['licenseUrl'].startswith('https://')
        for width in [600,1200,1800]:
            im=Image.open(ROOT/f"assets/photos/{p['id']}-{width}.webp").convert('RGB')
            r,g,b=im.split()
            assert ImageChops.difference(r,g).getextrema()[1]<=2
            assert ImageChops.difference(r,b).getextrema()[1]<=2

def grayscale_interface():
    for route in ['/','/gui-cau-hoi','/hoi-dap/uy-quyen-quan-ly-nha','/dang-nhap','/nguon-anh']:
        nav(route)
        bad=page.evaluate('''()=>{const bad=[];for(const el of document.querySelectorAll('body *')){const s=getComputedStyle(el);if(s.display==='none'||!el.getBoundingClientRect().width)continue;for(const p of ['color','backgroundColor','borderTopColor','outlineColor']){const v=s[p];const m=v?.match(/rgba?\(([^)]+)\)/);if(!m)continue;const n=m[1].split(',').map(Number);if(n[3]===0)continue;if(Math.max(...n.slice(0,3))-Math.min(...n.slice(0,3))>2)bad.push([el.tagName,el.className,p,v]);}}return bad.slice(0,12)}''')
        assert not bad,bad

def content_and_news_search():
    nav('/')
    assert page.locator('#main img').count()>=10
    data=page.evaluate('LVD_NEWS.stories.map(s=>({id:s.id,type:s.type,source:s.sourceUrl,title:s.title}))')
    assert len(data)==10 and all(s['source'].startswith('https://') for s in data)
    for s in data:
        nav(('/tin/' if s['type']=='news' else '/bai-viet/')+s['id'])
        expect(page.locator('.news-title h1')).to_have_text(s['title'])
        assert page.locator('.news-sources a').count()>=1
        assert page.locator('.news-figure figcaption').inner_text()
    nav('/tin-tuc?nhom=cong-dong')
    expect(page.locator('.listing-grid .press-card')).to_have_count(1)
    page.locator('#news-keyword').fill('Kindergeld')
    page.locator('[data-news-search] button').click()
    expect(page.locator('.listing-grid .press-card')).to_have_count(1)
    nav('/tin-tuc?q=zzzzkhongco')
    expect(page.locator('.empty-state')).to_be_visible()

def keyboard_and_global_search():
    page.set_viewport_size({'width':1440,'height':950});nav('/')
    page.locator('#skip-main').focus();page.locator('#skip-main').click()
    assert page.evaluate('document.activeElement.id')=='main'
    page.get_by_role('button',name='Mở tìm kiếm',exact=True).click()
    page.locator('#dialog-search').fill('uy quyen')
    page.locator('#search-dialog form button').click()
    expect(page.locator('.result-item')).to_have_count(3)
    page.locator('.result-item h2 a').first.click()
    expect(page.locator('#answer')).to_be_visible()
    page.go_back();expect(page.locator('#search-page')).to_have_value('uy quyen')
    nav('/tim-kiem?q=Kindergeld')
    expect(page.locator('.result-item')).to_have_count(1)
    page.locator('.result-item h2 a').click()
    expect(page.locator('.news-title h1')).to_contain_text('Kindergeld')
    page.get_by_role('button',name='Mở tìm kiếm',exact=True).click();page.keyboard.press('Escape')
    expect(page.locator('#search-dialog')).not_to_be_visible()
    page.set_viewport_size({'width':320,'height':850});nav('/')
    page.get_by_role('button',name='Mở menu',exact=True).click()
    page.locator('#menu-dialog').get_by_role('link',name='Tin tức',exact=True).click()
    expect(page.locator('.newsroom-list')).to_be_visible()
    expect(page.locator('#menu-dialog')).not_to_be_visible()

def bookmark_and_form():
    page.set_viewport_size({'width':1440,'height':950});nav('/tin/deutschlandticket-2027')
    page.locator('[data-save]').click();page.locator('[data-demo-login]').click()
    expect(page.locator('[data-save]')).to_have_attribute('aria-pressed','true')
    assert '/tin/deutschlandticket-2027' in page.url
    nav('/tai-khoan?muc=da-luu');expect(page.locator('.question-row')).to_have_count(1)
    page.locator('[data-logout]').click()
    nav('/gui-cau-hoi?test=error')
    page.locator('#contact-form [type=submit]').click()
    expect(page.locator('#question')).to_have_attribute('aria-invalid','true')
    page.locator('[data-fill-demo]').click();page.locator('#consent').check()
    original=page.locator('#question').input_value()
    page.locator('#contact-form [type=submit]').click()
    expect(page.locator('#form-error')).to_be_visible()
    expect(page.locator('#question')).to_have_value(original)
    page.locator('#contact-form [type=submit]').click()
    expect(page.locator('.reference')).to_be_visible()
    page.locator('[data-follow]').click();page.locator('#email-form button').click()
    page.locator('#otp').fill('000000');page.locator('#otp-form button').click()
    expect(page.locator('#otp-error')).to_contain_text('chưa đúng')
    page.locator('#otp').fill('123456');page.locator('#otp-form button').click()
    expect(page.locator('.message')).to_have_count(1)
    page.locator('#reply').fill('Nội dung dùng thử, không phải hồ sơ thật.')
    page.locator('#reply-form button').click();expect(page.locator('.message')).to_have_count(2)
    page.reload(wait_until='load');expect(page.locator('#email-form')).to_be_visible()
    assert page.evaluate('localStorage.length')==0
    assert page.evaluate('sessionStorage.length')==0

def filter_regression():
    nav('/hoi-dap');expect(page.locator('.result-item')).to_have_count(6)
    page.get_by_role('link',name='Trang 3',exact=True).click()
    expect(page.locator('.result-item')).to_have_count(2)
    nav('/tra-cuu');page.locator('#filter-topic').select_option('nha-dat')
    page.locator('#filter-type').select_option('qa');page.locator('#filter-form button').click()
    expect(page.locator('.result-item')).to_have_count(2)
    nav('/tim-kiem?q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E')
    assert page.locator('#main img').count()==0
    nav('/tai-khoan/cau-hoi/UNKNOWN');assert page.locator('.message').count()==0

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1440,'height':950},locale='vi-VN',reduced_motion='reduce')
    page=context.new_page();page.set_default_timeout(8000)
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
    page.on('request',lambda r: network.append(r.url))
    routes=['/','/tin-tuc','/song-o-duc','/cong-dong','/tin/deutschlandticket-2027','/bai-viet/dong-xuan-berlin','/tra-cuu','/chu-de','/tim-kiem?q=Kindergeld','/hoi-dap/uy-quyen-quan-ly-nha','/gui-cau-hoi','/dang-nhap','/so-do','/nguon-anh']
    for width in [320,360,390,768,1024,1440]:
        for route in routes: run(f'Layout and images {width}px {route}',lambda r=route,w=width:layout(r,w))
    run('Eight licensed source photos and 24 grayscale derivatives',photo_manifest)
    run('All rendered interface colors are neutral',grayscale_interface)
    run('Ten sourced articles and editorial search',content_and_news_search)
    run('Keyboard mobile menu and unified search',keyboard_and_global_search)
    run('News bookmarking and demo question/OTP/reply',bookmark_and_form)
    run('Legal filters pagination and escaping regression',filter_regression)
    if errors: failures.append({'name':'Browser errors','error':errors})
    else: passed.append('No JavaScript or CSP errors')
    outgoing=[r for r in network if r.startswith('http') and not r.startswith(BASE)]
    if outgoing: failures.append({'name':'Unexpected external requests','error':outgoing})
    else: passed.append('Images and interface use same-origin requests only')
    browser.close()
server.shutdown()
site=OUT/'site';site.mkdir(exist_ok=True)
for name in ['index.html','README.md','wireframe-v0.1.html']:
    if (ROOT/name).exists():shutil.copyfile(ROOT/name,site/name)
shutil.copytree(ROOT/'assets',site/'assets',dirs_exist_ok=True)
# Export portable single HTML, retaining original credits and source links.
html=(ROOT/'index.html').read_text()
html=re.sub(r'\s*<meta http-equiv="Content-Security-Policy"[^>]*>','',html)
for css in ['styles.css','newsroom.css']:
    html=html.replace(f'<link rel="stylesheet" href="assets/{css}?v=0.4.0">','<style>'+ (ROOT/'assets'/css).read_text()+'</style>')
for name in ['content.js','news-content.js','newsroom.js','app.js']:
    html=html.replace(f'<script src="assets/{name}?v=0.4.0" defer></script>','')
    script=(ROOT/'assets'/name).read_text().replace('</script','<\\/script')
    html=html.replace('</body>','<script>'+script+'</script>\n</body>')
# A local same-origin source ZIP is the primary editable export.
(OUT/'LuatVietDuc_HTML_v0.4.html').write_text(html)
report={'status':'passed' if not failures else 'failed','version':'0.4.0','passed_checks':len(passed),'failed_checks':len(failures),'widths':[320,360,390,768,1024,1440],'checks':passed,'failures':failures,'runtime_errors':errors,'scope':'Automated Chromium prototype checks, not production security or legal-content certification.'}
(QA/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in report.items() if k not in ['checks','failures']},ensure_ascii=False,indent=2))
raise SystemExit(1 if failures else 0)

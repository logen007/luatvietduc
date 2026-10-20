"""Color-theme regression review; screenshots are internal QA, not website content."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import functools, http.server, json, threading

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(Path.cwd())))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/'
out = Path('qa-color-internal')
out.mkdir(exist_ok=True)
checks = []
errors = []

def contrast(foreground, background):
    def luminance(value):
        value = value.lstrip('#')
        rgb = [int(value[i:i+2], 16) / 255 for i in (0, 2, 4)]
        rgb = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
        return sum(a*b for a,b in zip(rgb, [.2126, .7152, .0722]))
    lower, upper = sorted([luminance(foreground), luminance(background)])
    return (upper+.05)/(lower+.05)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width':1440, 'height':1000}, locale='vi-VN', reduced_motion='reduce')
    page.on('pageerror', lambda error: errors.append(str(error)))
    routes = ['/', '/hoi-dap-ai', '/tra-cuu', '/tin-tuc', '/tin/mindestlohn-2026', '/gui-cau-hoi']
    names = ['home', 'chat', 'library', 'news', 'article', 'contact']
    for width in [320, 390, 768, 1024, 1440]:
        page.set_viewport_size({'width':width, 'height':1000})
        for route, name in zip(routes, names):
            page.goto(base+'#'+route, wait_until='load')
            page.evaluate('document.fonts.ready')
            expect(page.locator('#main h1')).to_have_count(1)
            assert page.evaluate('document.documentElement.scrollWidth') <= width+1, (width, route)
            assert page.evaluate('getComputedStyle(document.documentElement).getPropertyValue("--brand").trim()') == '#0B5FCC'
            if route == '/':
                assert page.locator('.s-hero').evaluate('e=>getComputedStyle(e).backgroundColor') == 'rgb(221, 242, 255)'
                assert page.locator('.s-library').evaluate('e=>getComputedStyle(e).backgroundColor') == 'rgb(8, 43, 75)'
                assert page.locator('#home-ask button').evaluate('e=>getComputedStyle(e).backgroundColor') == 'rgb(11, 95, 204)'
                expect(page.locator('.press-photo img')).to_have_count(7)
                assert page.locator('#home-demo,.preview-bar').count() == 0
            if width in [390, 1440]:
                for image in page.locator('.press-photo img').all():
                    image.scroll_into_view_if_needed()
                    image.evaluate('(e)=>e.decode()')
                page.evaluate('scrollTo(0,0)')
                page.screenshot(path=str(out/f'{name}-{width}.png'), full_page=(route!='/hoi-dap-ai'))
            checks.append(f'{width}px {route}')
    page.set_viewport_size({'width':1440, 'height':1000})
    page.goto(base+'#/', wait_until='load')
    page.locator('#home-question').fill('Tôi muốn ủy quyền từ Đức')
    page.locator('#home-ask button').click()
    expect(page.locator('.chat-message.user')).to_have_count(1)
    expect(page.locator('.chat-source')).to_be_visible()
    assert page.locator('.chat-message.user .chat-message-body').evaluate('e=>getComputedStyle(e).backgroundColor') == 'rgb(223, 239, 255)'
    page.locator('.chat-top [data-handoff]').click()
    page.locator('#handoff-form [type=submit]').click()
    expect(page.locator('#handoff-error')).not_to_be_empty()
    checks.append('Chat and handoff states retain their existing behavior')
    page.screenshot(path=str(out/'chat-message-1440.png'), full_page=False)
    assert not errors, errors
    for foreground, background in [('#FFFFFF','#0B5FCC'),('#3D607D','#DDF2FF'),('#557085','#FFFFFF'),('#F0F7FF','#082B4B'),('#B42332','#F3F9FF')]:
        ratio=contrast(foreground, background)
        assert ratio >= 4.5, (foreground, background, ratio)
        checks.append(f'Contrast {foreground} / {background}: {ratio:.2f}')
    browser.close()
server.shutdown()
report = {'status':'passed','checks':checks,'runtime_errors':errors,'scope':'Chromium UI checks and selected text contrast pairs; no full accessibility or backend audit.'}
(out/'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'{len(checks)} color and layout checks passed.')

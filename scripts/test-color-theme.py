"""Color-theme regression review; screenshots are internal QA, not website content."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import functools, http.server, json, re, threading

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
        if value.startswith('#'):
            value = value.lstrip('#')
            rgb = [int(value[i:i+2], 16) / 255 for i in (0, 2, 4)]
        else:
            rgb = [float(channel) / 255 for channel in re.findall(r'[\d.]+', value)[:3]]
            assert len(rgb) == 3, ('Unsupported computed color', value)
        rgb = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
        return sum(a*b for a,b in zip(rgb, [.2126, .7152, .0722]))
    lower, upper = sorted([luminance(foreground), luminance(background)])
    return (upper+.05)/(lower+.05)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width':1440, 'height':1000}, locale='vi-VN', reduced_motion='reduce')
    page.on('pageerror', lambda error: errors.append(str(error)))
    def readable(locator, label):
        expect(locator).to_be_visible()
        colors = locator.evaluate('''el => {
          const foreground = getComputedStyle(el).color;
          for (let node = el; node; node = node.parentElement) {
            const style = getComputedStyle(node);
            const components = style.backgroundColor.match(/[\\d.]+/g)?.map(Number);
            if (components && (components.length === 3 || components[3] === 1)) {
              if (style.backgroundImage !== 'none') throw new Error('Contrast sample needs a solid background');
              return {foreground, background: style.backgroundColor};
            }
          }
          throw new Error('No opaque background for contrast sample');
        }''')
        ratio = contrast(colors['foreground'], colors['background'])
        assert ratio >= 4.5, (label, colors, ratio)
        checks.append(f'{label}: rendered contrast {ratio:.2f}:1')
    routes = ['/', '/hoi-dap-ai', '/tra-cuu', '/tin-tuc', '/tin/mindestlohn-2026', '/gui-cau-hoi']
    names = ['home', 'chat', 'library', 'news', 'article', 'contact']
    for width in [320, 390, 768, 1024, 1440]:
        page.set_viewport_size({'width':width, 'height':1000})
        for route, name in zip(routes, names):
            page.goto(base+'#'+route, wait_until='load')
            page.evaluate('document.fonts.ready')
            expect(page.locator('#main h1')).to_have_count(1)
            assert page.evaluate('document.documentElement.scrollWidth') <= width+1, (width, route)
            if route == '/':
                assert 'gradient' in page.locator('.s-hero').evaluate('e=>getComputedStyle(e).backgroundImage')
                readable(page.locator('#home-search [type=submit]'), f'{width}px search action')
                readable(page.locator('.s-library-intro > p').first, f'{width}px library description')
                readable(page.locator('.lvd-footer-nav a').first, f'{width}px footer navigation')
                expect(page.locator('.press-photo img')).to_have_count(3)
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
    page.locator('#home-search-query').fill('ủy quyền')
    page.locator('#home-search [type=submit]').click()
    expect(page.locator('#main h1')).to_contain_text('Kết quả tìm kiếm')
    assert page.locator('.result-item').count()>0
    page.goto(base+'#/hoi-dap-ai', wait_until='load')
    expect(page.locator('.chat-availability')).to_contain_text('chưa khả dụng')
    page.locator('#chat-question').fill('Tôi muốn ủy quyền từ Đức')
    page.locator('#chat-compose [type=submit]').click()
    expect(page.locator('.chat-message.user')).to_have_count(1)
    expect(page.locator('.chat-source').first).to_be_visible()
    readable(page.locator('.chat-message.user .chat-message-body'), 'Chat user message')
    page.locator('.chat-top [data-handoff]').click()
    page.locator('#handoff-form [type=submit]').click()
    expect(page.locator('#handoff-error')).not_to_be_empty()
    readable(page.locator('#handoff-error'), 'Handoff validation message')
    checks.append('Chat and handoff states retain their existing behavior')
    page.screenshot(path=str(out/'chat-message-1440.png'), full_page=False)
    assert not errors, errors
    browser.close()
server.shutdown()
report = {'status':'passed','checks':checks,'runtime_errors':errors,'scope':'Chromium UI checks and selected text contrast pairs; no full accessibility or backend audit.'}
(out/'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'{len(checks)} color and layout checks passed.')

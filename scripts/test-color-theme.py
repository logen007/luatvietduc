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
    def cool_surface(locator, label, blue_required=False):
        colors = locator.evaluate('''el => {
          const s = getComputedStyle(el);
          return [s.backgroundColor, ...(s.backgroundImage.match(/rgba?\\([^)]+\\)/g) || [])];
        }''')
        channels = [[float(n) for n in re.findall(r'[\d.]+', value)] for value in colors]
        channels = [rgb for rgb in channels if len(rgb) == 3 or rgb[3] > 0]
        assert channels, (label, 'missing surface color', colors)
        assert all(rgb[2] >= rgb[0] - 1 and rgb[2] >= rgb[1] - 1 for rgb in channels), (label, 'warm surface survived', colors)
        if blue_required:
            assert any(rgb[2] > rgb[0] + 20 and rgb[2] > rgb[1] + 10 for rgb in channels), (label, 'expected blue surface', colors)
        checks.append(f'{label}: consistent cool palette')
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
                expect(page.locator('.s-ask-panel #home-ask')).to_have_count(1)
                expect(page.locator('#home-question')).to_be_visible()
                assert page.locator('#home-search-query,.lvd-hero-art,.lvd-team-teaser,.lvd-team-section').count()==0
                question_size=float(page.locator('#home-question').evaluate('e=>getComputedStyle(e).fontSize').replace('px',''))
                assert question_size>=16,(width,'mobile-safe chat input',question_size)
                action=page.locator('#home-ask [type=submit]')
                readable(action, f'{width}px chat action')
                color=action.evaluate('e=>getComputedStyle(e).backgroundColor')
                channels=[float(n) for n in re.findall(r'[\d.]+',color)[:3]]
                assert channels[2]>channels[0] and channels[2]>channels[1],(width,'blue chat action',color)
                readable(page.locator('.s-library-links > a').first, f'{width}px library navigation')
                readable(page.locator('.lvd-footer-nav a').first, f'{width}px footer navigation')
                expect(page.locator('.press-photo img')).to_have_count(3)
                assert page.locator('#home-demo,.preview-bar').count() == 0
            if route == '/hoi-dap-ai':
                for selector in ['.chat-sidebar', '.chat-log', '.chat-welcome-symbol', '.chat-compose-wrap', '.chat-prompt-icon']:
                    cool_surface(page.locator(selector).first, f'{width}px {selector}')
            if route == '/tra-cuu':
                cool_surface(page.locator('.catalog-page > .page-heading'), f'{width}px catalogue hero', blue_required=True)
                cool_surface(page.locator('.catalog-help'), f'{width}px catalogue help', blue_required=True)
                cool_surface(page.locator('.catalog-group-icon').first, f'{width}px catalogue icon')
            if route == '/tin-tuc':
                cool_surface(page.locator('.newsroom-list > .page-heading'), f'{width}px news hero', blue_required=True)
                cool_surface(page.locator('.listing-grid > .press-card').first, f'{width}px lead news card')
            if route == '/tin/mindestlohn-2026':
                cool_surface(page.locator('.news-summary'), f'{width}px article summary')
                cool_surface(page.locator('.news-sources'), f'{width}px article sources')
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
    page.locator('#home-ask [type=submit]').click()
    expect(page.locator('.chat-message.user')).to_have_count(1)
    expect(page.locator('#chat-log')).to_contain_text('Chưa thể trả lời')
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

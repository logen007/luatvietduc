"""Check real rendered Vietnamese glyphs and original-color photographs.
No font binaries are written to disk or included in review artifacts.
"""
from pathlib import Path
import functools, http.server, json, os, threading, unicodedata
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(Path.cwd())))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = os.environ.get('LIVE_URL') or f'http://127.0.0.1:{server.server_port}/'
out = Path(os.environ.get('FONT_QA', 'qa-fonts')); out.mkdir(exist_ok=True, parents=True)
report = {'vietnamese_families': ['Geist', 'Geist Mono'], 'layouts': [], 'rendered_fonts': {}, 'color_assets': []}
sample = 'Hỏi đáp pháp luật cho người Việt tại Đức. Ủy quyền, cư trú, lao động, gia đình, nhà đất, thừa kế.'
letters = 'aàáảãạăằắẳẵặâầấẩẫậeèéẻẽẹêềếểễệiìíỉĩịoòóỏõọôồốổỗộơờớởỡợuùúủũụưừứửữựyỳýỷỹỵđ'
probe = letters + ' ' + letters.upper() + ' ' + sample
for path in sorted(Path('assets/photos').glob('*.webp')):
    with Image.open(path) as original:
        image = original.convert('RGB'); image.thumbnail((120, 120))
        r, g, b = image.split()
        chroma = ImageStat.Stat(ImageChops.lighter(ImageChops.difference(r, g), ImageChops.difference(g, b))).mean[0]
        assert chroma > 2, ('grayscale file', str(path), chroma)
        report['color_assets'].append({'path': str(path), 'chroma': round(chroma, 4)})
assert len(report['color_assets']) == 24
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(locale='vi-VN', reduced_motion='reduce', viewport={'width': 1440, 'height': 1000})
    page = context.new_page(); errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
    page.goto(base + '#/', wait_until='networkidle'); page.evaluate('document.fonts.ready')
    cdp = context.new_cdp_session(page); cdp.send('DOM.enable'); cdp.send('CSS.enable')
    def fonts_for(selector, expected):
        doc = cdp.send('DOM.getDocument')['root']['nodeId']
        nodes = cdp.send('DOM.querySelectorAll', {'nodeId': doc, 'selector': selector + ', ' + selector + ' *'})['nodeIds']
        fonts = []
        for node in nodes:
            fonts += [f for f in cdp.send('CSS.getPlatformFontsForNode', {'nodeId': node})['fonts'] if f['glyphCount'] > 0]
        assert fonts, ('no rendered glyphs', selector)
        # Fontations is a rendering-backend annotation, not a separate typeface.
        assert all(f['isCustomFont'] and f['familyName'].removesuffix(' (Fontations)') == expected for f in fonts), (selector, expected, fonts)
        report['rendered_fonts'][selector] = fonts
    for form in ('NFC', 'NFD'):
        text = unicodedata.normalize(form, probe)
        page.evaluate('''text => {
          for (const [id, font] of [['probe-sans', 'Geist'], ['probe-mono', 'Geist Mono']]) {
            document.getElementById(id)?.remove();
            const e = document.createElement('span'); e.id = id; e.textContent = text; e.lang = 'vi';
            e.style.cssText = 'position:absolute;top:0;left:0;opacity:0;pointer-events:none;max-width:900px;font-size:32px;font-family:"' + font + '"';
            e.setAttribute('aria-hidden', 'true'); document.body.append(e);
          }
        }''', text)
        page.evaluate('''async text => {
          await Promise.all([document.fonts.load('400 32px "Geist"', text), document.fonts.load('400 32px "Geist Mono"', text)]);
          await document.fonts.ready;
        }''', text)
        fonts_for('#probe-sans', 'Geist'); fonts_for('#probe-mono', 'Geist Mono')
        report['rendered_fonts'][form] = {'sans': report['rendered_fonts']['#probe-sans'], 'mono': report['rendered_fonts']['#probe-mono']}
    page.evaluate("document.querySelectorAll('[id^=probe-]').forEach(e => e.remove())")
    fonts_for('.s-hero h1', 'Geist'); fonts_for('.desktop-nav a', 'Geist Mono'); fonts_for('.s-topic-rail button', 'Geist Mono')
    assert page.locator('#home-question').evaluate('(el)=>getComputedStyle(el).fontFamily').startswith('Geist')
    routes = [('/', 'home'), ('/hoi-dap-ai', 'chat'), ('/tra-cuu', 'library'), ('/tin-tuc', 'news'), ('/tin/mindestlohn-2026', 'article'), ('/gui-cau-hoi', 'contact'), ('/nguon-anh', 'credits')]
    for width in (320, 360, 390, 768, 1024, 1440):
        page.set_viewport_size({'width': width, 'height': 1000})
        for route, label in routes:
            page.goto(base + '#' + route, wait_until='load'); page.evaluate('document.fonts.ready')
            assert page.locator('#main h1').count() == 1, (width, route)
            assert page.evaluate('document.documentElement.scrollWidth') <= width + 1, (width, route, 'overflow')
            fonts_for('#main h1', 'Geist')
            assert '\ufffd' not in page.locator('body').inner_text()
            assert 'đen trắng' not in page.locator('body').inner_text()
            for image in page.locator('.press-photo img').all():
                image.scroll_into_view_if_needed(); image.evaluate('(el) => el.decode()')
                assert image.evaluate('(el) => el.naturalWidth > 0')
                assert image.evaluate('(el) => getComputedStyle(el).filter') == 'none'
                chroma = image.evaluate('''el => {
                  const c = document.createElement('canvas'); c.width = 48; c.height = 48;
                  const ctx = c.getContext('2d'); ctx.drawImage(el, 0, 0, 48, 48);
                  const pixels = ctx.getImageData(0, 0, 48, 48).data;
                  let sum = 0; for (let i = 0; i < pixels.length; i += 4) sum += Math.max(Math.abs(pixels[i] - pixels[i + 1]), Math.abs(pixels[i + 1] - pixels[i + 2]));
                  return sum / (48 * 48);
                }''')
                assert chroma > 2, (route, image.get_attribute('src'), chroma)
                image.hover(); assert image.evaluate('(el) => getComputedStyle(el).filter') == 'none'
            if route == '/':
                assert page.locator('.s-rail-label').count() == 0
                assert page.locator('.s-topic-rail').evaluate('(el) => getComputedStyle(el).backgroundColor') == 'rgba(0, 0, 0, 0)'
            report['layouts'].append({'route': route, 'width': width})
            if width in (390, 1440) and label in ('home', 'chat', 'article', 'contact'):
                page.evaluate('scrollTo(0,0)'); page.screenshot(path=str(out / f'{label}-{width}.png'), full_page=True)
                if label == 'home' and width == 1440: page.screenshot(path=str(out / 'home-top.png'))
    assert not errors, errors
    report['runtime_errors'] = errors; browser.close()
server.shutdown()
(out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'status': 'passed', 'vietnamese_families': report['vietnamese_families'], 'layouts': len(report['layouts']), 'color_variants': len(report['color_assets']), 'normalization_forms': ['NFC', 'NFD']}, ensure_ascii=False, indent=2))

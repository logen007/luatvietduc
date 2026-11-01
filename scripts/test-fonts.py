"""Check real rendered Vietnamese glyphs and original-color photographs.
Uses bundled webfonts without copying font binaries into review artifacts.
"""
from pathlib import Path
import functools, http.server, json, os, re, threading, unicodedata
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(Path.cwd())))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = os.environ.get('LIVE_URL') or f'http://127.0.0.1:{server.server_port}/'
out = Path(os.environ.get('FONT_QA', 'qa-fonts')); out.mkdir(exist_ok=True, parents=True)
font_faces={400:'Roobert',500:'Roobert Medium',600:'Roobert SemiBold'}
roobert_families=set(font_faces.values())
font_weights=(400,500,600)
font_files={f'roobert-{style}.woff2':weight for style,weight in [('regular',400),('medium',500),('semibold',600)]}
font_root=Path('assets/fonts')
assert {path.name for path in font_root.glob('*.woff2')}==set(font_files)
assert all((font_root/name).read_bytes().startswith(b'wOF2') for name in font_files)
manifest=json.loads((font_root/'sources.json').read_text())
assert manifest['family']=='Roobert' and manifest.get('license')
assert {entry['path']:entry['weight'] for entry in manifest['files']}==font_files
assert all(entry['source'].startswith('https://mindcloud.co/') for entry in manifest['files'])
font_policy=re.search(r'font-src\s+([^;]+)',Path('index.html').read_text())
assert font_policy and font_policy.group(1).strip()=="'self'",'Webfonts must be served from the site'
report = {'vietnamese_families': sorted(roobert_families), 'weights': list(font_weights), 'layouts': [], 'rendered_fonts': {}, 'color_assets': []}
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
    page = context.new_page(); errors = []; font_requests=[]
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
    page.on('request', lambda request:font_requests.append(request.url) if request.resource_type=='font' else None)
    page.goto(base + '#/', wait_until='networkidle'); page.evaluate('document.fonts.ready')
    cdp = context.new_cdp_session(page); cdp.send('DOM.enable'); cdp.send('CSS.enable')
    def fonts_for(selector, expected=roobert_families):
        doc = cdp.send('DOM.getDocument')['root']['nodeId']
        nodes = cdp.send('DOM.querySelectorAll', {'nodeId': doc, 'selector': selector + ', ' + selector + ' *'})['nodeIds']
        fonts = []
        for node in nodes:
            fonts += [f for f in cdp.send('CSS.getPlatformFontsForNode', {'nodeId': node})['fonts'] if f['glyphCount'] > 0]
        assert fonts, ('no rendered glyphs', selector)
        # Fontations is a rendering-backend annotation, not a separate typeface.
        allowed={expected} if isinstance(expected,str) else expected
        assert all(f['isCustomFont'] and f['familyName'].removesuffix(' (Fontations)') in allowed for f in fonts), (selector, allowed, 'no system fallback', fonts)
        report['rendered_fonts'][selector] = fonts
    for form in ('NFC', 'NFD'):
        text = unicodedata.normalize(form, probe)
        page.evaluate('''text => {
          for (const weight of [400,500,600]) {
            const id = 'probe-' + weight;
            document.getElementById(id)?.remove();
            const e = document.createElement('span'); e.id = id; e.textContent = text; e.lang = 'vi';
            e.style.cssText = 'position:absolute;top:0;left:0;opacity:0;pointer-events:none;max-width:900px;font-size:32px;font-family:"LVD Roobert",Arial,sans-serif;font-weight:' + weight;
            e.setAttribute('aria-hidden', 'true'); document.body.append(e);
          }
        }''', text)
        page.evaluate('''async text => {
          await Promise.all([400,500,600].map(weight=>document.fonts.load(weight+' 32px "LVD Roobert"', text)));
          await document.fonts.ready;
        }''', text)
        for weight in font_weights:
            selector=f'#probe-{weight}'
            assert page.locator(selector).evaluate('(el)=>getComputedStyle(el).fontWeight')==str(weight)
            fonts_for(selector,font_faces[weight])
        report['rendered_fonts'][form] = {str(weight):report['rendered_fonts'][f'#probe-{weight}'] for weight in font_weights}
    page.evaluate("document.querySelectorAll('[id^=probe-]').forEach(e => e.remove())")
    fonts_for('.s-hero h1'); fonts_for('.desktop-nav a'); fonts_for('.lvd-home-popular button')
    assert page.locator('#home-question').evaluate('(el)=>getComputedStyle(el).fontFamily').split(',')[0].strip(chr(34)) == 'LVD Roobert'
    routes = [('/', 'home'), ('/hoi-dap-ai', 'chat'), ('/tra-cuu', 'library'), ('/tin-tuc', 'news'), ('/tin/mindestlohn-2026', 'article'), ('/gui-cau-hoi', 'contact'), ('/lien-he', 'contact-new'), ('/chinh-sach-thong-tin', 'privacy'), ('/dieu-khoan', 'terms')]
    for width in (320, 360, 390, 768, 1024, 1440):
        page.set_viewport_size({'width': width, 'height': 1000})
        for route, label in routes:
            page.goto(base + '#' + route, wait_until='load'); page.evaluate('document.fonts.ready')
            # Measure after the responsive layout has painted, including a viewport change.
            page.evaluate('async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);}')
            assert page.locator('#main h1').count() == 1, (width, route)
            rendered_width=page.evaluate('document.documentElement.scrollWidth')
            if rendered_width>width+1:
                phases=page.evaluate('''async()=>{const values=[{phase:'immediate',width:document.documentElement.scrollWidth,fontStatus:document.fonts.status}];for(let i=1;i<=2;i++){await new Promise(requestAnimationFrame);values.push({phase:'frame-'+i,width:document.documentElement.scrollWidth,fontStatus:document.fonts.status});}return values;}''')
                overflow=page.locator('body *').evaluate_all('''elements=>elements.map(el=>({tag:el.tagName,id:el.id,class:el.className?.baseVal??el.className,right:el.getBoundingClientRect().right,left:el.getBoundingClientRect().left,width:el.getBoundingClientRect().width})).filter(el=>el.width>0&&(el.right>innerWidth+1||el.left < -1)).slice(0,30)''')
                (out/'overflow.json').write_text(json.dumps({'width':width,'route':route,'scroll_width':rendered_width,'phases':phases,'elements':overflow},ensure_ascii=False,indent=2))
                page.screenshot(path=str(out/'overflow.png'),full_page=True)
            assert rendered_width <= width + 1, (width, route, 'overflow',rendered_width)
            fonts_for('#main h1')
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
                assert page.locator('.press-photo img').count() == 3
                assert page.locator('.s-guides-section').count() == 0
                assert float(page.locator('#home-question').evaluate('(el)=>getComputedStyle(el).fontSize').replace('px', '')) >= 16
            report['layouts'].append({'route': route, 'width': width})
            if width in (390, 1440) and label in ('home', 'chat', 'article', 'contact'):
                page.evaluate('scrollTo(0,0)'); page.screenshot(path=str(out / f'{label}-{width}.png'), full_page=True)
                if label == 'home' and width == 1440: page.screenshot(path=str(out / 'home-top.png'))
    assert not errors, errors
    assert font_requests and all(url.startswith(base+'assets/fonts/') for url in font_requests),('Non-local font request',font_requests)
    report['runtime_errors'] = errors; browser.close()
server.shutdown()
(out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'status': 'passed', 'vietnamese_families': report['vietnamese_families'], 'weights': report['weights'], 'layouts': len(report['layouts']), 'color_variants': len(report['color_assets']), 'normalization_forms': ['NFC', 'NFD']}, ensure_ascii=False, indent=2))

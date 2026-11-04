"""Footer social-icon layout regression: no visible button box or duplicate text."""
import functools,http.server,threading
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

server=http.server.ThreadingHTTPServer(
    ('127.0.0.1',0),functools.partial(Quiet,directory=str(Path.cwd()))
)
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/#/'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for width in (320,390,768,1440):
        page=browser.new_page(viewport={'width':width,'height':900},locale='vi-VN',reduced_motion='reduce')
        page.goto(base,wait_until='load')
        icons=page.locator('.lvd-footer-social a.lvd-social-icon')
        expect(icons).to_have_count(2)
        assert page.locator('.lvd-footer-social a:not(.lvd-social-icon)').count()==0
        for index in range(2):
            link=icons.nth(index)
            assert link.get_attribute('aria-label'), (width,index,'missing accessible label')
            assert link.get_attribute('href').startswith('https://'), (width,index,'invalid link')
            assert link.locator('svg[aria-hidden=true] path').count()==1, (width,index,'missing SVG')
            info=link.evaluate('''el=>{
                const s=getComputedStyle(el);
                const svg=el.querySelector('svg');
                const box=el.getBoundingClientRect();
                return {
                  border:s.borderTopWidth,
                  background:s.backgroundColor,
                  shadow:s.boxShadow,
                  fontSize:s.fontSize,
                  width:box.width,
                  height:box.height,
                  svgWidth:svg.getBoundingClientRect().width,
                  label:el.innerText.trim()
                };
            }''')
            assert info['border']=='0px',(width,index,'border visible',info)
            assert info['shadow']=='none',(width,index,'boxed shadow',info)
            assert info['background'] in ('rgba(0, 0, 0, 0)','transparent'),(width,index,'background visible',info)
            assert info['width']>=44 and info['height']>=44,(width,index,'small tap target',info)
            assert info['svgWidth']>=25,(width,index,'small SVG',info)
            assert not info['label'],(width,index,'label text not removed')
        assert page.evaluate('document.documentElement.scrollWidth')<=width+1,(width,'horizontal overflow')
        print('PASS footer social icons',width,flush=True)
        page.close()
    browser.close()
server.shutdown()

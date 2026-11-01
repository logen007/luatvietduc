"""Luật Việt Đức 0.9.0 — multilingual, jurisdictions, team and voluntary forms."""
import http.server,threading,functools
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(Path.cwd())))
threading.Thread(target=server.serve_forever,daemon=True).start()
base='http://127.0.0.1:'+str(server.server_port)+'/#'
count=0
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    for width in [320,390,768,1440]:
        context=browser.new_context(viewport={'width':width,'height':900},locale='vi-VN',reduced_motion='reduce')
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        def go(path):
            page.goto(base+path,wait_until='load')
            page.wait_for_timeout(115)
            page.wait_for_selector('#main h1')
            assert page.evaluate('document.documentElement.scrollWidth')<=width+2,(width,path,'overflow',page.evaluate('document.documentElement.scrollWidth'))
        for path in ['/','/tra-cuu','/phap-luat/viet-nam','/phap-luat/duc','/phap-luat/duc/thue','/doi-ngu-chuyen-gia','/lien-he','/chinh-sach-thong-tin','/dieu-khoan','/hoi-dap-ai','/tin-tuc']:
            go(path)
            assert page.locator('.lvd-footer-language button[data-language]').count()==2
            if path=='/':
                assert page.locator('#home-ask').count()==1
                assert page.locator('.s-hero-grid').count()==1
                assert page.locator('.lvd-partner-tile').count()==2
                assert 'không phải xác nhận' in page.locator('.lvd-partner-section').inner_text()
                assert page.locator('.lvd-team-teaser').count()==1
                assert page.locator('.lvd-home-countries a').count()==2
            if path=='/tra-cuu':
                assert page.locator('.catalog-group').count()==16
                assert page.locator('.lvd-country-tabs a').count()==2
                assert page.evaluate('window.LVD_CATALOG.topics.length')==303
            if path=='/phap-luat/viet-nam':
                assert page.locator('.lvd-country-tabs a').count()==2
                assert page.locator('.catalog-group').count()==16
            if path=='/phap-luat/duc':
                assert page.locator('.catalog-group').count()==16
                assert page.locator('.lvd-country-alert').count()==1
                assert '303' not in page.locator('.lvd-country-hero').inner_text()
            if path=='/phap-luat/duc/thue':
                assert page.locator('.catalog-group').count()==1
            if path=='/doi-ngu-chuyen-gia':
                assert page.locator('.lvd-expert-card').count()==9
                assert page.locator('.lvd-team-context').count()==1
                assert 'Dương Thành Tâm' in page.locator('.lvd-expert-grid').inner_text()
            if path=='/hoi-dap-ai':
                assert page.get_by_text('Gặp chuyên gia',exact=True).count()>=1
            if path=='/':
                assert 'Bizlawyerpartners' in page.locator('.lvd-footer-social').inner_html()
                assert 'bizlawyer-law-firm' in page.locator('.lvd-footer-social').inner_html()
            if path=='/chinh-sach-thong-tin':
                assert page.locator('.lvd-legal-section').count()==11
            if path=='/dieu-khoan':
                assert page.locator('.lvd-legal-section').count()==11
            count+=1;print('PASS',width,path,flush=True)
        go('/')
        assert page.get_by_role('link',name='Cẩm nang tại Đức',exact=True).count()==0
        assert page.get_by_role('link',name='Để lại thông tin',exact=False).count()==0
        page.locator('[data-language=de]').click()
        page.wait_for_timeout(160)
        assert page.locator('html').get_attribute('lang')=='de'
        assert page.locator('[data-language=de]').get_attribute('aria-pressed')=='true'
        go('/lien-he')
        assert 'Wobei können wir' in page.locator('h1').inner_text()
        go('/chinh-sach-thong-tin')
        assert 'Datenschutzerklärung' in page.locator('h1').inner_text()
        go('/dieu-khoan')
        assert 'Nutzungsbedingungen' in page.locator('h1').inner_text()
        go('/phap-luat/duc')
        assert 'Deutsches Recht' in page.locator('h1').inner_text()
        page.locator('[data-language=vi]').click()
        page.wait_for_timeout(100)
        assert page.locator('html').get_attribute('lang')=='vi'
        assert not errors,errors
        context.close()
    browser.close()
server.shutdown()
print('PASS multilingual and dynamic jurisdiction routes:',count)

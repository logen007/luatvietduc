"""Luật Việt Đức — multilingual library, jurisdictions, team and source logos."""
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
        for path in ['/','/tra-cuu','/phap-luat/viet-nam','/phap-luat/duc','/phap-luat/duc/thue','/ve-chuyen-trang','/doi-ngu-chuyen-gia','/doi-ngu-chuyen-gia/','/lien-he','/chinh-sach-thong-tin','/dieu-khoan','/hoi-dap-ai','/tin-tuc']:
            go(path)
            assert page.locator('.lvd-footer-language button[data-language]').count()==2
            assert page.locator('.site-header button[data-language]').count()==2
            assert page.locator('.lvd-footer-connection').count()==0
            assert 'Bạn cần hỏi thêm?' not in page.locator('body').inner_text()
            if path=='/':
                assert page.locator('.s-ask-panel #home-ask').count()==1
                assert page.locator('#home-question').is_visible()
                assert page.locator('#home-search,#home-search-query').count()==0
                assert page.locator('.s-hero-grid').count()==1
                assert page.locator('.lvd-hero-art,.lvd-hero-badge,.lvd-home-cta,.lvd-country-glyph,.lvd-team-preview').count()==0
                assert page.locator('.lvd-home-countries img:not(.lvd-country-flag)').count()==0
                flags=page.locator('.lvd-home-countries img.lvd-country-flag')
                assert flags.count()==2
                for flag in flags.all():
                    flag.scroll_into_view_if_needed();flag.evaluate('(el)=>el.decode()')
                    assert flag.evaluate('(el)=>el.naturalWidth>0 && el.src.startsWith(location.origin+"/")')
                hero_text=page.locator('.s-hero').inner_text()
                assert 'Dành cho cộng đồng người Việt tại Đức.' not in hero_text
                assert 'Für die vietnamesische Community in Deutschland.' not in hero_text
                assert page.locator('.s-news-section').evaluate('(news)=>Boolean(news.compareDocumentPosition(document.querySelector(".s-library")) & Node.DOCUMENT_POSITION_FOLLOWING)')
                assert page.locator('.lvd-partner-tile').count()==13
                assert page.locator('.lvd-partner-tile img').count()==13
                assert page.locator('.lvd-partner-tile figcaption').count()==0
                logos=page.locator('.lvd-partner-tile img').evaluate_all('(images)=>images.map(image=>image.src)')
                assert len(set(logos))==13
                assert all(url.startswith(('https://g2gcareer.com/','https://bizlawyer.vn/')) for url in logos)
                assert page.locator('.lvd-partner-attribution,.lvd-partner-section .lvd-feature-heading').count()==0
                assert 'không xác nhận quan hệ đối tác' not in page.locator('#main').inner_text()
                assert page.locator('.lvd-team-teaser,.lvd-team-section').count()==0
                assert page.locator('.lvd-home-countries a').count()==2
                expect(page.locator('.lvd-home-countries a[href="#/phap-luat/viet-nam"]')).to_contain_text('303')
                expect(page.locator('.lvd-home-countries a[href="#/phap-luat/duc"]')).to_contain_text('16')
            if path=='/tra-cuu':
                assert page.locator('.catalog-group').count()==16
                assert page.locator('.lvd-country-tabs a').count()==2
                assert page.evaluate('window.LVD_CATALOG.topics.length')==303
            if path=='/phap-luat/viet-nam':
                assert page.locator('.lvd-country-tabs a').count()==2
                assert page.locator('.catalog-group').count()==16
                assert page.locator('.catalog-page > .page-heading').count()==1
                assert page.locator('form[data-catalog-search],.catalog-help').count()==2
                assert page.locator('.catalog-tabs').count()==0
                expect(page.locator('.lvd-country-tabs a[aria-current="page"]')).to_have_attribute('href','#/phap-luat/viet-nam')
            if path=='/phap-luat/duc':
                assert page.locator('.catalog-group').count()==16
                assert page.locator('.catalog-page > .page-heading').count()==1
                assert page.locator('form[data-catalog-search],.catalog-help').count()==2
                expect(page.locator('.lvd-country-tabs a[aria-current="page"]')).to_have_attribute('href','#/phap-luat/duc')
                assert '303' not in page.locator('.catalog-page').inner_text()
                assert page.locator('[data-catalog-topic]').count()==0
            if path=='/phap-luat/duc/thue':
                assert page.locator('.catalog-group,[data-catalog-topic]').count()==0
                assert page.locator('.empty-state').count()==1
                expect(page.locator('#catalog-group-filter')).to_have_value('thue')
                assert page.locator('form[data-catalog-search],.catalog-help').count()==2
            if path in ['/ve-chuyen-trang','/doi-ngu-chuyen-gia','/doi-ngu-chuyen-gia/']:
                assert page.locator('.lvd-team-section .lvd-expert-card').count()==9
                assert page.locator('.lvd-team-section .lvd-expert-portrait').count()==3
                assert page.locator('.lvd-team-context').count()==0
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
        assert page.locator('a[href="#/song-o-duc"]').count()==0
        page.locator('.site-header [data-language=de]').click()
        page.wait_for_timeout(160)
        assert page.locator('html').get_attribute('lang')=='de'
        for control in page.locator('[data-language=de]').all():
            assert control.get_attribute('aria-pressed')=='true'
        expect(page.locator('#home-ask [type=submit]')).to_contain_text('Frage')
        assert page.locator('#home-question').is_visible()
        assert page.locator('.lvd-hero-badge,.lvd-home-cta,.lvd-footer-connection').count()==0
        assert 'Für die vietnamesische Community in Deutschland.' not in page.locator('.s-hero').inner_text()
        go('/ve-chuyen-trang')
        assert page.locator('.lvd-team-section .lvd-expert-card').count()==9
        go('/lien-he')
        assert 'Wobei können wir' in page.locator('h1').inner_text()
        go('/chinh-sach-thong-tin')
        assert 'Datenschutzerklärung' in page.locator('h1').inner_text()
        go('/dieu-khoan')
        assert 'Nutzungsbedingungen' in page.locator('h1').inner_text()
        go('/phap-luat/duc')
        expect(page.locator('.lvd-country-tabs a[aria-current="page"]')).to_have_attribute('href','#/phap-luat/duc')
        assert page.locator('form[data-catalog-search],.catalog-help').count()==2
        assert '303' not in page.locator('.catalog-page').inner_text()
        page.locator('.lvd-footer-language [data-language=vi]').click()
        page.wait_for_timeout(100)
        assert page.locator('html').get_attribute('lang')=='vi'
        assert not errors,errors
        context.close()
    browser.close()
server.shutdown()
print('PASS multilingual and dynamic jurisdiction routes:',count)

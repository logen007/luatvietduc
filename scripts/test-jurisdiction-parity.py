"""Verify shared VN/DE catalogue structure while preserving jurisdiction boundaries."""
from pathlib import Path
from urllib.parse import parse_qs
import functools, http.server, json, os, threading
from playwright.sync_api import sync_playwright, expect


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(Path.cwd())))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/'
out = Path(os.environ.get('JURISDICTION_QA', 'qa-jurisdiction-parity'))
out.mkdir(parents=True, exist_ok=True)
prefixes = {'vn': '/phap-luat/viet-nam', 'de': '/phap-luat/duc'}
report = {'views': [], 'searches': [], 'group_details': [], 'scaled_views': []}
errors = []

signature_js = '''element => {
  const visit = node => ({
    tag: node.tagName.toLowerCase(), role: node.getAttribute('role') || '',
    classes: Array.from(node.classList).filter(name => name !== 'active').sort(),
    type: node.getAttribute('type') || '',
    children: node.tagName.toLowerCase() === 'svg' ? [] : Array.from(node.children).map(visit)
  });
  return visit(element);
}'''

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    for language in ['vi', 'de']:
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, locale='vi-VN', reduced_motion='reduce')
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))

        def settle():
            page.evaluate('document.fonts.ready')
            page.evaluate('async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);}')

        def viewport_fits():
            width = page.viewport_size['width']
            actual = page.evaluate('document.documentElement.scrollWidth')
            assert actual <= width + 1, (language, width, page.url, 'overflow', actual)

        def go(path):
            page.goto(base + '#' + path, wait_until='load')
            settle()
            expect(page.locator('#main h1')).to_have_count(1)
            assert '\ufffd' not in page.locator('#main').inner_text()
            viewport_fits()

        def current_path():
            return page.url.split('#', 1)[1].split('?', 1)[0].rstrip('/')

        def assert_de_links():
            links = page.locator('.catalog-page a[href^="#/"]').evaluate_all('(links)=>links.map(link=>link.getAttribute("href"))')
            assert not [href for href in links if href.startswith(('#/tra-cuu', '#/chu-de', '#/tim-kiem'))], links
            assert page.locator('[data-catalog-topic],.catalog-topic-intro').count() == 0
            assert '303' not in page.locator('.catalog-page').inner_text()

        def shared_controls(country):
            expect(page.locator('.catalog-page')).to_have_count(1)
            expect(page.locator('.catalog-page > .page-heading')).to_have_count(1)
            expect(page.locator('.catalog-page form[data-catalog-search]')).to_have_count(1)
            expect(page.locator('.catalog-page').get_by_role('search')).to_have_count(1)
            expect(page.locator('form[data-catalog-search] input[name=q]')).to_be_enabled()
            expect(page.locator('form[data-catalog-search] [type=submit]')).to_be_enabled()
            expect(page.locator('.tabs.catalog-tabs')).to_have_count(1)
            expect(page.locator('.catalog-help')).to_have_count(1)
            expect(page.locator('.lvd-country-tabs a')).to_have_count(2)
            expect(page.locator('.lvd-country-tabs a[aria-current="page"]')).to_have_attribute('href', '#' + prefixes[country])
            if country == 'de':
                assert_de_links()

        def field_cards_fit():
            for card in page.locator('.catalog-group').all():
                text = card.locator('.catalog-group-body').bounding_box()
                icon = card.locator('.catalog-group-icon').bounding_box()
                assert text['x'] + text['width'] <= icon['x'] - 4, (language, page.viewport_size, text, icon)

        go(prefixes['vn'])
        page.evaluate('(language)=>window.LVD_I18N.set(language)', language)
        settle()
        assert page.locator('html').get_attribute('lang') == language
        groups = page.evaluate('window.LVD_CATALOG.groups.map(group=>({id:group.id,count:group.count}))')
        source_topics = page.evaluate('JSON.stringify(window.LVD_CATALOG.topics)')
        assert len(groups) == 16
        assert page.evaluate('window.LVD_CATALOG.topics.length') == 303
        assert page.evaluate('window.LVD_CATALOG.topics.every(topic=>topic.country==="Việt Nam"&&topic.answer===null&&topic.status==="topic_only")')

        for width in [320, 390, 768, 1024, 1440]:
            page.set_viewport_size({'width': width, 'height': 1000})
            signatures = {}
            for country, prefix in prefixes.items():
                go(prefix)
                shared_controls(country)
                expect(page.locator('.catalog-group')).to_have_count(16)
                observed = page.locator('.catalog-group').evaluate_all('(cards)=>cards.map(card=>({id:card.dataset.group,href:card.getAttribute("href")}))')
                assert observed == [{'id': group['id'], 'href': '#' + prefix + '/' + group['id']} for group in groups], (country, observed)
                field_cards_fit()
                signatures[country] = page.locator('.catalog-page').evaluate(signature_js)
                report['views'].append({'language': language, 'width': width, 'country': country, 'mode': 'overview'})
                if width in [390, 1440]:
                    page.screenshot(path=str(out / f'{country}-{language}-{width}.png'), full_page=True)
            assert signatures['vn'] == signatures['de'], (language, width, 'overview DOM/roles differ')

            for country, prefix in prefixes.items():
                go(prefix + '/thue')
                shared_controls(country)
                expect(page.locator('#catalog-group-filter')).to_have_value('thue')
                expect(page.locator('[data-catalog-topic]')).to_have_count(0 if country == 'de' else 10)
                expect(page.locator('.empty-state')).to_have_count(1 if country == 'de' else 0)
                report['views'].append({'language': language, 'width': width, 'country': country, 'mode': 'group'})

            filter_signatures = {}
            for country, prefix in prefixes.items():
                go(prefix + '?xem=tat-ca')
                shared_controls(country)
                expect(page.locator('#catalog-group-filter option')).to_have_count(17)
                expect(page.locator('#sort-results')).to_be_enabled()
                filter_signatures[country] = page.locator('#catalog-filter-form').evaluate(signature_js)
                if country == 'de':
                    expect(page.locator('.empty-state')).to_have_count(1)
                    expect(page.locator('.catalog-results-caption strong')).to_have_text('0')
                else:
                    expect(page.locator('[data-catalog-topic]')).to_have_count(10)
                report['views'].append({'language': language, 'width': width, 'country': country, 'mode': 'topics'})
            assert filter_signatures['vn'] == filter_signatures['de'], (language, width, 'topic filters differ')

            for query, expected in [('thuế', 1), ('Steuer', 1), ('zzzzkhongcoketqua', 0)]:
                go(prefixes['de'])
                page.locator('form[data-catalog-search] input[name=q]').fill(query)
                page.locator('form[data-catalog-search] [type=submit]').click()
                settle()
                assert current_path() == prefixes['de'], (query, page.url)
                assert parse_qs(page.url.split('?', 1)[1]).get('q') == [query]
                shared_controls('de')
                expect(page.locator('.catalog-group')).to_have_count(expected)
                if expected:
                    expect(page.locator('.catalog-group')).to_have_attribute('href', '#' + prefixes['de'] + '/thue')
                else:
                    expect(page.locator('.empty-state')).to_have_count(1)
                viewport_fits()
                report['searches'].append({'language': language, 'width': width, 'query': query, 'fields': expected})

            for country, prefix in prefixes.items():
                go(prefix)
                page.locator('.catalog-page h1,.catalog-group-body strong,.catalog-group-body small,.catalog-search input,.catalog-search .search-label,.catalog-tabs a').evaluate_all('''elements=>{
                  const sizes=elements.map(el=>parseFloat(getComputedStyle(el).fontSize));
                  elements.forEach((el,index)=>el.style.fontSize=(sizes[index]*2)+'px');
                }''')
                settle()
                viewport_fits()
                field_cards_fit()
                report['scaled_views'].append({'language': language, 'width': width, 'country': country, 'text_scale': 2})
            print('PASS shared catalogue', language, width, flush=True)

        page.set_viewport_size({'width': 1440, 'height': 1000})
        for country, prefix in prefixes.items():
            for group in groups:
                go(prefix + '/' + group['id'])
                shared_controls(country)
                expect(page.locator('#catalog-group-filter')).to_have_value(group['id'])
                expect(page.locator('[data-catalog-topic]')).to_have_count(0 if country == 'de' else min(10, group['count']))
                expect(page.locator('.empty-state')).to_have_count(1 if country == 'de' else 0)
                report['group_details'].append({'language': language, 'country': country, 'group': group['id']})

        # Submitting and changing filters in the empty DE topics mode never switches jurisdiction.
        go(prefixes['de'] + '?xem=tat-ca')
        page.locator('form[data-catalog-search] input[name=q]').fill('Steuer')
        page.locator('form[data-catalog-search] [type=submit]').click()
        settle()
        assert current_path().startswith(prefixes['de'])
        assert parse_qs(page.url.split('?', 1)[1]).get('xem') == ['tat-ca']
        expect(page.locator('.empty-state')).to_have_count(1)
        page.locator('#catalog-group-filter').select_option('thue')
        settle()
        page.locator('#sort-results').select_option('a-z')
        settle()
        assert current_path().startswith(prefixes['de'])
        expect(page.locator('#catalog-group-filter')).to_have_value('thue')
        expect(page.locator('#sort-results')).to_have_value('a-z')
        expect(page.locator('.catalog-results-caption strong')).to_have_text('0')
        shared_controls('de')

        # Original VN entry points still expose the original, unmodified catalogue.
        go('/tra-cuu?xem=tat-ca')
        expect(page.locator('[data-catalog-topic]')).to_have_count(10)
        go('/chu-de/thue')
        expect(page.locator('#catalog-group-filter')).to_have_value('thue')
        expect(page.locator('[data-catalog-topic]')).to_have_count(10)
        assert page.evaluate('JSON.stringify(window.LVD_CATALOG.topics)') == source_topics
        context.close()
    assert not errors, errors
    browser.close()
server.shutdown()
report['runtime_errors'] = errors
report['status'] = 'passed'
(out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps({'status': 'passed', 'views': len(report['views']), 'searches': len(report['searches']), 'group_details': len(report['group_details']), 'scaled_views': len(report['scaled_views']), 'source_topics': 303}, ensure_ascii=False))

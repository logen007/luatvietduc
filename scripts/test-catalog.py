"""Verify the imported catalogue against independently extracted client file hashes.
The original DOCX/XLSX are not published. No legal answer is inferred from a title.
"""
from pathlib import Path
import functools, hashlib, http.server, json, subprocess, threading
from playwright.sync_api import sync_playwright, expect

expected_hashes=[
'e3a3b344b18fdbb9013d754fb637f9592cd38a089d975e48e00a79f3de7ebe43',
'ad2e33e075626d39d232defcaf1259bbc270ce40cf863917864b4cbaf9853035',
'2b8f29698d0eb3b289b1a38bc6a7577a0d50d945d0c842adfe028a912c9670dc',
'89214623f8816dd0da03508c908824669c35890afc6e4095d5fc447f34414b58',
'98d4b0bc2b2a6182f2a2a9419f26f4bd40de7eba76b2394566d7a9a53b8fb471',
'5d627ef867e1177a8a9a4dd568b9ad95787432542a9834f7a0daae2ade5336b2',
'c58fc1cf0b6bc3cb2fecbae1239eb65be840a2e67753a742da0fe9bec21c5c69',
'41dcd7a4f0531cdd794fb98b9d9a4e86e5d510035d77d804ca122b701c8e0919',
'a5850e59c6583e839bdd6f4b4877787bf83aa5466a96eea6f2891f94bc0353b0',
'1c7e838896269418ad88ae1f3f7a0af432bcd9e720da2fbad46bb3a9b79f2df4',
'4dcf9368b88e7f27f7798fac42f43824f6740d3dc478d53d9975e8a83d45e769',
'25b34d3a2c035f91610897ef572f18b7a559c5d49fdc5268d1e6ad997839643c',
'6339ef98540a4e1e2d05812fb26ee05dbc4fd24400981c1ed8a3f211200a9a92',
'd9cf10bba3a164f315cf782c2809c4d0584807a56d6bdc80f82821fd71332374',
'f091a6738173736ab73c5c6bd6583f44abd91e8367334453ad033df5e9b8a1c6',
'57332876fbc2a60feeb31197739ed1b5be54b854fff5121dabb13fa678a5c353']
expected_counts=[20,15,20,16,16,16,16,20,19,22,23,22,20,18,20,20]
js="global.window={}; require('./assets/catalog-source.js'); console.log(JSON.stringify(window.LVD_CATALOG_SOURCE));"
source=json.loads(subprocess.run(['node','-e',js],check=True,capture_output=True,text=True).stdout)
assert len(source['groups'])==16
reconciliation=[]
for i,g in enumerate(source['groups']):
 actual=hashlib.sha256('\n'.join(g['titles']).encode('utf-8')).hexdigest()
 assert len(g['titles'])==expected_counts[i],(g['sheet'],'count')
 assert actual==expected_hashes[i],(g['sheet'],'title text or order differs from XLSX',actual)
 reconciliation.append({'sheet':g['sheet'],'count':len(g['titles']),'expected':expected_counts[i],'difference':0,'titles_sha256':actual})
assert sum(x['count'] for x in reconciliation)==303
assert source['groups'][10]['sheet'].startswith('11.') and source['groups'][11]['sheet'].startswith('11.')
assert source['groups'][10]['id']!=source['groups'][11]['id']
print('PASS: 303 source titles match character-for-character, in source order; all 16 counts match DOCX.')

class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(Path.cwd())))
threading.Thread(target=srv.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{srv.server_port}/'
out=Path('qa-catalog');out.mkdir(exist_ok=True)
report={'groups':16,'topics':303,'reconciliation':reconciliation,'layouts':[],'checked_topic_ids':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1440,'height':1000},locale='vi-VN',reduced_motion='reduce')
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 def go(r):
  page.goto(base+'#'+r,wait_until='load');page.evaluate('document.fonts.ready')
 go('/tra-cuu')
 expect(page.locator('.catalog-group')).to_have_count(16)
 data=page.evaluate('({groups:window.LVD_CATALOG.groups.map(g=>({id:g.id,title:g.title,count:g.count})),topics:window.LVD_CATALOG.topics})')
 assert len(data['topics'])==303 and len(set(t['id'] for t in data['topics']))==303
 assert all(t['answer'] is None and t['status']=='topic_only' and t['country']=='Việt Nam' for t in data['topics'])
 assert page.evaluate('window.LVD_CONTENT.topics.length')==16
 for g in data['groups']:
  observed=[]
  for pg in range(1,(g['count']+9)//10+1):
   go('/chu-de/'+g['id']+'?trang='+str(pg))
   expect(page.locator('#main h1')).to_have_text(g['title'])
   observed+=page.locator('[data-catalog-topic]').evaluate_all('(els)=>els.map(e=>({id:e.dataset.catalogTopic,title:e.querySelector("h2").textContent,href:e.querySelector(".catalog-ask").getAttribute("href")}))')
  expected=[t for t in data['topics'] if t['groupId']==g['id']]
  assert [x['id'] for x in observed]==[x['id'] for x in expected],g['id']
  assert [x['title'] for x in observed]==[x['title'] for x in expected],g['id']
  assert all('chu-de='+x['id'] in x['href'] for x in observed)
  report['checked_topic_ids']+=[x['id'] for x in observed]
 assert len(report['checked_topic_ids'])==303
 # Search accents, exact source terms, acronym expansion and result ordering.
 for query in ['ủy quyền','uy quyen','ĐỊNH DANH ĐIỆN TỬ','BHXH','giam ho','thuong mai']:
  result=page.evaluate('(q)=>window.LVD_CATALOG.search(q).map(t=>t.id)',query)
  assert result,(query,'no results')
 assert page.evaluate("JSON.stringify(window.LVD_CATALOG.search('ủy quyền'))===JSON.stringify(window.LVD_CATALOG.search('uy quyen'))")
 assert not page.evaluate("window.LVD_CATALOG.search('zzzzkhongcoketqua')")
 go('/tra-cuu?xem=tat-ca');expect(page.locator('.result-item')).to_have_count(10)
 page.locator('.catalog-pagination a[rel=next]').click();expect(page.locator('.catalog-results-caption')).to_contain_text('11–20')
 page.go_back();expect(page.locator('.catalog-results-caption')).to_contain_text('1–10')
 page.locator('#catalog-group-filter').select_option('thue');expect(page.locator('#main h1')).to_have_text('Thuế')
 page.locator('#sort-results').select_option('a-z');expect(page.locator('#sort-results')).to_have_value('a-z')
 expect(page.locator('#catalog-group-filter')).to_have_value('thue')
 assert 'trang=2' not in page.url
 # Catalogue title is conversation context, not an automatically fabricated answer.
 go('/chu-de/giay-to-tuy-than')
 target=data['topics'][next(i for i,t in enumerate(data['topics']) if t['id']=='giay-to-tuy-than-05')]
 page.locator('[data-catalog-topic="giay-to-tuy-than-05"] h2 a').click()
 expect(page.locator('.catalog-context strong')).to_have_text(target['title'])
 expect(page.locator('.chat-message.user')).to_have_count(0)
 page.locator('#chat-question').fill('Tôi cần hỏi thêm về hộ chiếu khi đang ở Đức.')
 page.locator('#chat-compose button').click()
 expect(page.locator('.catalog-context strong')).to_have_text(target['title'])
 expect(page.locator('.chat-message.user')).to_have_count(1)
 page.locator('.chat-top [data-handoff]').click();expect(page.locator('#handoff-form')).to_be_visible()
 expect(page.locator('.catalog-context strong')).to_have_text(target['title'])
 assert 'Đã chuyển' not in page.locator('#chat-log').inner_text()
 # All legacy 10-domain links remain usable, and published news remains separate.
 aliases=page.evaluate('window.LVD_CATALOG.groupAliases')
 for old,new in aliases.items():
  go('/chu-de/'+old);expect(page.locator('#main h1')).to_have_text(next(g['title'] for g in data['groups'] if g['id']==new))
 go('/gui-cau-hoi');expect(page.locator('#topic option')).to_have_count(17)
 go('/tin/mindestlohn-2026');expect(page.locator('.news-sources')).to_be_visible()
 page.locator('.news-to-chat a').click();expect(page.locator('.chat-context')).to_contain_text('Về bài viết')
 assert page.locator('.catalog-context').count()==0
 routes=['/','/tra-cuu','/tra-cuu?xem=tat-ca','/chu-de/khai-sinh-ho-tich-giam-ho','/chu-de/tai-chinh-ngan-hang-bao-hiem','/tim-kiem?q=uy+quyen','/tim-kiem?q=zzzzkhongcoketqua','/hoi-dap/uy-quyen-quan-ly-nha','/hoi-dap-ai?chu-de=thua-ke-12','/gui-cau-hoi','/tin-tuc']
 for width in [320,390,768,1024,1440]:
  page.set_viewport_size({'width':width,'height':1000})
  for route in routes:
   go(route)
   assert page.locator('#main h1').count()==1,(width,route,'heading')
   assert page.evaluate('document.documentElement.scrollWidth')<=width+1,(width,route,'overflow')
   assert '\ufffd' not in page.locator('body').inner_text()
   report['layouts'].append({'width':width,'route':route})
   names={'/':'home','/tra-cuu':'library','/chu-de/tai-chinh-ngan-hang-bao-hiem':'group','/hoi-dap-ai?chu-de=thua-ke-12':'context-chat'}
   if width in [390,1440] and route in names:
    for image in page.locator('.press-photo img').all():image.scroll_into_view_if_needed();image.evaluate('(e)=>e.decode()')
    page.evaluate('scrollTo(0,0)');page.screenshot(path=str(out/f'{names[route]}-{width}.png'),full_page=True)
 go('/tim-kiem?q=%3Cimg+src%3Dx+onerror%3Dalert(1)%3E');assert page.locator('#main img').count()==0
 assert not errors,errors
 report['runtime_errors']=errors;report['status']='passed';browser.close()
srv.shutdown()
(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'status':report['status'],'groups':16,'exact_source_titles':303,'layouts':len(report['layouts']),'source_count_difference':0},ensure_ascii=False))

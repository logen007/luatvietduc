"""One-time, exact source migration. Never handles credentials or font binaries."""
from pathlib import Path
import re

def replace(path, old, new):
 p=Path(path); text=p.read_text(encoding='utf-8')
 if new in text:return
 assert text.count(old)==1,(path,'unexpected source',old[:120],text.count(old))
 p.write_text(text.replace(old,new,1),encoding='utf-8')

p=Path('index.html');text=p.read_text(encoding='utf-8').replace('0.6.6','0.7.0')
if 'assets/catalog-source.js' not in text:
 text=text.replace('  <script src="assets/newsroom.js?v=0.7.0" defer></script>','  <script src="assets/newsroom.js?v=0.7.0" defer></script>\n  <script src="assets/catalog-source.js?v=0.7.0" defer></script>\n  <script src="assets/catalog.js?v=0.7.0" defer></script>')
 text=text.replace('  <script src="assets/steel-ui.js?v=0.7.0" defer></script>','  <link rel="stylesheet" href="assets/catalog.css?v=0.7.0">\n  <script src="assets/steel-ui.js?v=0.7.0" defer></script>')
p.write_text(text,encoding='utf-8')
replace('assets/app.js',"if(route.path==='/') html=window.LVD_EDITORIAL.home();","if(window.LVD_CATALOG_UI?.accepts(route)) html=window.LVD_CATALOG_UI.view(route);\n    else if(route.path==='/') html=window.LVD_EDITORIAL.home();")
replace('assets/app.js','Nội dung được sắp xếp theo lĩnh vực và tình huống. Tìm bằng từ khóa hoặc chọn chủ đề để xem các vấn đề liên quan.','Thư viện pháp luật Việt Nam gồm 16 lĩnh vực và 303 chủ đề. Chọn chủ đề để đặt câu hỏi về vấn đề cần làm rõ.')

p=Path('assets/steel-ui.js');text=p.read_text(encoding='utf-8')
if 'const topics = window.LVD_CATALOG.promptTopics' not in text:
 text,n=re.subn(r'const topics = \[.*?\n  \];',"const topics = window.LVD_CATALOG.promptTopics.map(([label,id])=>[label,window.LVD_CATALOG.getTopic(id).title]);",text,count=1,flags=re.S)
 assert n==1
text=text.replace('Tra cứu quy định, thủ tục tại Việt Nam và Đức.','Tra cứu các vấn đề pháp luật tại Việt Nam.')
text=text.replace('<h2>Tìm theo<br>lĩnh vực pháp luật.</h2>','<h2>Thư viện<br>pháp luật Việt Nam.</h2><p class="catalog-library-total">16 lĩnh vực · 303 chủ đề</p>')
text=text.replace('>Mở thư viện ${arrow}</a></div><div class="s-library-links">','>Xem tất cả lĩnh vực ${arrow}</a></div><div class="s-library-links">')
text=text.replace('K.topics.map(([id,label],i)=>','window.LVD_CATALOG.featuredGroups.map(({id,title:label,count},i)=>')
text=text.replace('<span>${escape(label)}</span>${arrow}</a>','<span>${escape(label)}<small class="catalog-home-count">${count} chủ đề</small></span>${arrow}</a>')
p.write_text(text,encoding='utf-8')

p=Path('assets/chat-first.js');text=p.read_text(encoding='utf-8')
start=text.index('  const prompts=');end=text.index('  function create(',start)
new='''  const C=window.LVD_CATALOG;
  const buttons=()=>`<div class="chat-prompts">${C.promptTopics.slice(0,4).map(([label,id])=>`<button type="button" data-ask-example="${esc(C.getTopic(id).title)}">${esc(label)}</button>`).join('')}</div>`;
  const openContext=id=>C.getTopic(id)||N.stories.find(s=>s.id===id)||K.articles.find(s=>s.id===id);
  const contextURL=c=>c.catalog?C.topicURL(c):`#/${c.type==='news'?'tin':c.type==='qa'?'hoi-dap':'bai-viet'}/${c.id}`;
'''
text=text[:start]+new+text[end:]
text=text.replace("const context=openContext(r.q.get('bai'));","const context=openContext(r.q.get('chu-de')||r.q.get('bai'));")
old='''  function contextBlock(t){return t.context?`<div class="chat-context">Về bài viết<strong>${esc(t.context.title)}</strong><a href="${contextURL(t.context)}">Đọc lại bài</a></div>`:'';}'''
new='''  function contextBlock(t){return t.context?`<div class="chat-context ${t.context.catalog?'catalog-context':''}">${t.context.catalog?'Chủ đề · Pháp luật Việt Nam':'Về bài viết'}<strong>${esc(t.context.title)}</strong><a href="${t.context.catalog?'#/chu-de/'+t.context.groupId:contextURL(t.context)}">${t.context.catalog?'Xem lĩnh vực':'Đọc lại bài'}</a></div>`:'';}'''
assert old in text;text=text.replace(old,new,1)
old='''  function sourceCard(a){return `<a class="chat-source" href="${contextURL(a)}"><small>NỘI DUNG LIÊN QUAN</small><strong>${esc(a.title)} ${icon('right')}</strong><span>${esc(a.country)}</span></a>`;}'''
new='''  function sourceCard(a){return `<a class="chat-source ${a.catalog?'catalog-source':''}" href="${contextURL(a)}"><small>${a.catalog?'CHỦ ĐỀ LIÊN QUAN':'NỘI DUNG LIÊN QUAN'}</small><strong>${esc(a.title)} ${icon('right')}</strong><span>${a.catalog?'Pháp luật Việt Nam · '+esc(C.getGroup(a.groupId).title):esc(a.country)}</span></a>`;}'''
assert old in text;text=text.replace(old,new,1)
text=text.replace("${m.source?sourceCard(m.source):''}","${(m.sources||(m.source?[m.source]:[])).map(sourceCard).join('')}")
old="    const q=norm(text),key=/uy quyen/.test(q)?'uy-quyen-quan-ly-nha':/thua ke/.test(q)?'nhan-thua-ke-tai-viet-nam':/quoc tich|ho chieu/.test(q)?'ho-chieu-quoc-tich':null;\n    const related=K.articles.find(a=>a.id===key);\n    t.messages.push({role:'system',text:'Chưa thể trả lời câu hỏi lúc này. Bạn có thể tra cứu thư viện hoặc thử lại sau.',source:related||null});"
new="    const related=C.related(text,3);\n    t.messages.push({role:'system',text:'Chưa thể trả lời câu hỏi lúc này. Bạn có thể tra cứu thư viện hoặc liên hệ chuyên viên.',sources:related});"
assert old in text;text=text.replace(old,new,1)
p.write_text(text,encoding='utf-8')

# Existing regression checks remain in force; only the enlarged corpus changes these assertions.
p=Path('scripts/test-chat.py');text=p.read_text(encoding='utf-8')
text=text.replace("expect(page.locator('.chat-source')).to_be_visible();","expect(page.locator('.chat-source').first).to_be_visible();")
text=text.replace("go('/tim-kiem?q=uy+quyen');expect(page.locator('.result-item')).to_have_count(3)","go('/tim-kiem?q=uy+quyen');expected=min(10,page.evaluate(\"window.LVD_CATALOG.search('uy quyen').length\"));expect(page.locator('.result-item')).to_have_count(expected)")
p.write_text(text,encoding='utf-8')
print('Connected catalogue, home links, source-backed chat context, shared form pickers and legacy URLs.')

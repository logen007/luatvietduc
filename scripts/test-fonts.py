"""Verify actual font rendering, not just the computed font-family declaration.
Font binaries are neither stored nor included in review artifacts.
"""
from pathlib import Path
import functools, hashlib, http.server, json, os, threading, urllib.request
from playwright.sync_api import sync_playwright

FONT_FILES={
 'ABCSchengenA_Variable-s.p.3nb4eiitxra8w.woff2':'6af07154ec78570d71ca72969bde3a8c5f59b91818558035a154f6bab7f9aa1e',
 'ABCSchengenAMono_Variable.p.1vh0uvnfona6i.woff2':'86b6d7f8008d198b5a4e14b4a76b57085b997bae536e4af8c520fce61fdf0253'
}
for name,expected in FONT_FILES.items():
 request=urllib.request.Request('https://steel.dev/_next/static/immutable/media/'+name,headers={'Origin':'https://logen007.github.io','User-Agent':'Mozilla/5.0'})
 with urllib.request.urlopen(request,timeout=30) as response:
  assert response.status==200
  assert response.headers.get('Access-Control-Allow-Origin') in ['*','https://logen007.github.io']
  assert hashlib.sha256(response.read()).hexdigest()==expected,name

class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(Path.cwd())))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=os.environ.get('LIVE_URL') or f'http://127.0.0.1:{server.server_port}/'
out=Path(os.environ.get('FONT_QA','qa-fonts'))
out.mkdir(exist_ok=True,parents=True)
report={'fingerprints':'match supplied uploads','layouts':[],'rendered_fonts':{}}

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 context=browser.new_context(locale='vi-VN',reduced_motion='reduce')
 page=context.new_page()
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(base+'#/',wait_until='networkidle')
 page.evaluate('document.fonts.ready')
 fonts=page.evaluate("""async()=>{
   await document.fonts.load('400 24px "ABC Schengen A"','ABC Schengen');
   await document.fonts.load('400 14px "ABC Schengen A Mono"','ABCDEFGHIJKLMNOPQRSTUVWXYZ');
   return Array.from(document.fonts).filter(f=>f.family.includes('ABC')).map(f=>({family:f.family,status:f.status,weight:f.weight,style:f.style}));
 }""")
 assert len(fonts)==2 and all(f['status']=='loaded' for f in fonts),fonts
 report['font_faces']=fonts
 cdp=context.new_cdp_session(page)
 cdp.send('DOM.enable');cdp.send('CSS.enable')
 page.evaluate("""()=>{
   [['probe-sans','ABC Schengen A'],['probe-mono','ABC Schengen A Mono']].forEach(([id,f])=>{
     const el=document.createElement('span');el.id=id;el.textContent='ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789';
     el.style.cssText='position:fixed;left:0;top:0;opacity:0;pointer-events:none;font-size:22px;font-family:"'+f+'"';
     el.setAttribute('aria-hidden','true');document.body.append(el);
   });
 }""")
 doc=cdp.send('DOM.getDocument')['root']['nodeId']
 for selector in ['#probe-sans','#probe-mono','.s-hero h1','.desktop-nav a']:
  node=cdp.send('DOM.querySelector',{'nodeId':doc,'selector':selector})['nodeId']
  rendered=cdp.send('CSS.getPlatformFontsForNode',{'nodeId':node})['fonts']
  report['rendered_fonts'][selector]=rendered
  assert any(f['isCustomFont'] and 'Schengen' in f['familyName'] and f['glyphCount']>0 for f in rendered),(selector,rendered)
 page.evaluate("document.querySelectorAll('[id^=probe-]').forEach(e=>e.remove())")
 routes=[('/', 'home'),('/hoi-dap-ai','chat'),('/tra-cuu','library'),('/tin/mindestlohn-2026','article'),('/gui-cau-hoi','contact')]
 for width in [320,360,390,768,1024,1440]:
  page.set_viewport_size({'width':width,'height':1000})
  for route,label in routes:
   page.goto(base+'#'+route,wait_until='load');page.evaluate('document.fonts.ready')
   page.wait_for_timeout(80)
   assert page.locator('#main h1').count()==1,(width,route)
   assert page.evaluate('document.documentElement.scrollWidth')<=width+1,(width,route,'horizontal overflow')
   actual=page.locator('#main h1').evaluate('(e)=>getComputedStyle(e).fontFamily')
   assert 'ABC Schengen A' in actual,(route,actual)
   assert page.locator('body').inner_text().find('\ufffd')==-1,(width,route,'replacement character')
   report['layouts'].append({'width':width,'route':route})
   if width in [390,1440]:
    for image in page.locator('img').all():
     image.scroll_into_view_if_needed();image.evaluate('(el)=>el.decode()')
    page.evaluate('scrollTo(0,0)')
    page.screenshot(path=str(out/f'{label}-{width}.png'),full_page=True)
    if label=='home' and width==1440:page.screenshot(path=str(out/'home-top.png'))
 assert not errors,errors
 report['runtime_errors']=errors
 browser.close()
server.shutdown()
(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'result':'passed','faces':fonts,'layouts':len(report['layouts']),'rendered_fonts':report['rendered_fonts']},ensure_ascii=False,indent=2))

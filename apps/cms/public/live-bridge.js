'use strict';
(() => {
  const redirect = () => {
    const p = location.hash.slice(1).split('?')[0];
    const target = {'/hoi-dap-ai':'/tro-chuyen','/chuyen-vien':'/chuyen-vien','/thu-vien-quan-tri':'/kien-thuc','/dang-nhap':'/tai-khoan','/tai-khoan':'/tai-khoan','/tai-khoan/dang-nhap':'/tai-khoan','/gui-cau-hoi':'/tro-chuyen','/khong-gian-ca-nhan':'/tai-khoan'}[p];
    if (target) location.replace(target);
  };
  window.addEventListener('hashchange', redirect, true); redirect();
  document.addEventListener('submit', e => {
    if (e.target.id === 'home-ask') {e.preventDefault();e.stopImmediatePropagation();sessionStorage.setItem('lvd-question', e.target.elements.question.value);location.href='/tro-chuyen';}
  }, true);
  document.addEventListener('click',e=>{const prompt=e.target.closest('[data-ask-example]');if(prompt){e.preventDefault();e.stopImmediatePropagation();sessionStorage.setItem('lvd-question',prompt.dataset.askExample);location.href='/tro-chuyen'}},true);
  let settings=null,articles=[];
  const enrich=()=>{
    if(!settings)return;
    document.querySelectorAll('.brand-name,.lvd-footer-wordmark').forEach(el=>el.textContent=settings.siteName);
    const tagline=document.querySelector('.lvd-footer-identity>p');if(tagline)tagline.textContent=settings.tagline||'';
    const footer=document.querySelector('.lvd-footer-bottom>span');const footerText=(settings.footerText||'').replace(/Thông tin tham khảo; không thay thế việc xem xét hồ sơ cụ thể\.?/gi,'').trim();if(footer){const version=footer.dataset.siteVersion;footer.textContent='© '+settings.siteName+'.'+(version?' · v'+version:'')+(footerText?' '+footerText:'');}
    if(/^#[\da-fA-F]{6}$/.test(settings.accentColor||''))document.documentElement.style.setProperty('--accent',settings.accentColor);
    if(settings.logo)document.querySelectorAll('.brand-mark').forEach(el=>{const img=document.createElement('img');img.src=settings.logo;img.alt=settings.siteName;img.style.cssText='width:100%;height:100%;object-fit:contain';el.replaceChildren(img)});
    if(location.hash.startsWith('#/chinh-sach-thong-tin')&&settings.privacyText&&!document.getElementById('live-privacy')){const p=document.createElement('p');p.id='live-privacy';p.style.whiteSpace='pre-wrap';p.textContent=settings.privacyText;(document.querySelector('#main .prose')||document.getElementById('main'))?.append(p)}
    const grid=document.querySelector('.chat-news .press-grid');
    if(grid&&articles.length){grid.replaceChildren();for(const item of articles){const article=document.createElement('article');article.className='press-card pm-story pm-story-cms';const copy=document.createElement('div');copy.className='press-copy';const h=document.createElement('h3');const link=document.createElement('a');link.href='/bai-viet/'+encodeURIComponent(item.slug);link.textContent=item.title;h.append(link);const p=document.createElement('p');p.textContent=item.body.slice(0,140);const more=document.createElement('a');more.className='lvd-link pm-story-read';more.href=link.href;more.textContent=window.LVD_I18N?.get()==='de'?'Beitrag lesen ↗':'Đọc bài viết ↗';copy.append(h,p,more);article.append(copy);grid.append(article)}}
  };
  window.addEventListener('hashchange',()=>queueMicrotask(enrich));
  document.addEventListener('DOMContentLoaded',async()=>{
    try{
      const r=await fetch('/service/settings');if(!r.ok)return;settings=await r.json();
      const social=document.getElementById('live-social');
      if(social){
        const icons=await fetch('/social-icons.json?v=1').then(r=>r.ok?r.json():[]).catch(()=>[]);
        if(icons.length){
          const links=(settings.socialLinks||[]).filter(link=>{try{return new URL(link.url).protocol==='https:'&&!new URL(link.url).username&&!new URL(link.url).password}catch{return false}});
          const used=new Set();social.replaceChildren();
          const match=(icon,link)=>{const host=new URL(link.url).hostname.toLowerCase();return icon.hosts.some(h=>host===h||host.endsWith('.'+h))||String(link.label).toLowerCase()===icon.name.toLowerCase()};
          for(const icon of icons){const link=links.find(l=>match(icon,l));if(!link)continue;used.add(link);const el=document.createElement('a');el.className='lvd-social-icon';el.setAttribute('aria-label',icon.name);el.title=icon.name;el.href=link.url.trim();el.target='_blank';el.rel='noopener noreferrer';const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');for(const d of icon.paths){const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);path.setAttribute('fill-rule','evenodd');svg.append(path)}el.append(svg);social.append(el)}
          for(const link of links.filter(l=>!used.has(l))){const a=document.createElement('a');a.textContent=link.label;a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';social.append(a)}
        }
      }
      for(const link of (settings.navigation||[])){const destination=new URL(link.url,location.origin);if(destination.origin===location.origin&&/^\/bai-viet\/?$/.test(destination.pathname))continue;for(const nav of document.querySelectorAll('.desktop-nav,#menu-dialog .dialog-links')){const href=new URL(link.url,location.origin).href;if([...nav.querySelectorAll('a')].some(a=>a.href===href))continue;const a=document.createElement('a');a.textContent=link.label;a.href=link.url;nav.append(a)}}
      enrich();const news=await fetch('/api/articles?limit=6&sort=-updatedAt');if(news.ok){articles=(await news.json()).docs||[];enrich()}
    }catch{}
  });
})();

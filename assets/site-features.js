'use strict';
/* Jurisdiction, verified Bizlawyer team and optional visitor fields.
   German-law titles are taxonomy only, never unreviewed legal answers. */
(() => {
  const C=window.LVD_CATALOG;
  const I=window.LVD_I18N;
  const ic=n=>window.LVD_ICON?.(n)||'';
  const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const de=()=>I?.get()==='de';
  const l=(vi,ger)=>de()?ger:vi;
  const team=[
    {name:'Dương Thành Tâm',role:'Giám đốc điều hành',roleDe:'Geschäftsführer',field:'Doanh nghiệp, đầu tư, M&A và tranh tụng',fieldDe:'Unternehmensrecht, Investitionen, M&A und Prozesse',url:'https://bizlawyer.vn/vi/team/duong-thanh-tam/'},
    {name:'Lê Văn Dương',role:'Luật sư thành viên',roleDe:'Partneranwalt',field:'Tư vấn pháp lý',fieldDe:'Rechtsberatung'},
    {name:'Võ Nguyễn Bảo Trâm',role:'Luật sư thành viên',roleDe:'Partneranwältin',field:'Tư vấn và giải quyết vấn đề pháp lý',fieldDe:'Beratung und rechtliche Streitigkeiten',url:'https://bizlawyer.vn/vi/team/vo-nguyen-bao-tram/'},
    {name:'Nguyễn Xuân Phước',role:'Luật sư – Cố vấn cấp cao',roleDe:'Anwalt – Seniorberater',field:'Quản trị và chuyên môn pháp lý',fieldDe:'Unternehmensführung und Rechtsberatung',url:'https://bizlawyer.vn/vi/team/nguyen-xuan-phuoc/'},
    {name:'Đỗ Mạnh Dũng',role:'Luật sư – Cố vấn cấp cao',roleDe:'Anwalt – Seniorberater',field:'Tư vấn pháp luật',fieldDe:'Rechtsberatung'},
    {name:'Nguyễn Thị Hoa',role:'Luật sư',roleDe:'Rechtsanwältin',field:'Tư vấn pháp lý',fieldDe:'Rechtsberatung'},
    {name:'Cao Vân Anh',role:'Luật sư',roleDe:'Rechtsanwältin',field:'Tư vấn pháp lý',fieldDe:'Rechtsberatung'},
    {name:'Phạm Anh Hùng',role:'Luật sư',roleDe:'Rechtsanwalt',field:'Tư vấn pháp lý',fieldDe:'Rechtsberatung'},
    {name:'Vũ Hà Vân',role:'Chuyên gia pháp lý',roleDe:'Rechtsexpertin',field:'Nghiên cứu và tư vấn pháp luật',fieldDe:'Rechtsrecherche und Beratung'}
  ];
  const teamSource='https://bizlawyer.vn/vi/doi-ngu-chuyen-gia/';
  const directoryLink=(path,label)=>'<a href="'+path+'" class="lvd-feature-link">'+e(label)+' '+ic('arrow')+'</a>';
  /* Logo assets are rendered from the official carousel URLs identified on
     g2gcareer.com and bizlawyer.vn on 2026-11-01. Each asset appears once.
     They identify the original carousel's published organizations only; this
     does not assert any relationship with Luật Việt Đức. */
  const partnerItems=[
    {source:'G2G Career',logo:'https://g2gcareer.com/wp-content/uploads/2026/08/p1.svg'},
    {source:'G2G Career',logo:'https://g2gcareer.com/wp-content/uploads/2026/07/doi-tac-02.png'},
    {source:'G2G Career',logo:'https://g2gcareer.com/wp-content/uploads/2026/07/doi-tac-03.jpg'},
    {source:'Bizlawyer',logo:'https://bizlawyer.vn/wp-content/uploads/masterise.jpg'},
    {source:'Bizlawyer',logo:'https://bizlawyer.vn/wp-content/uploads/bes.jpg'},
    {source:'Bizlawyer',logo:'https://bizlawyer.vn/wp-content/uploads/SPIC.jpg'},
    {source:'Bizlawyer',logo:'https://bizlawyer.vn/wp-content/uploads/yingje.jpg'},
    {source:'Bizlawyer',logo:'https://bizlawyer.vn/wp-content/uploads/Aditya.jpg'},
    {source:'Bizlawyer',logo:'https://bizlawyer.vn/wp-content/uploads/irc.jpg'},
    {source:'Bizlawyer',logo:'https://bizlawyer.vn/wp-content/uploads/vingroup.jpg'},
    {source:'Bizlawyer',logo:'https://bizlawyer.vn/wp-content/uploads/knightfrank.jpg'},
    {source:'Bizlawyer',logo:'https://bizlawyer.vn/wp-content/uploads/masan.jpg'},
    {source:'Bizlawyer',logo:'https://bizlawyer.vn/wp-content/uploads/ipcgroup.jpg'}
  ];
  const partnerCard=(p,i)=>'<figure class="lvd-partner-tile"><img src="'+e(p.logo)+'" alt="'+e(l('Logo từ '+p.source,'Logo aus dem Karussell von '+p.source))+'" width="220" height="100" loading="lazy" decoding="async" draggable="false" referrerpolicy="no-referrer"></figure>';
  function partnerSlider(){
    return '<section class="lvd-partner-section container" aria-label="'+e(l('Các đơn vị được giới thiệu','Vorgestellte Organisationen'))+'"><div class="lvd-feature-heading"><div><span class="s-eyebrow">G2G CAREER · BIZLAWYER</span><h2>'+e(l('Các đơn vị được giới thiệu','Vorgestellte Organisationen'))+'</h2></div></div><div class="lvd-partner-slider" data-logo-slider tabindex="0" aria-label="'+e(l('Vuốt, kéo hoặc dùng phím mũi tên để xem logo','Logos durch Wischen, Ziehen oder mit den Pfeiltasten ansehen'))+'"><div class="lvd-partner-track">'+partnerItems.map(partnerCard).join('')+'</div><div class="lvd-partner-controls"><button type="button" data-slider-dir="-1" aria-label="'+e(l('Xem logo trước','Vorheriges Logo'))+'">‹</button><button type="button" data-slider-pause aria-pressed="false" aria-label="'+e(l('Tạm dừng tự chạy','Automatischen Lauf pausieren'))+'">Ⅱ</button><button type="button" data-slider-dir="1" aria-label="'+e(l('Xem logo tiếp theo','Nächstes Logo'))+'">›</button></div></div><p class="lvd-partner-attribution">'+e(l('Logo từ danh sách công khai của ','Logos aus den öffentlich angezeigten Listen von '))+'<a href="https://g2gcareer.com/" target="_blank" rel="noopener noreferrer">G2G Career</a> · <a href="https://bizlawyer.vn/vi/" target="_blank" rel="noopener noreferrer">Bizlawyer</a>. '+e(l('Việc hiển thị không xác nhận quan hệ đối tác với Luật Việt Đức.','Die Darstellung bestätigt keine Partnerschaft mit Luật Việt Đức.'))+'</p></section>';
  }
  const memberCard=(p,i)=>{
    const name=p.name.trim().split(/\s+/);
    const initials=(name.length>1?name[0][0]+name[name.length-1][0]:name[0].slice(0,2)).toLocaleUpperCase('vi');
    return '<article class="lvd-expert-card"><span class="lvd-expert-avatar" aria-hidden="true">'+e(initials)+'</span><div class="lvd-expert-card-text"><span class="lvd-expert-number">'+String(i+1).padStart(2,'0')+' / BIZLAWYER</span><h3 class="lvd-team-name" data-no-translation>'+e(p.name)+'</h3><strong>'+e(de()?p.roleDe:p.role)+'</strong><p>'+e(de()?p.fieldDe:p.field)+'</p><a href="'+e(p.url||teamSource)+'" rel="noopener noreferrer" target="_blank">'+e(l('Hồ sơ tại Bizlawyer','Profil bei Bizlawyer'))+' '+ic('arrow')+'</a></div></article>';
  };
  function teamView(){
    return '<div class="container page lvd-team-page"><div class="breadcrumb"><a href="#/">'+e(l('Trang chủ','Startseite'))+'</a><span>/</span><span>'+e(l('Đội ngũ chuyên gia','Expertenteam'))+'</span></div><header class="lvd-team-hero"><span class="s-eyebrow">BIZLAWYER & PARTNERS</span><h1>'+e(l('Luật sư & chuyên gia','Anwälte & Fachleute'))+'</h1><p>'+e(l('Giới thiệu đội ngũ luật sư, chuyên gia pháp lý theo hồ sơ công khai của Bizlawyer.','Vorstellung von Anwältinnen, Anwälten und Fachleuten nach den öffentlich zugänglichen Profilen von Bizlawyer.'))+'</p><a href="'+teamSource+'" target="_blank" rel="noopener noreferrer" class="button">'+e(l('Xem đội ngũ tại Bizlawyer','Team bei Bizlawyer ansehen'))+' '+ic('arrow')+'</a></header><div class="lvd-team-context"><span>'+ic('info')+'</span><p>'+e(l('Thông tin nhân sự được giới thiệu từ Bizlawyer; không đồng nghĩa mọi chuyên gia có thể trực tiếp tiếp nhận yêu cầu trên Luật Việt Đức.','Diese Personen werden anhand der Bizlawyer-Profile vorgestellt; dies ist keine Zusage einer direkten Mandatsannahme über Luật Việt Đức.'))+'</p></div><div class="lvd-expert-grid">'+team.map(memberCard).join('')+'</div>'+partnerSlider()+'</div>';
  }
  function teamTeaser(){
    return '<section class="container lvd-team-teaser"><div class="lvd-team-teaser-copy"><span class="s-eyebrow">04 / BIZLAWYER & PARTNERS</span><h2>'+e(l('Tìm hiểu đội ngũ<br>luật sư & chuyên gia.','Anwälte & Fachleute<br>kennenlernen.')).replace(/&lt;br&gt;/g,'<br>')+'</h2><p>'+e(l('Chuyên môn và kinh nghiệm của đội ngũ Bizlawyer, qua các hồ sơ công khai.','Fachgebiete und Erfahrung des Bizlawyer-Teams anhand seiner öffentlichen Profile.'))+'</p>'+directoryLink('#/doi-ngu-chuyen-gia',l('Xem đội ngũ','Team ansehen'))+'</div><div class="lvd-team-preview">'+[team[0],team[2],team[3]].map(p=>'<a href="'+p.url+'" target="_blank" rel="noopener noreferrer"><strong data-no-translation>'+e(p.name)+'</strong><small>'+e(de()?p.roleDe:p.role)+'</small></a>').join('')+'</div></section>';
  }
  const tabs=(active)=>'<nav class="lvd-country-tabs" aria-label="'+e(l('Chọn hệ thống pháp luật','Rechtssystem wählen'))+'"><a '+(active==='vn'?'aria-current="page"':'')+' href="#/phap-luat/viet-nam">'+ic('scales')+'<span>'+e(l('Pháp luật Việt Nam','Vietnamesisches Recht'))+'</span></a><a '+(active==='de'?'aria-current="page"':'')+' href="#/phap-luat/duc">'+ic('globe')+'<span>'+e(l('Pháp luật Đức','Deutsches Recht'))+'</span></a></nav>';
  const groups=C.groups;
  function countryView(r){
    const parts=r.path.split('/').filter(Boolean);
    const country=parts[1]==='duc'?'de':'vn',id=parts[2];
    if(country==='vn'){
      const target={...r,path:id?'/chu-de/'+id:'/tra-cuu'};
      const raw=window.LVD_CATALOG_UI.view(target);
      return raw;
    }
    const group=groups.find(g=>g.id===id);
    const label=l('Pháp luật Đức','Deutsches Recht');
    const list=group?[group]:groups;
    return '<div class="container page catalog-page lvd-country-page lvd-german-law"><div class="breadcrumb"><a href="#/">'+e(l('Trang chủ','Startseite'))+'</a><span>/</span><span>'+e(label)+'</span></div>'+tabs('de')+'<header class="lvd-country-hero"><span class="s-eyebrow">'+e(l('THƯ VIỆN PHÁP LUẬT ĐỨC','DEUTSCHES RECHT'))+'</span><h1>'+e(group?(de()?I.groupTitle(group.title):group.title):label)+'</h1><p>'+e(l('Danh mục lĩnh vực để định hướng tìm hiểu. Nội dung pháp luật Đức cần được chuyên gia kiểm tra trước khi công bố.','Übersicht der Rechtsgebiete. Inhalte zum deutschen Recht werden erst nach fachlicher Prüfung veröffentlicht.'))+'</p></header>'+(!group?'<div class="lvd-country-overview"><strong>'+e(l('16 nhóm lĩnh vực','16 Rechtsgebiete'))+'</strong><span>'+e(l('Chưa có nội dung pháp luật Đức được kiểm duyệt.','Noch keine geprüften deutschen Rechtsinhalte.'))+'</span></div>':'')+'<div class="catalog-groups lvd-german-groups">'+list.map((g,i)=>'<a class="catalog-group" href="#/phap-luat/duc/'+e(g.id)+'"><span class="catalog-group-number">'+String(groups.indexOf(g)+1).padStart(2,'0')+'</span><span class="catalog-group-body"><strong>'+e(de()?I.groupTitle(g.title):g.title)+'</strong><small>'+e(l('Đang biên tập nội dung','Inhalt in Vorbereitung'))+'</small></span><span class="catalog-group-icon">'+ic(g.icon||'scales')+'</span></a>').join('')+'</div><section class="lvd-country-alert">'+ic('info')+'<div><strong>'+e(l('Chưa có bài viết được kiểm duyệt trong nhánh này','Für diesen Bereich liegen noch keine geprüften Artikel vor'))+'</strong><p>'+e(l('Anh/chị có thể nêu vấn đề cần tìm hiểu ở phần hỏi đáp. Hệ thống hiện chưa tiếp nhận hoặc chuyển câu hỏi tới chuyên gia thật.','Sie können Ihre Frage im Chat formulieren. Eine tatsächliche Expertenübermittlung ist derzeit noch nicht eingerichtet.'))+'</p>'+directoryLink('#/hoi-dap-ai',l('Đặt câu hỏi','Frage stellen'))+'</div></section></div>';
  }
  const state={visitor:null};
  function visitorView(){
    const v=state.visitor||{};
    const field=(name,label,type='text',placeholder='')=>'<label class="lvd-visitor-field"><span>'+e(label)+' <small>'+e(l('(không bắt buộc)','(freiwillig)'))+'</small></span><input name="'+name+'" type="'+type+'" maxlength="'+(type==='email'?254:110)+'" autocomplete="off" value="'+e(v[name]||'')+'" placeholder="'+e(placeholder)+'"></label>';
    return '<div class="container page lvd-visitor-page"><div class="breadcrumb"><a href="#/">'+e(l('Trang chủ','Startseite'))+'</a><span>/</span>'+e(l('Thông tin tự nguyện','Freiwillige Angaben'))+'</div><div class="lvd-visitor-hero"><span class="s-eyebrow">'+e(l('LỰA CHỌN CỦA BẠN','IHRE ENTSCHEIDUNG'))+'</span><h1>'+e(l('Để lại thông tin tự nguyện','Freiwillige Kontaktdaten'))+'</h1><p>'+e(l('Các trường bên dưới đều không bắt buộc. Website chưa có hệ thống nhận và lưu đăng ký trên máy chủ.','Alle Felder sind freiwillig. Eine serverseitige Anmeldung oder Datenspeicherung ist derzeit nicht verfügbar.'))+'</p></div><form id="lvd-visitor-form" class="lvd-visitor-form" novalidate><div class="lvd-visitor-form-grid">'+field('name',l('Họ và tên','Name'))+field('email','E-Mail','email')+field('phone',l('Số điện thoại','Telefon'),'tel')+field('city',l('Thành phố / quốc gia','Stadt / Land'))+field('interest',l('Lĩnh vực quan tâm','Interessengebiet'))+'</div><label class="lvd-visitor-checkbox"><input type="checkbox" name="updates" '+(v.updates?'checked':'')+'><span>'+e(l('Tôi muốn nhận thông tin khi kênh đăng ký chính thức được triển khai (lựa chọn không bắt buộc; hiện chưa có dịch vụ gửi tin).','Ich möchte später informiert werden, sobald eine Anmeldung verfügbar ist (freiwillig; derzeit kein Versanddienst).'))+'</span></label><div class="lvd-visitor-form-actions"><button class="button" type="submit">'+e(l('Giữ thông tin trong phiên này','Angaben für diese Sitzung merken'))+'</button><button class="button secondary" data-clear-visitor type="button">'+e(l('Xóa thông tin','Angaben löschen'))+'</button></div><p id="lvd-visitor-result" class="lvd-visitor-result" role="status">'+e(l('Không có dữ liệu nào được gửi tới máy chủ.','Es werden keine Daten an einen Server gesendet.'))+'</p></form></div>';
  }
  const accepts=r=>/^\/phap-luat\/(viet-nam|duc)(\/|$)/.test(r.path)||['/doi-ngu-chuyen-gia'].includes(r.path);
  const view=r=>{
    if(r.path.startsWith('/phap-luat/'))return countryView(r);
    return teamView();
  };
  document.addEventListener('submit',e=>{
    if(e.target.id!=='lvd-visitor-form')return;
    e.preventDefault();
    const fd=new FormData(e.target);
    state.visitor={...Object.fromEntries(fd),updates:!!e.target.elements.updates.checked};
    const result=e.target.querySelector('#lvd-visitor-result');
    result.textContent=l('Đã giữ thông tin tạm trong phiên trang này. Chưa gửi đi và sẽ mất khi tải lại trang.','Die Angaben sind nur in dieser geöffneten Sitzung vorgemerkt. Sie wurden nicht versendet und gehen beim Neuladen verloren.');
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-clear-visitor]');
    if(b){state.visitor=null;const f=b.closest('form');f.reset();f.querySelector('#lvd-visitor-result').textContent=l('Thông tin đã được xóa trong phiên này.','Ihre Angaben wurden aus dieser Sitzung entfernt.');}
    const sl=e.target.closest('[data-slider-dir]');
    if(sl){const track=sl.closest('[data-logo-slider]')?.querySelector('.lvd-partner-track');track?.scrollBy({left:Number(sl.dataset.sliderDir)*320,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  });
  /* Gentle source-carousel motion; hover, keyboard focus and reduced-motion stop it. */
  function initSourceSliders(){
    document.querySelectorAll('[data-logo-slider]').forEach(slider=>{
      const track=slider.querySelector('.lvd-partner-track');
      if(!track||track.dataset.autoplay)return;
      track.dataset.autoplay='true';let hover=false,focus=false,drag=false,stopped=false,last=0,remainder=0,startX=0,startScroll=0;
      const reduced=matchMedia('(prefers-reduced-motion: reduce)');
      slider.addEventListener('mouseenter',()=>hover=true);slider.addEventListener('mouseleave',()=>hover=false);
      slider.addEventListener('focusin',()=>focus=true);slider.addEventListener('focusout',ev=>focus=slider.contains(ev.relatedTarget));
      const pause=slider.querySelector('[data-slider-pause]');
      pause.addEventListener('click',()=>{stopped=!stopped;pause.setAttribute('aria-pressed',String(stopped));pause.textContent=stopped?'▶':'Ⅱ';});
      slider.addEventListener('keydown',ev=>{if(ev.target!==slider||!['ArrowLeft','ArrowRight'].includes(ev.key))return;ev.preventDefault();track.scrollBy({left:(ev.key==='ArrowLeft'?-1:1)*220,behavior:reduced.matches?'instant':'smooth'});});
      track.addEventListener('pointerdown',ev=>{drag=true;if(ev.pointerType==='mouse'){startX=ev.clientX;startScroll=track.scrollLeft;track.setPointerCapture(ev.pointerId);ev.preventDefault();}});
      track.addEventListener('pointermove',ev=>{if(drag&&ev.pointerType==='mouse')track.scrollLeft=startScroll-(ev.clientX-startX);});
      ['pointerup','pointercancel','lostpointercapture'].forEach(type=>track.addEventListener(type,()=>drag=false));
      const step=now=>{if(!slider.isConnected)return;const dt=Math.min(60,now-last);last=now;
        if(!hover&&!focus&&!drag&&!stopped&&!reduced.matches&&document.visibilityState==='visible'&&track.scrollWidth>track.clientWidth){remainder+=dt*.018;if(remainder>=1){const advance=Math.floor(remainder);remainder-=advance;track.scrollLeft+=advance;if(track.scrollLeft+track.clientWidth>=track.scrollWidth-1)track.scrollLeft=0;}}
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{initSourceSliders();new MutationObserver(initSourceSliders).observe(document.getElementById('main'),{childList:true});});
  function aboutGerman(){
    return '<div class="container page lvd-about-german"><div class="breadcrumb"><a href="#/">Startseite</a><span>/</span>Über uns</div><header class="page-heading"><span class="s-eyebrow">LUẬT VIỆT ĐỨC</span><h1>Über Luật Việt Đức</h1><p>Ein Informationsportal für Rechtsfragen und Themen, die für die vietnamesische Community in Deutschland wichtig sind.</p></header><div class="lvd-about-german-grid"><section><h2>Rechtsfragen</h2><p>Beschreiben Sie Ihre Situation, um passende Themen in der bestehenden Bibliothek zu finden. Eine produktive KI- oder Expertenübermittlung ist derzeit noch nicht aktiviert.</p><a class="lvd-feature-link" href="#/hoi-dap-ai">Frage formulieren →</a></section><section><h2>Bibliothek für zwei Rechtssysteme</h2><p>Das vietnamesische Recht umfasst 16 Sachgebiete und 303 Themen aus der bereitgestellten Gliederung. Für das deutsche Recht gibt es eine entsprechende Struktur; fachlich geprüfte Einzelinhalte werden später ergänzt.</p><a class="lvd-feature-link" href="#/phap-luat/duc">Deutsches Recht ansehen →</a></section><section><h2>Nachrichten und Ratgeber</h2><p>Beiträge zu rechtlichen Entwicklungen und Alltagsthemen in Deutschland weisen auf die jeweilige Quelle hin. Vietnamesische Originalbeiträge werden nicht automatisch als geprüfte deutsche Rechtsauskünfte dargestellt.</p><a class="lvd-feature-link" href="#/tin-tuc">Nachrichten ansehen →</a></section><section><h2>Fachleute bei Bizlawyer</h2><p>Öffentlich verfügbare Profile der bei Bizlawyer genannten Anwälte und Fachleute werden mit Links zur Originalquelle vorgestellt. Eine Mandatsannahme über diese Website wird nicht zugesichert.</p><a class="lvd-feature-link" href="#/doi-ngu-chuyen-gia">Expertenteam ansehen →</a></section></div></div>';
  }
  window.LVD_FEATURES=Object.freeze({accepts,view,partnerSlider,teamTeaser,teamView,tabs,aboutGerman,team,partnerItems});
})();

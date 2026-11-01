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
  const partnerItems=[
    {name:'BIZLAWYER & PARTNERS',label:'Bizlawyer & Partners',url:'https://bizlawyer.vn/vi/',status:'law'}
  ];
  const partnerCard=p=>'<a class="lvd-partner-tile" href="'+e(p.url)+'" target="_blank" rel="noopener noreferrer"><span class="lvd-partner-wordmark" aria-label="'+e(p.label)+'">BIZ<span>LAWYER</span><small>& PARTNERS</small></span><span class="lvd-partner-description">'+e(l('Đơn vị luật và tư vấn chuyên môn','Kanzlei und Rechtsberatung'))+' '+ic('arrow')+'</span></a>';
  function partnerSlider(){
    const multi=partnerItems.length>1;
    return '<section class="lvd-partner-section container" aria-label="'+e(l('Đơn vị chuyên môn được giới thiệu','Vorgestellte Fachorganisation'))+'"><div class="lvd-feature-heading"><div><span class="s-eyebrow">'+e(l('MẠNG LƯỚI','NETZWERK'))+'</span><h2>'+e(l('Đơn vị chuyên môn','Fachorganisationen'))+'</h2><p>'+e(l('Hồ sơ đơn vị được dẫn từ website chính thức.','Organisationsprofile verlinken auf die offiziellen Websites.'))+'</p></div></div><div class="lvd-partner-slider" data-logo-slider><div class="lvd-partner-track">'+partnerItems.map(partnerCard).join('')+'</div>'+(multi?'<div class="lvd-partner-controls"><button type="button" data-slider-dir="-1" aria-label="Trước">‹</button><button type="button" data-slider-dir="1" aria-label="Sau">›</button></div>':'')+'</div></section>';
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
    return '<section class="container lvd-team-teaser"><div class="lvd-team-teaser-copy"><span class="s-eyebrow">BIZLAWYER & PARTNERS</span><h2>'+e(l('Gặp đội ngũ luật sư, chuyên gia','Lernen Sie das Expertenteam kennen'))+'</h2><p>'+e(l('Tìm hiểu đội ngũ chuyên môn qua những hồ sơ đã công bố trên Bizlawyer.','Lernen Sie das Fachteam anhand der veröffentlichten Bizlawyer-Profile kennen.'))+'</p>'+directoryLink('#/doi-ngu-chuyen-gia',l('Xem đội ngũ','Team ansehen'))+'</div><div class="lvd-team-preview" aria-hidden="true"><span>BT</span><span>VB</span><span>NP</span></div></section>';
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
  const accepts=r=>/^\/phap-luat\/(viet-nam|duc)(\/|$)/.test(r.path)||['/doi-ngu-chuyen-gia','/dang-ky-thong-tin'].includes(r.path);
  const view=r=>{
    if(r.path.startsWith('/phap-luat/'))return countryView(r);
    return r.path==='/doi-ngu-chuyen-gia'?teamView():visitorView();
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
    if(sl){const track=sl.closest('[data-logo-slider]')?.querySelector('.lvd-partner-track');track?.scrollBy({left:Number(sl.dataset.sliderDir)*320,behavior:'smooth'});}
  });
  function aboutGerman(){
    return '<div class="container page lvd-about-german"><div class="breadcrumb"><a href="#/">Startseite</a><span>/</span>Über uns</div><header class="page-heading"><span class="s-eyebrow">LUẬT VIỆT ĐỨC</span><h1>Über Luật Việt Đức</h1><p>Ein Informationsportal für Rechtsfragen und Themen, die für die vietnamesische Community in Deutschland wichtig sind.</p></header><div class="lvd-about-german-grid"><section><h2>Rechtsfragen</h2><p>Beschreiben Sie Ihre Situation, um passende Themen in der bestehenden Bibliothek zu finden. Eine produktive KI- oder Expertenübermittlung ist derzeit noch nicht aktiviert.</p><a class="lvd-feature-link" href="#/hoi-dap-ai">Frage formulieren →</a></section><section><h2>Bibliothek für zwei Rechtssysteme</h2><p>Das vietnamesische Recht umfasst 16 Sachgebiete und 303 Themen aus der bereitgestellten Gliederung. Für das deutsche Recht gibt es eine entsprechende Struktur; fachlich geprüfte Einzelinhalte werden später ergänzt.</p><a class="lvd-feature-link" href="#/phap-luat/duc">Deutsches Recht ansehen →</a></section><section><h2>Nachrichten und Ratgeber</h2><p>Beiträge zu rechtlichen Entwicklungen und Alltagsthemen in Deutschland weisen auf die jeweilige Quelle hin. Vietnamesische Originalbeiträge werden nicht automatisch als geprüfte deutsche Rechtsauskünfte dargestellt.</p><a class="lvd-feature-link" href="#/tin-tuc">Nachrichten ansehen →</a></section><section><h2>Fachleute bei Bizlawyer</h2><p>Öffentlich verfügbare Profile der bei Bizlawyer genannten Anwälte und Fachleute werden mit Links zur Originalquelle vorgestellt. Eine Mandatsannahme über diese Website wird nicht zugesichert.</p><a class="lvd-feature-link" href="#/doi-ngu-chuyen-gia">Expertenteam ansehen →</a></section></div></div>';
  }
  window.LVD_FEATURES=Object.freeze({accepts,view,partnerSlider,teamTeaser,teamView,tabs,aboutGerman,team,partnerItems});
})();

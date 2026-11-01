'use strict';
/* Luật Việt Đức — Vietnamese/German interface locale. Data and legal advice
   remain source-bound; translations never manufacture legal conclusions. */
(() => {
  const D={
    'Tra cứu':'Nachschlagen',
    'Thông tin pháp luật Việt Nam – Đức dành cho cộng đồng người Việt tại Đức.':'Rechtsinformationen zu Vietnam und Deutschland für die vietnamesische Community in Deutschland.',
    'Hỏi đáp hiện gợi ý các chủ đề liên quan trong thư viện. Trả lời AI và gửi câu hỏi tới chuyên gia chưa khả dụng.':'Der Chat schlägt passende Bibliotheksthemen vor. KI-Antworten und die Weiterleitung an Fachleute sind derzeit nicht verfügbar.',
    'Trang chủ':'Startseite','Hỏi đáp':'Fragen & Antworten','Hỏi đáp pháp luật':'Rechtsfragen',
    'Thư viện':'Bibliothek','Thư viện pháp luật':'Rechtsbibliothek','Tin pháp luật':'Rechtsnachrichten',
    'Đặt câu hỏi':'Frage stellen','Gửi câu hỏi':'Frage absenden','Gặp chuyên gia':'Fachperson kontaktieren',
    'Liên hệ':'Kontakt','Giới thiệu':'Über uns','Về Luật Việt Đức':'Über Luật Việt Đức',
    'Quyền riêng tư':'Datenschutz','Chính sách quyền riêng tư':'Datenschutzerklärung',
    'Điều khoản sử dụng':'Nutzungsbedingungen','Cẩm nang tại Đức':'Ratgeber für Deutschland',
    'Cuộc sống tại Đức':'Leben in Deutschland','Khám phá':'Entdecken','Thông tin':'Informationen',
    'Xem tất cả lĩnh vực':'Alle Rechtsgebiete ansehen','Tất cả bài viết':'Alle Beiträge',
    'Tất cả cẩm nang':'Alle Ratgeber','Tra cứu thư viện':'Bibliothek durchsuchen',
    'Gửi yêu cầu':'Anfrage senden','Hủy':'Abbrechen','Tìm kiếm':'Suchen','Đăng nhập':'Anmelden',
    'Trợ lý AI':'KI-Assistent','Gần đây':'Zuletzt','Cuộc trò chuyện mới':'Neues Gespräch',
    'Thư viện kiến thức':'Wissensbibliothek','Đặt câu hỏi pháp luật':'Rechtsfrage stellen',
    'Gửi liên hệ':'Kontaktanfrage senden','Thông tin liên hệ':'Kontaktinformationen',
    'Họ và tên':'Vollständiger Name','Email liên hệ':'Kontakt-E-Mail',
    'Nội dung':'Nachricht','Lĩnh vực liên quan':'Rechtsgebiet',
    'Tôi muốn tìm hiểu':'Ich möchte mich informieren',
    'Thư viện pháp luật Việt Nam.':'Bibliothek des vietnamesischen Rechts.',
    'Chính sách & quy định':'Gesetze & Regelungen',
    'Pháp luật Việt Nam':'Vietnamesisches Recht',
    'Pháp luật Đức':'Deutsches Recht',
    '16 lĩnh vực':'16 Rechtsgebiete','303 chủ đề':'303 Themen',
    'Các lĩnh vực pháp luật':'Rechtsgebiete','Chủ đề pháp luật':'Rechtsthemen',
    '16 lĩnh vực · 303 chủ đề':'16 Rechtsgebiete · 303 Themen',
    'Việt Nam':'Vietnam','Đức':'Deutschland',
    'Chuyên gia':'Fachpersonen','Đội ngũ chuyên gia':'Expertenteam',
    'Đội ngũ luật sư, chuyên gia':'Rechtsanwälte & Fachleute',
    'Cộng đồng người Việt':'Vietnamesische Community',
    'Theo dõi Bizlawyer':'Bizlawyer folgen',
    'Nhận thông tin':'Informationen erhalten',
    'Để lại thông tin':'Kontaktdaten hinterlassen',
    'Không bắt buộc':'Freiwillig',
    '(tự nguyện)':'(freiwillig)',
    'Thông tin tự nguyện':'Freiwillige Angaben',
    'Đối tác chuyên môn':'Fachpartner',
    'Gửi lời nhắn':'Nachricht schreiben',
    'Dành cho người Việt tại Đức':'Für Vietnamesinnen und Vietnamesen in Deutschland',
    'Tìm hiểu thêm':'Mehr erfahren',
    'Nội dung đang cập nhật':'Inhalte in Vorbereitung',
    'Chưa có nội dung được kiểm duyệt cho lĩnh vực này.':'Für dieses Rechtsgebiet liegen noch keine geprüften Inhalte vor.',
    'Trong cùng lĩnh vực':'Weitere Themen dieses Rechtsgebiets',
    'Bài viết':'Artikel','Cẩm nang':'Ratgeber','Tất cả':'Alle',
    'Giới thiệu & chuyên gia':'Über uns & Fachleute',
    'Hỏi về trường hợp của bạn':'Frage zu Ihrem Fall',
    'Bạn cần tìm hiểu vấn đề gì?':'Was möchten Sie rechtlich klären?',
    'Thông tin và hỏi đáp pháp luật dành cho cộng đồng người Việt tại Đức.':'Rechtsinformationen und Fragen & Antworten für die vietnamesische Community in Deutschland.',
    'Hôn nhân và Gia đình':'Ehe & Familie','Quốc tịch':'Staatsangehörigkeit',
    'Khai sinh, Hộ tịch và Giám hộ':'Geburt, Personenstand & Vormundschaft',
    'Giấy tờ tùy thân':'Ausweisdokumente','Thừa kế':'Erbrecht',
    'Hợp đồng và Giao dịch dân sự':'Verträge & Zivilrecht',
    'Tranh chấp dân sự':'Zivilrechtliche Streitigkeiten',
    'Lao động, Việc làm và Bảo hiểm xã hội':'Arbeit, Beschäftigung & Sozialversicherung',
    'Xuất nhập cảnh và Cư trú':'Einreise, Ausreise & Aufenthalt',
    'Nhà ở và Đất đai':'Wohnen & Immobilien',
    'Đầu tư, Kinh doanh và Thương mại':'Investitionen, Unternehmen & Handel',
    'Tài chính, Ngân hàng và Bảo hiểm kinh doanh':'Finanzen, Banken & Gewerbeversicherung',
    'Thuế':'Steuern','Sở hữu trí tuệ':'Geistiges Eigentum','Hình sự':'Strafrecht',
    'Tố tụng hành chính':'Verwaltungsverfahren',
    'Chưa xác định':'Noch nicht ausgewählt','Lưu bài':'Artikel speichern',
    'Chia sẻ':'Teilen','Nguồn thông tin':'Quellen','Điểm cần nhớ':'Das Wichtigste',
    'Tạo cuộc trò chuyện mới':'Neuen Chat beginnen',
    'Đã lưu':'Gespeichert','cho người Việt':'für Vietnamesinnen und Vietnamesen',
    'tại Đức.':'in Deutschland.',
    'Tìm hiểu các vấn đề pháp luật Việt Nam và Đức.':'Informationen zum Recht Vietnams und Deutschlands.',
    'pháp luật Việt Nam.':'des vietnamesischen Rechts.',
    '01 / TIN PHÁP LUẬT':'01 / RECHTSNACHRICHTEN',
    '02 / THƯ VIỆN':'02 / BIBLIOTHEK',
    '03 / CẨM NANG':'03 / RATGEBER',
    'Hôn nhân':'Ehe','Giấy tờ':'Dokumente','Nhà đất':'Immobilien',
    'Ủy quyền':'Vollmacht','Xem tất cả':'Alle anzeigen',
    'Tất cả lĩnh vực':'Alle Rechtsgebiete','Tin & cẩm nang':'Nachrichten & Ratgeber',
    'Viết câu hỏi của bạn':'Ihre Frage formulieren',
    'Tìm hiểu pháp luật Việt Nam theo lĩnh vực hoặc vấn đề cần giải quyết.':'Erkunden Sie das vietnamesische Recht nach Gebiet oder Fragestellung.',
    'Hãy mô tả vấn đề bạn cần hỗ trợ và để lại email liên hệ.':'Beschreiben Sie Ihr Anliegen und hinterlassen Sie eine E-Mail-Adresse.',
    'Tư vấn pháp luật':'Rechtsberatung',
    'ĐỘI NGŨ CHUYÊN GIA':'EXPERTENTEAM',
    'Gửi câu hỏi từ bài viết':'Frage zum Artikel stellen',
    'Về chuyên trang':'Über das Portal'
  };
  let lang='vi';
  try{lang=sessionStorage.getItem('lvd-lang')==='de'?'de':'vi';}catch{}
  const original=new WeakMap();
  const exclusions='script,style,textarea,code,pre,[data-no-translation],.news-text>p,.news-title>h1,.catalog-topic h2,.lvd-team-name,.press-card h2,.s-story h3';
  let applying=false, pending=false;
  const get=()=>lang;
  const t=(vi)=>lang==='de'?(D[vi]||vi):vi;
  const topicTitle=(vi)=>lang==='de'?(D[vi]||vi):vi;
  const skip=node=>node.parentElement?.closest(exclusions);
  function refresh(){
    if(applying)return;
    applying=true;
    try{
      document.documentElement.lang=lang;
      document.querySelectorAll('[data-language]').forEach(b=>{
        const on=b.dataset.language===lang;
        b.setAttribute('aria-pressed',String(on));
        b.classList.toggle('active',on);
      });
      const root=document.body;if(!root)return;
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      let n;
      while((n=walker.nextNode())){
        if(skip(n)||!n.nodeValue.trim())continue;
        const base=original.has(n)?original.get(n):n.nodeValue;
        if(!original.has(n))original.set(n,base);
        const trim=base.trim();
        const translated=lang==='de'&&D[trim]?base.replace(trim,D[trim]):base;
        if(n.nodeValue!==translated)n.nodeValue=translated;
      }
      document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{
        if(!el.dataset.placeholderVi)el.dataset.placeholderVi=el.getAttribute('placeholder')||'';
        let str=el.dataset.placeholderVi;
        if(lang==='de'){
          str=str.replace('Bạn cần tìm hiểu vấn đề gì?','Was möchten Sie wissen?')
                 .replace('Nhập câu hỏi của bạn…','Beschreiben Sie Ihre Frage …')
                 .replace('Tìm chủ đề, giấy tờ hoặc thủ tục…','Thema, Dokument oder Verfahren suchen …')
                 .replace('Nhập từ khóa cần tìm…','Suchbegriff eingeben …');
        }
        if(el.placeholder!==str)el.placeholder=str;
      });
    }finally{applying=false;}
  }
  function schedule(){
    if(pending)return;pending=true;
    queueMicrotask(()=>{pending=false;refresh();});
  }
  function set(next){
    if(next!=='vi'&&next!=='de')return;
    lang=next;
    try{sessionStorage.setItem('lvd-lang',lang)}catch{}
    document.documentElement.lang=lang;
    window.dispatchEvent(new Event('hashchange'));
    schedule();
    document.dispatchEvent(new CustomEvent('lvd:languagechange',{detail:{lang}}));
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-language]');
    if(!b)return;
    e.preventDefault();set(b.dataset.language);
  });
  document.addEventListener('DOMContentLoaded',()=>{
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    schedule();
  });
  window.addEventListener('hashchange',()=>setTimeout(schedule,0));
  window.LVD_I18N=Object.freeze({get,set,t,groupTitle:topicTitle,refresh,schedule});
})();

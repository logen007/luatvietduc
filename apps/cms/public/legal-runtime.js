'use strict';
(() => {
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const requests = new WeakMap();
  const l = (de, vi, german) => german ? de : vi;
  function render(german, options = {}) {
    const draft = options?.draft || {};
    const field = (key, label, type, limit, value = '') => `<label for="contact-${key}">${label}<input id="contact-${key}" name="${key}" type="${type}" maxlength="${limit}" value="${esc(value)}" autocomplete="${key === 'name' ? 'name' : key === 'email' ? 'email' : 'off'}" required></label>`;
    return `<div class="container page lvd-contact-email-page">
      <div class="breadcrumb"><a href="#/">${l('Startseite','Trang chủ',german)}</a><span>/</span><span>${l('Kontakt','Liên hệ',german)}</span></div>
      <header class="contact-email-heading"><p class="lvd-eyebrow">LUẬT VIỆT ĐỨC</p><h1>${l('Lassen Sie uns sprechen.','Cùng trao đổi.',german)}</h1><p>${l('Schreiben Sie uns. Wir antworten an Ihre E-Mail-Adresse.','Để lại lời nhắn. Chúng tôi sẽ phản hồi qua email của bạn.',german)}</p></header>
      <div class="contact-email-layout"><form id="lvd-contact-email" class="contact-email-form" data-contact-language="${german ? 'de' : 'vi'}">
        <div class="contact-email-row">${field('name',l('Name','Họ và tên',german),'text',120,draft.name)}${field('email','Email','email',254,draft.email)}</div>
        ${field('subject',l('Betreff','Tiêu đề',german),'text',160,options?.context?.title || '')}
        <label for="contact-message">${l('Nachricht','Lời nhắn',german)}<textarea id="contact-message" name="message" rows="6" maxlength="3000" required>${esc(draft.question)}</textarea></label>
        <div class="contact-email-trap" aria-hidden="true"><label for="contact-website">Website<input id="contact-website" name="website" tabindex="-1" autocomplete="off"></label></div>
        <p class="contact-email-privacy">${l('Ihre Angaben werden über Resend zur Bearbeitung Ihrer Anfrage per E-Mail versendet.','Thông tin được chuyển qua Resend để gửi email và phản hồi liên hệ.',german)} <a href="#/chinh-sach-thong-tin">${l('Datenschutz','Quyền riêng tư',german)}</a></p>
        <div class="contact-email-actions"><button type="submit" class="button">${l('Nachricht senden','Gửi lời nhắn',german)}<span aria-hidden="true">↗</span></button></div>
        <p class="contact-email-status" role="status" tabindex="-1" hidden></p>
      </form><aside class="contact-email-aside"><h2>${l('Eine Rechtsfrage?','Bạn có câu hỏi pháp luật?',german)}</h2><p>${l('Fragen stellen und Antworten im selben Gespräch verfolgen.','Gửi câu hỏi và theo dõi phản hồi trong cùng cuộc trò chuyện.',german)}</p><a href="/tro-chuyen">${l('Gespräch beginnen','Mở trò chuyện',german)} <span aria-hidden="true">↗</span></a><div class="contact-email-aside-rule"></div><h2>${l('Rechtsbibliothek','Thư viện pháp luật',german)}</h2><p>${l('Themen aus Vietnam und Deutschland entdecken.','Tìm hiểu các chủ đề pháp luật Việt Nam và Đức.',german)}</p><a href="#/tra-cuu">${l('Bibliothek öffnen','Xem thư viện',german)} <span aria-hidden="true">↗</span></a></aside></div>
    </div>`;
  }
  document.addEventListener('submit', async event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== 'lvd-contact-email') return;
    event.preventDefault();
    if (form.dataset.sending === 'true' || !form.reportValidity()) return;
    const german = form.dataset.contactLanguage === 'de';
    const input = Object.fromEntries(new FormData(form));
    const snapshot = JSON.stringify(input);
    let pending = requests.get(form);
    if (!pending || pending.snapshot !== snapshot) {
      pending = {snapshot, key:crypto.randomUUID()};
      requests.set(form, pending);
    }
    const status = form.querySelector('.contact-email-status');
    const controls = [...form.querySelectorAll('input,textarea,button')];
    const button = form.querySelector('button[type="submit"]');
    const label = button.innerHTML;
    form.dataset.sending = 'true'; form.setAttribute('aria-busy','true');
    controls.forEach(control => { control.disabled = true; });
    status.hidden = true; button.textContent = l('Wird gesendet…','Đang gửi…',german);
    try {
      const response = await fetch('/service/contact', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...input,key:pending.key}),signal:AbortSignal.timeout(15000)});
      const result = await response.json();
      if (!response.ok || result?.ok !== true) throw new Error(german ? 'Die Nachricht konnte nicht bestätigt werden. Bitte erneut versuchen oder den Chat nutzen.' : result?.error || 'Chưa gửi được lời nhắn. Vui lòng thử lại.');
      form.reset(); controls.forEach(control => { if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) control.value = ''; }); requests.delete(form);
      status.classList.remove('is-error'); status.textContent = l('Vielen Dank. Ihre Nachricht wurde versendet.','Cảm ơn bạn. Lời nhắn đã được gửi đi.',german);
    } catch (error) {
      status.classList.add('is-error'); status.textContent = error instanceof Error && error.name === 'Error' ? error.message : l('Verbindung unterbrochen. Bitte erneut versuchen oder den Chat nutzen.','Kết nối bị gián đoạn. Vui lòng thử lại hoặc dùng trò chuyện trực tuyến.',german);
    } finally {
      controls.forEach(control => { control.disabled = false; });
      form.dataset.sending = 'false'; form.removeAttribute('aria-busy'); button.innerHTML = label;
      status.hidden = false; status.focus();
    }
  });
  window.LVD_CONTACT = Object.freeze({render});
})();

'use strict';
/* Adapt the preserved prototype's information pages to the live application.
   Load after legal-pages.js and legal-de.js, before app.js. Legal substance,
   operator details and unverified retention periods stay with their owners. */
(() => {
  const apply = (html, replacements) => replacements.reduce((value, [before, after]) => value.replaceAll(before, after), html);
  const viReceipt = 'Câu hỏi gửi qua mục trao đổi với chuyên viên được lưu trên máy chủ và chuyển vào hàng chờ của chuyên viên được phân quyền. Tin nhắn chỉ được xem là tiếp nhận khi hiển thị trong lịch sử hội thoại. Chưa có thời gian phản hồi cố định. AI hiện chỉ được thử nghiệm nội bộ với nguồn công khai đã duyệt, chưa trả lời khách hàng. Đăng nhập Google đang chờ cấu hình.';
  const deReceipt = 'Fragen im Gespräch mit dem Fachteam werden auf dem Server gespeichert und in die Warteschlange berechtigter Fachpersonen gestellt. Eine Nachricht gilt erst als eingegangen, wenn sie im Gesprächsverlauf erscheint. Feste Antwortzeiten sind derzeit nicht bestätigt. KI wird nur intern mit geprüften öffentlichen Quellen getestet und beantwortet keine Kundenanfragen. Die Google-Anmeldung wartet auf die Einrichtung.';
  const vi = [
    ['Phạm vi tại đây là website đang được công khai; các dịch vụ tiếp nhận hồ sơ, quản lý tài khoản hoặc xử lý AI trên máy chủ chưa được kích hoạt.', 'Phạm vi tại đây gồm website công khai và chức năng trao đổi với chuyên viên có lưu hội thoại trên máy chủ. Đăng nhập Google đang chờ cấu hình; AI chưa trả lời khách hàng.'],
    ['Nội dung đang nhập được duy trì tạm thời trong bộ nhớ của trang để phục vụ trải nghiệm trên thiết bị của bạn. Chức năng tiếp nhận trên máy chủ chưa được mở.', 'Nội dung chưa gửi được giữ tạm trong trình duyệt. Khi gửi qua mục trao đổi với chuyên viên, nội dung được lưu trên máy chủ để chuyên viên được phân quyền tiếp nhận và phản hồi.'],
    ['Website hiện không có hệ thống xác thực tài khoản, lưu trữ hồ sơ hoặc đồng bộ hội thoại thực tế.', 'Hệ thống có xác thực tài khoản nhân sự và lưu lịch sử hội thoại trên máy chủ. Khách có thể theo dõi hội thoại trên trình duyệt đã sử dụng nhờ cookie nhận diện cần thiết; đăng nhập Google đang chờ cấu hình.'],
    ['Dữ liệu hiển thị trong trình duyệt nhằm cung cấp chức năng điều hướng, tìm kiếm trong danh mục, hỗ trợ soạn câu hỏi và hiển thị thông tin bài viết.', 'Dữ liệu được sử dụng để cung cấp chức năng điều hướng, tìm kiếm, hiển thị bài viết, lưu và theo dõi hội thoại, đồng thời chuyển câu hỏi tới chuyên viên được phân quyền.'],
    ['Không có căn cứ để khẳng định biểu mẫu đã gửi thành công nếu website chưa xác nhận tiếp nhận qua hệ thống phù hợp.', 'Tin nhắn chỉ được xem là tiếp nhận khi hiển thị trong lịch sử hội thoại. Chưa có thời gian phản hồi cố định.'],
    ['Đối với các dịch vụ thực sự thu thập hoặc lưu trữ dữ liệu cá nhân trong tương lai,', 'Đối với việc thu thập hoặc lưu trữ dữ liệu cá nhân,'],
    ['Việc tích chọn trên một biểu mẫu chưa có hệ thống tiếp nhận không đồng nghĩa dữ liệu đã được gửi hoặc lưu trữ.', 'Việc tích chọn đồng ý không tự gửi nội dung. Tin nhắn chỉ được xem là tiếp nhận khi hiển thị trong lịch sử hội thoại.'],
    ['Website được triển khai dưới dạng trang tĩnh trên GitHub Pages. Kiểu chữ có thể được tải từ máy chủ bên thứ ba; khi trình duyệt yêu cầu tài nguyên, nhà cung cấp tài nguyên có thể nhận dữ liệu kết nối kỹ thuật như địa chỉ IP.', 'Website được vận hành trên máy chủ VPS của Luật Việt Đức và sử dụng Cloudflare cho tên miền và kết nối truy cập. Phông chữ Inter được phục vụ từ chính website. Nhà cung cấp hạ tầng có thể xử lý dữ liệu kết nối kỹ thuật như địa chỉ IP.'],
    ['Nội dung tạm thời của biểu mẫu, hội thoại và biểu mẫu để lại thông tin tự nguyện chỉ được giữ trong bộ nhớ của phiên trang hiện tại; tải lại hoặc đóng trang có thể làm mất nội dung.', 'Nội dung chưa gửi và thông tin tự nguyện có thể chỉ được giữ tạm trong trình duyệt. Tin nhắn đã gửi qua mục trao đổi với chuyên viên được lưu trên máy chủ; tải lại hoặc đóng trang không xóa những bản ghi đã gửi.'],
    ['Website chưa thiết lập kho dữ liệu để lưu hồ sơ hoặc lịch sử liên hệ trên máy chủ.', 'Cookie cần thiết lvd-guest giúp trình duyệt tiếp tục truy cập hội thoại khách, có thời hạn tối đa 30 ngày. Xóa cookie có thể làm mất khả năng truy cập hội thoại khách từ trình duyệt, nhưng không tự xóa tin nhắn đã lưu trên máy chủ. Không công bố thời hạn lưu hoặc xóa hội thoại cố định khi chưa xác nhận quy trình thực hiện.'],
    ['Khi kênh tiếp nhận hồ sơ được kích hoạt, cần bổ sung cơ chế phân quyền, bảo mật truyền nhận, kiểm soát truy cập, sao lưu và xử lý sự cố tương ứng.', 'Hội thoại được kiểm soát truy cập theo phiên khách hoặc tài khoản và phạm vi được phân quyền. Việc bảo mật, sao lưu và xử lý sự cố cần được duy trì trong quá trình vận hành.'],
    ['Đối với nội dung đang nhập trong phiên hiện tại, bạn có thể xóa nội dung hoặc tải lại trang.', 'Bạn có thể tự xóa nội dung chưa gửi. Tải lại trang hoặc xóa cookie không xóa tin nhắn đã được lưu trên máy chủ.'],
    ['Giao diện hỏi đáp hiện chưa được kết nối tới dịch vụ AI hoặc hệ thống tiếp nhận chuyên gia có lưu dữ liệu trên máy chủ. Nội dung hiển thị không được xem là phản hồi chuyên môn thực tế, và việc nhập câu hỏi không bảo đảm yêu cầu đã được nhận. Khi các tính năng này hoạt động, phạm vi dịch vụ, cách kiểm duyệt kiến thức, quy trình chuyển chuyên gia và chính sách xử lý dữ liệu cần được công bố riêng.', viReceipt],
  ];
  const de = [
    ['Derzeit handelt es sich um eine statische Website; die serverseitige Bearbeitung von Anfragen und die Speicherung von Fallakten sind noch nicht aktiviert.', 'Die Website bietet Gespräche mit dem Fachteam, deren Nachrichten auf dem Server gespeichert werden. Die Google-Anmeldung wartet auf die Einrichtung; KI beantwortet keine Kundenanfragen.'],
    ['Inhalte in Chat und Formular bleiben derzeit vorübergehend im Speicher des geöffneten Browsers. Es bestehen aktuell weder ein nutzbares Serverkonto noch eine echte Upload-Funktion für Ausweisdokumente.', 'Noch nicht gesendete Eingaben bleiben vorübergehend im Browser. Gesendete Gesprächsnachrichten werden auf dem Server gespeichert und können von berechtigten Fachpersonen bearbeitet werden. Mitarbeiterkonten werden authentifiziert; die Google-Anmeldung für Besucher wartet auf die Einrichtung. Eine Upload-Funktion für Ausweisdokumente wird nicht angeboten.'],
    ['Die im Browser angezeigten Daten dienen der Navigation, Suche, Eingabe einer Frage und Darstellung von Artikeln.', 'Die Daten dienen der Navigation, Suche, Darstellung von Artikeln sowie dem Speichern, Verfolgen und Bearbeiten von Gesprächen durch berechtigte Fachpersonen.'],
    ['Eine erfolgreiche Übermittlung eines Kontakt- oder Expertenwunsches wird nicht behauptet, solange kein funktionsfähiger Empfangsprozess besteht.', 'Eine Nachricht gilt erst als eingegangen, wenn sie im Gesprächsverlauf erscheint. Feste Antwortzeiten sind derzeit nicht bestätigt.'],
    ['Sollten später personenbezogene Daten gespeichert oder an Dritte übermittelt werden, müssen', 'Bei der Speicherung personenbezogener Daten oder ihrer Übermittlung an Dritte müssen'],
    ['Eine Zustimmung in einem derzeit nicht angebundenen Formular bedeutet nicht, dass die Angaben tatsächlich versendet wurden.', 'Eine Zustimmung allein sendet noch keine Angaben. Eine Nachricht gilt erst als eingegangen, wenn sie im Gesprächsverlauf erscheint.'],
    ['Die Website wird derzeit statisch über GitHub Pages ausgeliefert. Schriftdateien und externe Rechtsquellen können von Drittanbietern geladen werden; dabei erhalten deren Server gegebenenfalls technische Verbindungsdaten.', 'Die Website wird auf einem VPS von Luật Việt Đức betrieben und nutzt Cloudflare für die Domain und den Websitezugriff. Die Schrift Inter wird von dieser Website selbst bereitgestellt. Infrastrukturanbieter können technische Verbindungsdaten wie IP-Adressen verarbeiten.'],
    ['Eingaben werden im laufenden Tab vorübergehend gehalten und können durch Neuladen oder Schließen verlorengehen. Es ist noch keine Datenbank für persönliche Vorgänge eingerichtet.', 'Noch nicht gesendete Eingaben und freiwillige Angaben können vorübergehend im Browser bleiben. Gesendete Gesprächsnachrichten werden auf dem Server gespeichert; Neuladen oder Schließen der Seite löscht diese Datensätze nicht. Das notwendige Cookie lvd-guest ermöglicht den weiteren Zugriff auf Gastgespräche und gilt höchstens 30 Tage. Das Löschen des Cookies kann den Zugriff auf Gastgespräche in diesem Browser beenden, löscht aber keine gespeicherten Nachrichten. Eine feste Aufbewahrungs- oder Löschfrist für Gespräche wird ohne bestätigtes Verfahren nicht zugesagt.'],
    ['Vor einem späteren echten Fallmanagement wären Zugriffskontrollen, Berechtigungen, sichere Übertragung und Löschprozesse gesondert festzulegen.', 'Der Zugriff auf Gespräche wird über die Gastsitzung oder das authentifizierte Konto und die jeweiligen Berechtigungen begrenzt. Sicherheit, Sicherungen und die Behandlung von Störungen müssen im Betrieb aufrechterhalten werden.'],
    ['Texte im aktuellen Browserfenster können Sie selbst entfernen oder durch Neuladen löschen.', 'Noch nicht gesendete Texte können Sie selbst entfernen. Neuladen oder das Löschen von Cookies löscht keine bereits auf dem Server gespeicherten Nachrichten.'],
    ['Die Chat-Oberfläche ist derzeit nicht mit einer produktiven KI-Antwortmaschine oder einem tatsächlich empfangenden Fachpersonal-System verbunden. Eine Eingabe oder Übergabeanfrage gilt nicht als zugestellt. Die Bedingungen und Sicherheitsmaßnahmen für spätere Beratungsleistungen werden vor deren Aktivierung gesondert veröffentlicht.', deReceipt],
  ];
  for (const [key, replacements, german] of [['LVD_LEGAL', vi, false], ['LVD_LEGAL_DE', de, true]]) {
    const original = window[key];
    if (!original) continue;
    window[key] = Object.freeze({
      ...original,
      privacy: (...args) => apply(original.privacy(...args), replacements),
      terms: (...args) => apply(original.terms(...args), replacements),
      contact: (...args) => window.LVD_CONTACT.render(german, args[0]),
    });
  }
})();

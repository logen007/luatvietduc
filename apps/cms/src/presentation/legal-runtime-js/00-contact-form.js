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
      </form><aside class="contact-email-aside"><h2>${l('Eine Rechtsfrage?','Bạn có câu hỏi pháp luật?',german)}</h2><p>${l('Fragen stellen und Antworten im selben Gespräch verfolgen.','Gửi câu hỏi và theo dõi phản hồi trong cùng cuộc trò chuyện.',german)}</p><a href="/tro-chuyen">${l('Gespräch beginnen','Mở trò chuyện',german)} <span aria-hidden="true">↗</span></a><div class="contact-email-aside-rule"></div><h2>${l('Rechtsbibliothek','Thư viện',german)}</h2><p>${l('Themen aus Vietnam und Deutschland entdecken.','Tìm hiểu các chủ đề pháp luật Việt Nam và Đức.',german)}</p><a href="#/tra-cuu">${l('Bibliothek öffnen','Xem thư viện',german)} <span aria-hidden="true">↗</span></a></aside></div>
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


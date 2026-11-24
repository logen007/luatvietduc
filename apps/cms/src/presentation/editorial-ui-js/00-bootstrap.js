'use strict';
/* Public presentation. Content, jurisdiction data and chat remain in their modules. */
(() => {
  const E = window.LVD_EDITORIAL, C = window.LVD_CATALOG;
  if (!E || !C) return;
  const l = (vi, de) => window.LVD_I18N?.get() === 'de' ? de : vi;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const arrow = '<svg class="lvd-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>';
  const icon = n => window.LVD_ICON?.(n) || arrow;


'use strict';
/* Lightweight inline SVG icon set for Luật Việt Đức.
   Decorative UI only: neutral stroke, currentColor, and no external libraries. */
(() => {
 const paths={
  family:'<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20v-2a5.5 5.5 0 0 1 11 0v2M14 14a4.5 4.5 0 0 1 7.5 3.5V20"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 4.5-5 13.5 0 18M12 3c5 4.5 5 13.5 0 18"/>',
  file:'<path d="M6 2.5h8l5 5V21H6zM14 2.5v5h5M9 12h7M9 16h7"/>',
  pen:'<path d="m4 20 4.5-1 10.8-10.8a2.4 2.4 0 0 0-3.4-3.4L5 15.6 4 20ZM14.5 6.5l3 3"/>',
  shield:'<path d="M12 2.5 20 6v6c0 5-4 8-8 9.5C8 20 4 17 4 12V6zM9 12l2 2 4-4"/>',
  briefcase:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 12l9 3 9-3"/>',
  home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M10 21v-8h4v8"/>',
  wallet:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18m-7 4h7v4h-7a2 2 0 0 1 0-4z"/>',
  bulb:'<path d="M9 21h6m-6-3h6M8 14a7 7 0 1 1 8 0l-1.5 3h-5z"/>',
  scales:'<path d="M12 3v18M7 21h10M4 7h16M7 7 3 15h8L7 7Zm10 0-4 8h8l-4-8Z"/>',
  scroll:'<path d="M7 3h12v15c0 1.7-1.3 3-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1v14a3 3 0 0 1-3 3M10 8h6M10 12h6"/>',
  gavel:'<path d="m13 4 7 7m-9-9 3 3-5 5-3-3 5-5Zm8 8 3 3-5 5-3-3 5-5ZM9 12l8 8M4 21h16"/>',
  building:'<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M9 10h.01M15 10h.01"/>',
  news:'<path d="M4 4h14v15H7a3 3 0 0 1-3-3V4Zm14 3h3v11a3 3 0 0 1-3 3H7M7 8h7M7 12h3m3 0h2M7 16h8"/>',
  book:'<path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3V4Zm9 2v16"/>',
  chat:'<path d="M4 4h16v13H9l-5 4V4Zm4 5h8M8 13h5"/>',
  bookmark:'<path d="M5 3h14v18l-7-5-7 5V3Z"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="m15.7 8.3-2 5.4-5.4 2 2-5.4 5.4-2Z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  spark:'<path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2Zm7 14 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/>'
 };
 const alias={passport:'file',citizenship:'globe',tax:'wallet',bank:'wallet',labor:'briefcase',housing:'home',legal:'scales',inheritance:'scroll',community:'family',education:'book',residence:'globe',ip:'bulb'};
 window.LVD_ICON=(name,extra='')=>{
   const n=alias[name]||name;
   const graphic=paths[n]||paths.book;
   const klass=('lvd-icon '+String(extra||'')).trim().replace(/[^a-zA-Z0-9\- _]/g,'');
   return '<svg class="'+klass+'" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+graphic+'</svg>';
 };
})();

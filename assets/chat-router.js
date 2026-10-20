'use strict';
/* Route adapter keeps the existing editorial app intact. All chat state is ephemeral browser state. */
(() => {
  const root=()=>document.getElementById('main');
  function route(){try{const u=new URL(location.hash.slice(1)||'/','https://local.invalid');return{path:u.pathname,q:u.searchParams};}catch{return{path:'/',q:new URLSearchParams()};}}
  function fit(){const el=document.querySelector('.chat-shell');if(!el)return;const top=Math.max(0,root().getBoundingClientRect().top);el.style.minHeight='0';el.style.height=Math.max(240,(window.visualViewport?.height||innerHeight)-top)+'px';}
  function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.querySelectorAll('[data-dialog]').forEach(b=>b.setAttribute('aria-expanded','false'));}
  function mounted(){window.LVD_CHAT.afterRender(route(),render);fit();}
  function render(){const r=route();if(!window.LVD_CHAT.accepts(r))return;closeDialogs();root().innerHTML=window.LVD_CHAT.view(r);const heading=root().querySelector('h1');document.title=(heading?.textContent||'Hỏi đáp pháp luật')+' | Luật Việt Đức';window.scrollTo(0,0);root().focus({preventScroll:true});document.getElementById('page-announcement').textContent=heading?.textContent||'Nội dung đã mở';mounted();}
  // Register before the legacy application; only the dedicated chat routes are intercepted.
  window.addEventListener('hashchange',e=>{if(window.LVD_CHAT.accepts(route())){e.stopImmediatePropagation();render();}else queueMicrotask(mounted);});
  document.addEventListener('click',e=>{if(e.target.closest('[data-new-chat]')&&route().path==='/hoi-dap-ai')history.replaceState(null,'','#/hoi-dap-ai');},true);
  document.addEventListener('DOMContentLoaded',()=>{if(window.LVD_CHAT.accepts(route()))render();else mounted();});
  window.addEventListener('resize',fit);
  window.visualViewport?.addEventListener('resize',fit);
})();

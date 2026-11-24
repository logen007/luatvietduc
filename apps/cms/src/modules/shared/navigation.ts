// Page navigation only. Downloads, OAuth, APIs and in-page anchors retain their
// native browser behavior; none of them should become a prefetched page request.
export function isPageLink(href:string){
 if(!href.startsWith('/')||/^\/[/\\]/.test(href)||/[\\\u0000-\u0020\u007f]/.test(href))return false;
 try{
  const path=decodeURIComponent(new URL(href,'https://internal.invalid').pathname);
  return !/^\/[/\\]/.test(path)&&!/[\\\u0000-\u0020\u007f]/.test(path)&&
   !/^\/(?:api|service|auth|health|assets|fonts)(?:\/|$)/i.test(path)&&
   !/\.(?:pdf|zip|csv|ico|png|jpe?g|webp|avif|svg|gif|mp4|webm|mjs|js|css|json|xml)$/i.test(path);
 }catch{return false;}
}
// Warm public destinations on pointer/focus/touch intent through AppLink.
// Viewport prefetch otherwise pulls whole interactive routes into the initial
// page load. Next still retains layouts and resources after navigation.
export function prefetchPage(href:string){
 return /^\/(?:admin|tai-khoan)(?:[/?#]|$)/.test(href)?false:null;
}

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
// Warm the small set of common public destinations, not every article/filter
// or any private page. Next retains the shared layout and downloaded resources.
export function prefetchPage(href:string){
 return /^\/(?:hoi-dap|thu-vien|phap-luat\/(?:viet-nam|duc)|tin-tuc|gioi-thieu|lien-he)?$/.test(href)?true:
  /^\/(?:admin|tai-khoan)(?:[/?#]|$)/.test(href)?false:null;
}

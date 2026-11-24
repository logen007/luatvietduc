import {measurableURL,measurementMode,type MeasurementConfig} from './policy';
type MeasurementWindow=Window&{dataLayer?:unknown[];gtag?:(...args:unknown[])=>void};
// A tracker cannot be unloaded reliably. Cross into unmeasured URLs with a new
// document, so already-executed container code cannot observe private screens.
export function installMeasurement(config:MeasurementConfig,onFailure:()=>void){
 const mode=measurementMode(config),w=window as MeasurementWindow;
 if(!mode||!measurableURL(new URL(location.href)))return ()=>{};
 const layer=w.dataLayer=w.dataLayer||[];
 w.gtag=function(){layer.push(arguments);};
 const gtag=w.gtag;
 gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
 gtag('set',{page_location:location.origin+location.pathname,page_referrer:'',allow_google_signals:false,allow_ad_personalization_signals:false});
 if(mode==='ga'){
  gtag('js',new Date());
  gtag('config',config.gaId,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,ignore_referrer:true});
 }else layer.push({'gtm.start':Date.now(),event:'gtm.js'});
 const script=document.createElement('script');script.async=true;script.dataset.lvdMeasurement='true';
 script.src=mode==='gtm'?'https://www.googletagmanager.com/gtm.js?id='+config.gtmId:'https://www.googletagmanager.com/gtag/js?id='+config.gaId;
 script.referrerPolicy='no-referrer';script.onerror=onFailure;
 const originals={pushState:history.pushState,replaceState:history.replaceState};
 const guards={} as Record<'pushState'|'replaceState',History['pushState']>;
 for(const method of ['pushState','replaceState'] as const){
  guards[method]=function(data,unused,url){
   if(url){const next=new URL(String(url),location.href);if(next.origin!==location.origin||!measurableURL(next)){location.assign(next.href);return;}}
   originals[method].call(history,data,unused,url);
  };history[method]=guards[method];
 }
 const click=(event:MouseEvent)=>{
  if(event.button||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const link=event.target instanceof Element?event.target.closest('a[href]'):null;
  if(!(link instanceof HTMLAnchorElement)||link.target&&link.target!=='_self'||link.hasAttribute('download'))return;
  const next=new URL(link.href,location.href);
  if(next.origin===location.origin&&!measurableURL(next)){event.preventDefault();event.stopImmediatePropagation();location.assign(next.href);}
 };
 const pop=()=>{if(!measurableURL(new URL(location.href)))location.reload();};
 const storage=(event:StorageEvent)=>{if(event.key==='lvd-statistics-consent-v1')location.reload();};
 document.addEventListener('click',click,true);window.addEventListener('popstate',pop);
 window.addEventListener('storage',storage);
 document.head.appendChild(script);
 return ()=>{
  script.remove();window.removeEventListener('storage',storage);document.removeEventListener('click',click,true);window.removeEventListener('popstate',pop);
  for(const method of ['pushState','replaceState'] as const)if(history[method]===guards[method])history[method]=originals[method];
 };
}
export function measurePage(config:MeasurementConfig){
 const mode=measurementMode(config),w=window as MeasurementWindow,url=new URL(location.href);
 if(!mode||!measurableURL(url))return;
 const values={page_location:url.origin+url.pathname,page_path:url.pathname,page_referrer:''};
 if(mode==='gtm')w.dataLayer?.push({event:'lvd_page_view',...values});
 else w.gtag?.('event','page_view',{...values,send_to:config.gaId});
}

export type MeasurementConfig={gtmId:string;gaId:string};
// Only known public content routes; never send query strings, hashes or private URLs.
export function measurableURL(url:URL){
 return !url.search&&!url.hash&&/^(?:\/(?:thu-vien|tin-tuc|gioi-thieu|lien-he|quyen-rieng-tu|dieu-khoan|tro-giup|doi-ngu)?\/?|\/(?:phap-luat\/(?:viet-nam|duc)|chu-de|tin|bai-viet)(?:\/[a-z0-9-]+)*\/?)$/.test(url.pathname);
}
export function measurementMode(config:MeasurementConfig){return /^GTM-[A-Z0-9]{4,32}$/.test(config.gtmId)?'gtm':/^G-[A-Z0-9]{6,32}$/.test(config.gaId)?'ga':null;}
export const consentKey='lvd-statistics-consent-v1';
export function savedConsent(value:string|null,now=Date.now()):boolean|null{
 try{const v=JSON.parse(value||'null');return typeof v?.allowed==='boolean'&&Number.isFinite(v.until)&&v.until>now&&v.until<=now+183*86400000?v.allowed:null;}catch{return null;}
}

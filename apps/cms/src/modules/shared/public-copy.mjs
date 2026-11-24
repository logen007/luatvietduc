export const PUBLIC_COPY_MODULES=['common','home','library','news','account','information','contact'];
// Plain bilingual UI content only; no HTML, routes, secrets or executable code.
/** @param {unknown} value @returns {Record<string,{vi:string,de:string}>} */
export function parsePublicCopy(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1||!value.text||typeof value.text!=='object'||Array.isArray(value.text))throw Error('Invalid public copy catalog');
 const entries=Object.entries(value.text);if(entries.length>4000)throw Error('Public copy catalog too large');
 const result=Object.create(null);
 for(const [key,pair] of entries){
  if(!key||key.length>4000||!pair||typeof pair!=='object'||Array.isArray(pair)||Object.keys(pair).some(k=>k!=='vi'&&k!=='de')||typeof pair.vi!=='string'||typeof pair.de!=='string'||pair.vi.length>12000||pair.de.length>12000)throw Error('Invalid bilingual public copy entry');
  result[key]={vi:pair.vi,de:pair.de};
 }
 return result;
}

/** @param {unknown[]} catalogs @returns {Record<string,{vi:string,de:string}>} */
export function mergePublicCopy(catalogs){
 const result=Object.create(null);
 for(const catalog of catalogs)for(const [key,pair]of Object.entries(parsePublicCopy(catalog))){
  if(Object.hasOwn(result,key))throw Error('Duplicate public copy source key');
  result[key]=pair;
 }
 return result;
}

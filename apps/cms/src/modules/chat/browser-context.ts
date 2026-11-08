export type BrowserContext={timeZone?:string;language?:string;country?:string};
// Hints only: never use browser/network location to decide legal jurisdiction.
// No GPS permission, coordinates, IP lookup provider or inferred street address.
export function normalizeBrowserContext(input:unknown,country?:unknown):BrowserContext|undefined{
 const value=input&&typeof input==='object'&&!Array.isArray(input)?input as Record<string,unknown>:{},result:BrowserContext={};
 if(typeof value.timeZone==='string'&&value.timeZone.length<=80)try{result.timeZone=new Intl.DateTimeFormat('en',{timeZone:value.timeZone}).resolvedOptions().timeZone;}catch{}
 if(typeof value.language==='string'&&value.language.length<=35)try{result.language=Intl.getCanonicalLocales(value.language)[0];}catch{}
 if(typeof country==='string'&&/^[A-Z]{2}$/.test(country)&&country!=='XX')result.country=country;
 return Object.keys(result).length?result:undefined;
}
export function currentBrowserContext():BrowserContext|undefined{
 if(typeof navigator==='undefined')return;
 try{return normalizeBrowserContext({timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,language:navigator.language});}catch{return;}
}
export function approximateLocation(context?:BrowserContext):string|null{
 if(!context)return null;
 const country=context.country||({'Asia/Saigon':'VN','Asia/Ho_Chi_Minh':'VN','Europe/Berlin':'DE','Europe/Busingen':'DE'} as Record<string,string>)[context.timeZone||''];
 let name='';if(country)try{name=new Intl.DisplayNames(['vi'],{type:'region'}).of(country)||country;}catch{name=country;}
 return [name,context.timeZone].filter(Boolean).join(' · ')||null;
}

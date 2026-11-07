import type {PublicSettings} from './view';
const textFields=['siteName','logo','privacyText','tagline','footerText','supportNotice','officeHours','timeZone','accentColor'] as const;
const boolFields=['chatEnabled','publicIndexingEnabled','customerAIEnabled'] as const;
const object=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
export function readPublicSettings(value:unknown):PublicSettings{
 const invalid=()=>{throw new Error('Chưa tải được cài đặt website.');};
 if(!object(value))return invalid();
 const known=[...textFields,...boolFields,'maxMessageLength','headerLogoHeight','footerLogoHeight','navigation','socialLinks'];
 if(!known.some(key=>Object.hasOwn(value,key)))return invalid();
 for(const key of textFields)if(value[key]!=null&&typeof value[key]!=='string')return invalid();
 for(const key of boolFields)if(value[key]!=null&&typeof value[key]!=='boolean')return invalid();
 if(value.maxMessageLength!=null&&(typeof value.maxMessageLength!=='number'||!Number.isFinite(value.maxMessageLength)||value.maxMessageLength<100||value.maxMessageLength>10000))return invalid();
 for(const [key,max] of [['headerLogoHeight',64],['footerLogoHeight',120]] as const)if(value[key]!=null&&(typeof value[key]!=='number'||!Number.isFinite(value[key])||value[key]<16||value[key]>max))return invalid();
 for(const key of ['navigation','socialLinks']){
  const links=value[key];
  if(links!=null&&(!Array.isArray(links)||links.some(link=>!object(link)||typeof link.label!=='string'||typeof link.url!=='string')))return invalid();
 }
 return value as PublicSettings;
}

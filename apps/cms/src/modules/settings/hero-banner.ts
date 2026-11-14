import renditions from './hero-video-renditions.json';
// Match an exact public media revision; replacing a file or choosing another
// banner immediately falls back to that new source, never an unrelated clip.
export function heroVideoSource(source:string,mobile=false){
 const match=renditions.find(item=>source===item.source||source==='https://luatvietduc.com'+item.source);
 return match?(mobile?match.mobile:match.desktop):source;
}
// Bundled defaults preserve the current banner until an admin selects media.
export const defaultHeroBanner={video:'/media/legal-hero-stock-v10.mp4',mobileVideo:'/media/legal-hero-stock-mobile-v10.mp4',poster:'/media/legal-hero-stock-poster-v10.webp',revision:0};
export type HeroBanner=typeof defaultHeroBanner;
export function publicMediaURL(value:unknown,kind:'video'|'image'){
 if(!value||typeof value!=='object')return null;
 const media=value as Record<string,unknown>;
 if(media.visibility!=='public'||typeof media.mimeType!=='string'||(kind==='video'?!['video/mp4','video/webm'].includes(media.mimeType):!media.mimeType.startsWith('image/')))return null;
 if(typeof media.url!=='string'||!safeMediaURL(media.url))return null;
 const time=typeof media.updatedAt==='string'?Date.parse(media.updatedAt):NaN;
 return media.url+(Number.isFinite(time)?(media.url.includes('?')?'&':'?')+'v='+time:'');
}
export function safeMediaURL(value:unknown):value is string{
 if(typeof value!=='string'||!value||/[\\\s\u0000-\u001f#]/.test(value))return false;
 if(value.startsWith('/')&&!value.startsWith('//'))return true;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}
}
export function heroBanner(settings:{heroVideo?:unknown;heroMobileVideo?:unknown;heroPoster?:unknown;updatedAt?:string|null}):HeroBanner{
 const video=publicMediaURL(settings.heroVideo,'video'),mobile=publicMediaURL(settings.heroMobileVideo,'video'),poster=publicMediaURL(settings.heroPoster,'image');
 return {video:heroVideoSource(video||defaultHeroBanner.video),mobileVideo:heroVideoSource(mobile||video||defaultHeroBanner.mobileVideo,true),poster:poster||defaultHeroBanner.poster,revision:Date.parse(settings.updatedAt||'')||0};
}
export function latestHeroBanner(initial:HeroBanner,current?:HeroBanner){return current&&current.revision>=initial.revision?current:initial;}

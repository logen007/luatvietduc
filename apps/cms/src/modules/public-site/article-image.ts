import {publicMediaURL} from '../settings/hero-banner';
export type ArticleImageData={url:string;alt:string;width:number;height:number};
export function featuredArticleImage(value:unknown):ArticleImageData|undefined{
 const url=publicMediaURL(value,'image');if(!url||url.startsWith('/')&&!/^\/(?:assets\/|media\/|api\/media\/file\/)/.test(url))return;
 const media=value as {alt?:unknown;width?:unknown;height?:unknown};
 const width=Number(media.width),height=Number(media.height);
 return {url,alt:typeof media.alt==='string'?media.alt.slice(0,500):'',width:Number.isFinite(width)&&width>0?width:1200,height:Number.isFinite(height)&&height>0?height:800};
}

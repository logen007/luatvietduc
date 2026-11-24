import sizes from './photo-sizes.json';
const names=sizes as Record<string,Record<string,{width:number;height:number}>>;
export function photo(name:string,width:480|960|1440=960,card=false,format:'webp'|'avif'='webp'){
 const key=names[name]?name:'berlin',dimensions=names[key][width];
 return {src:'/assets/optimized-photos/'+key+(card?'-card':'')+'-'+width+'.'+format,...dimensions,...(card?{height:Math.round(dimensions.width/1.6)}:{})};
}
export function photoSet(name:string,card=false,format:'webp'|'avif'='webp'){return ([480,960,1440] as const).map(width=>{const item=photo(name,width,card,format);return item.src+' '+item.width+'w';}).join(', ');}

// Recognize only our immutable packaged photos. Uploaded/R2/private URLs must
// keep their existing thumbnail and authorization path.
export function packagedPhotoName(url:string){
 const match=/^\/assets\/photos\/([a-z-]+)-(?:600|1200|1800)\.webp$/.exec(url);
 return match&&names[match[1]]?match[1]:null;
}

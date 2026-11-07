import sizes from './photo-sizes.json';
const names=sizes as Record<string,Record<string,{width:number;height:number}>>;
export function photo(name:string,width:480|960|1440=960,card=false){
 const key=names[name]?name:'berlin',dimensions=names[key][width];
 return {src:'/assets/optimized-photos/'+key+(card?'-card':'')+'-'+width+'.webp',...dimensions,...(card?{height:Math.round(dimensions.width/1.6)}:{})};
}
export function photoSet(name:string,card=false){return ([480,960,1440] as const).map(width=>{const item=photo(name,width,card);return item.src+' '+item.width+'w';}).join(', ');}

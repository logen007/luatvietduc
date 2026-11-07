import sizes from './photo-sizes.json';
const names=sizes as Record<string,Record<string,{width:number;height:number}>>;
export function photo(name:string,width:480|960|1440=960){
 const key=names[name]?name:'berlin',dimensions=names[key][width];
 return {src:'/assets/optimized-photos/'+key+'-'+width+'.webp',...dimensions};
}
export function photoSet(name:string){return ([480,960,1440] as const).map(width=>{const item=photo(name,width);return item.src+' '+item.width+'w';}).join(', ');}

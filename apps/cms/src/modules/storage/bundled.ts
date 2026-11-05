import files from '../legacy/files.json';
import families from './bundled-families.json';
export const bundledFiles=files.map(file=>({...file,filename:'lvd-bundled-'+file.url.slice(1).replaceAll('/','__')}));
export const bundledNames=bundledFiles.map(file=>file.filename);
const byName=new Map(bundledFiles.map(file=>[file.filename,file]));
export function bundledFile(filename:unknown){return typeof filename==='string'?byName.get(filename):undefined;}
export function bundledURL(doc:Record<string,any>){
 const file=bundledFile(doc.filename);if(!file)return doc;
 const family=families.find(group=>group.primary.filename===doc.filename);
 const sizes=family?Object.fromEntries(Object.entries(family.sizes).filter((entry)=>Boolean(entry[1])).map(([name,size])=>[name,{...size,url:size!.url}])):doc.sizes;
 return {...doc,...(family?{width:family.primary.width,height:family.primary.height,sizes}:{}),url:file.url,thumbnailURL:file.type==='image'?(family?.sizes.medium?.url||file.url):null};
}

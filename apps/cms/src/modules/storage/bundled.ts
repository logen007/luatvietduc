import files from '../legacy/files.json';
export const bundledFiles=files.map(file=>({...file,filename:'lvd-bundled-'+file.url.slice(1).replaceAll('/','__')}));
export const bundledNames=bundledFiles.map(file=>file.filename);
const byName=new Map(bundledFiles.map(file=>[file.filename,file]));
export function bundledFile(filename:unknown){return typeof filename==='string'?byName.get(filename):undefined;}
export function bundledURL(doc:Record<string,any>){
 const file=bundledFile(doc.filename);if(!file)return doc;
 return {...doc,url:file.url,thumbnailURL:file.type==='image'?file.url:null};
}

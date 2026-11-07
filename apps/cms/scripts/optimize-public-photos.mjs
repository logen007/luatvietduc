// Rebuild packaged responsive photos; originals and media records stay intact.
import sharp from 'sharp';
import path from 'node:path';
import {mkdir,writeFile,stat} from 'node:fs/promises';
const root=path.resolve(import.meta.dirname,'../../..');
await mkdir(root+'/assets/optimized-photos',{recursive:true});const manifest={};let old=0,bytes=0;
for(const name of ['berlin','dong-xuan','family','housing','library','train','tram','work']){
 manifest[name]={};const source=root+'/assets/photos/'+name+'-1800.webp';old+=(await stat(source)).size;
 for(const width of [480,960,1440]){
  const out=root+'/assets/optimized-photos/'+name+'-'+width+'.webp';
  const info=await sharp(source).rotate().resize({width,withoutEnlargement:true}).webp({quality:72,effort:5}).toFile(out);
  manifest[name][width]={width:info.width,height:info.height};bytes+=info.size;
 }
}
await writeFile(root+'/apps/cms/src/modules/public-site/photo-sizes.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({original1800Bytes:old,allOptimizedSizesBytes:bytes}));

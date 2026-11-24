// Rebuild packaged responsive photos; originals and media records stay intact.
import sharp from 'sharp';
import path from 'node:path';
import {mkdir,writeFile,stat} from 'node:fs/promises';
const root=path.resolve(import.meta.dirname,'../../..');
await mkdir(root+'/assets/optimized-photos',{recursive:true});const manifest={};let old=0,bytes=0,avifBytes=0;
for(const name of ['berlin','dong-xuan','family','housing','library','train','tram','work']){
 manifest[name]={};const source=root+'/assets/photos/'+name+'-1800.webp';old+=(await stat(source)).size;
 for(const width of [480,960,1440]){
  const out=root+'/assets/optimized-photos/'+name+'-'+width+'.webp';
  const info=await sharp(source).rotate().resize({width,withoutEnlargement:true}).webp({quality:72,effort:5}).toFile(out);
  manifest[name][width]={width:info.width,height:info.height};bytes+=info.size;
  const avif=await sharp(source).rotate().resize({width,withoutEnlargement:true}).avif({quality:50,effort:4}).toFile(out.replace(/\.webp$/,'.avif'));avifBytes+=avif.size;
  // List cards already crop to 1.6:1 in CSS. Generate that visible region instead
  // of downloading a tall original only to discard most of its pixels.
  const card=await sharp(source).rotate().resize({width,height:Math.round(width/1.6),fit:'cover',position:'centre',withoutEnlargement:true}).webp({quality:72,effort:5}).toFile(root+'/assets/optimized-photos/'+name+'-card-'+width+'.webp');bytes+=card.size;
  const avifCard=await sharp(source).rotate().resize({width,height:Math.round(width/1.6),fit:'cover',position:'centre',withoutEnlargement:true}).avif({quality:50,effort:4}).toFile(root+'/assets/optimized-photos/'+name+'-card-'+width+'.avif');avifBytes+=avifCard.size;
 }
}
await writeFile(root+'/apps/cms/src/modules/public-site/photo-sizes.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({original1800Bytes:old,allOptimizedSizesBytes:bytes,avifBytes}));

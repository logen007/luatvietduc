// Build-only compiler cache: one reusable cache, bounded at build boundaries.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export const BUILD_CACHE_LIMIT=768*1024*1024;
export function trimBuildCache(directory,maxBytes=BUILD_CACHE_LIMIT){
 if(!fs.existsSync(directory))return {cleared:false,bytes:0};
 if(!fs.lstatSync(directory).isDirectory())throw Error('Build cache must be a directory');
 let bytes=0,entries=0;const pending=[directory];
 while(pending.length&&bytes<=maxBytes&&entries<=50000){
  for(const item of fs.readdirSync(pending.pop(),{withFileTypes:true})){
   if(++entries>50000)break;
   const file=path.join(item.parentPath,item.name);
   // Never follow symlinks out of the compiler cache.
   if(item.isDirectory())pending.push(file);else bytes+=fs.lstatSync(file).size;
   if(bytes>maxBytes)break;
  }
 }
 const cleared=bytes>maxBytes||entries>50000;
 if(cleared)for(const name of fs.readdirSync(directory))fs.rmSync(path.join(directory,name),{recursive:true,force:true});
 return {cleared,bytes};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=trimBuildCache(path.resolve('.next/cache'));
 console.log(result.cleared?'Compiler cache exceeded budget; cleared for reuse.':'Compiler cache is within budget.');
}

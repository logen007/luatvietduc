import {createHash} from 'node:crypto';
import {readFileSync,realpathSync,statSync} from 'node:fs';
import path from 'node:path';

let cached;
// Resolve the atomic snapshot once. Unchanged photos keep their browser cache;
// changed bytes get a new URL before SSR/hydration, without client-side swapping.
/** @param {string} publicDirectory @returns {string[]} */
export function homeBenefitPhotos(publicDirectory){
 const root=realpathSync(publicDirectory),files=['clarity','specialist','records'].map(name=>'media/benefits/'+name+'.webp');
 const signature=JSON.stringify([root,...files.map(file=>{const stat=statSync(path.join(root,file));return [stat.dev,stat.ino,stat.size,stat.mtimeMs,stat.ctimeMs];})]);
 if(cached?.signature===signature)return [...cached.urls];
 const urls=files.map(file=>{
  const revision=createHash('sha256').update(readFileSync(path.join(root,file))).digest('hex').slice(0,12);
  return '/'+file+'?v='+revision;
 });
 cached={signature,urls};return [...urls];
}

import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import path from 'node:path';

// Resolve the atomic snapshot once. Unchanged photos keep their browser cache;
// changed bytes get a new URL before SSR/hydration, without client-side swapping.
/** @param {string} publicDirectory @returns {string[]} */
export function homeBenefitPhotos(publicDirectory){
 const root=realpathSync(publicDirectory);
 return ['clarity','specialist','records'].map(name=>{
  const file='media/benefits/'+name+'.webp';
  const revision=createHash('sha256').update(readFileSync(path.join(root,file))).digest('hex').slice(0,12);
  return '/'+file+'?v='+revision;
 });
}

import {readFileSync,realpathSync,statSync} from 'node:fs';
import path from 'node:path';
import {mergePublicCopy,PUBLIC_COPY_MODULES} from './public-copy.mjs';
type Copy=Record<string,{vi:string;de:string}>;
let cached:{signature:string;copy:Copy}|undefined;
// Cache only validated public text, bounded to one snapshot. Resolve the release
// once so a symlink switch never mixes catalogs from two versions. File metadata
// also invalidates local edits; failures never serve the prior catalog.
export function readPublicCopy(directory=path.join(process.cwd(),'public'),retry=true):Copy{
 try{
  const root=realpathSync(directory),files=['release.json',...PUBLIC_COPY_MODULES.map(name=>'content/'+name+'.json')];
  const signature=()=>JSON.stringify([root,...files.map(file=>{
   const stat=statSync(path.join(root,file));return [stat.dev,stat.ino,stat.size,stat.mtimeMs,stat.ctimeMs];
  })]);
  const before=signature();
  if(cached?.signature===before)return cached.copy;
  const text=mergePublicCopy(PUBLIC_COPY_MODULES.map(name=>JSON.parse(readFileSync(path.join(root,'content',name+'.json'),'utf8'))));
  if(signature()!==before||realpathSync(directory)!==root){if(retry)return readPublicCopy(directory,false);return {};}
  // Plain objects cross the RSC boundary; freeze to prevent one render mutating
  // the catalog shared with the next request.
  const copy={...text} as Copy;for(const pair of Object.values(copy))Object.freeze(pair);Object.freeze(copy);
  cached={signature:before,copy};return copy;
 }catch{cached=undefined;return {};}
}

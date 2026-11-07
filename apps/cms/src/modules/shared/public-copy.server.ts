import {readFileSync} from 'node:fs';
import path from 'node:path';
import {mergePublicCopy,PUBLIC_COPY_MODULES} from './public-copy.mjs';
// Read one atomic public snapshot before rendering, never replace text after paint.
export function readPublicCopy(directory=path.join(process.cwd(),'public'),retry=true):Record<string,{vi:string;de:string}>{
 try{
  const snapshot=readFileSync(path.join(directory,'release.json'),'utf8');
  const text=mergePublicCopy(PUBLIC_COPY_MODULES.map(name=>JSON.parse(readFileSync(path.join(directory,'content',name+'.json'),'utf8'))));
  // Retry through the new symlink if a release switched during this small read.
  if(readFileSync(path.join(directory,'release.json'),'utf8')!==snapshot){if(retry)return readPublicCopy(directory,false);return {};}
  return text as Record<string,{vi:string;de:string}>;
 }catch{return {};}
}

import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {cachedPendingRelease,updateState} from '../../modules/shared/release-status';
export const dynamic='force-dynamic';
export async function GET(){
 let state:{status:string}={status:'unknown'};
 try{
  // Read the same atomically promoted snapshot as the public release marker.
  const active=JSON.parse(await readFile(path.join(process.cwd(),'public/release.json'),'utf8'));
  state=updateState(active,await cachedPendingRelease());
 }catch{/* Unknown or unavailable evidence never creates a misleading spinner. */}
 return Response.json(state,{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
}

// Compile our offline tools, then trace their actual runtime dependencies.
// No npm/compiler/source tree is copied into the final image.
import {build} from 'esbuild';
import nft from 'next/dist/compiled/@vercel/nft/index.js';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),out=path.join(root,'maintenance');
await mkdir(out,{recursive:true});
await build({entryPoints:{manage:'scripts/portable.ts','backup-bridge':'scripts/backup/bridge.ts'},outdir:out,outExtension:{'.js':'.mjs'},bundle:true,platform:'node',format:'esm',packages:'external',target:'node24',
  banner:{js:"import {createRequire as lvdCreateRequire} from 'node:module'; const require=lvdCreateRequire(import.meta.url);"}});
const {fileList}=await nft.nodeFileTrace(['maintenance/manage.mjs','maintenance/backup-bridge.mjs'],{base:root,processCwd:root});
for(const file of fileList){
  if(file.startsWith('../')||path.isAbsolute(file))throw new Error('Trace escaped application root');
  const target=path.join(root,'maintenance-runtime',file);
  await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(root,file),target);
}
const migrations=[...(await readFile('src/migrations/index.ts','utf8')).matchAll(/name:\s*['"]([^'"]+)['"]/g)].map(match=>match[1]);
if(!migrations.length)throw new Error('Migration catalog unavailable');
const version=JSON.parse(await readFile('src/modules/shared/site-version.json','utf8')).version;
const metadata={format:1,version,commit:process.env.LVD_COMMIT,migrations};
await writeFile('portable-release.json',JSON.stringify(metadata)+'\n');
await writeFile('public/release.json',JSON.stringify({version,commit:metadata.commit,lane:'portable'})+'\n');

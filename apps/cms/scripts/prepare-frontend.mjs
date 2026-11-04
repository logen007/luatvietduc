import {cp,mkdir,readFile,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {transformFrontend} from './frontend-shell.mjs'
import {augmentBilingual} from './locale-build.mjs'
const root=path.resolve(import.meta.dirname,'../../..'),pub=path.resolve(import.meta.dirname,'../public')
await mkdir(pub,{recursive:true});await cp(path.join(root,'assets'),path.join(pub,'assets'),{recursive:true})
await writeFile(path.join(pub,'frontend.html'),transformFrontend(await readFile(path.join(root,'index.html'),'utf8')))

// Add the shared interface dictionary to the deployed copy; preserve legacy sources.
const dictionary=JSON.parse(await readFile(new URL('../src/modules/shared/locale/de.json',import.meta.url),'utf8'));
const bilingual=await readFile(path.join(pub,'assets/bilingual.js'),'utf8');
await writeFile(path.join(pub,'assets/bilingual.js'),augmentBilingual(bilingual,dictionary));

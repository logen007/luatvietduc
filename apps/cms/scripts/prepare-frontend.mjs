import {cp,mkdir,readFile,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {transformFrontend} from './frontend-shell.mjs'
import {writeInterfaceLocale} from './locale-build.mjs'
const root=path.resolve(import.meta.dirname,'../../..'),pub=path.resolve(import.meta.dirname,'../public')
await mkdir(pub,{recursive:true});await cp(path.join(root,'assets'),path.join(pub,'assets'),{recursive:true})
await writeFile(path.join(pub,'frontend.html'),transformFrontend(await readFile(path.join(root,'index.html'),'utf8')))

await writeInterfaceLocale(pub);

await writeFile(path.join(pub,'account-state.mjs'),await readFile(new URL('../src/modules/shared/account-state.mjs',import.meta.url)));

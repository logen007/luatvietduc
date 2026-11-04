import {mkdir,readFile,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {transformFrontend} from './frontend-shell.mjs'
import {writeInterfaceLocale} from './locale-build.mjs'
const pub=path.resolve(import.meta.dirname,'../public')
await mkdir(pub,{recursive:true})
await writeFile(path.join(pub,'frontend.html'),transformFrontend(await readFile('/legacy-index.html','utf8')))

await writeInterfaceLocale(pub);

await writeFile(path.join(pub,'account-state.mjs'),await readFile(new URL('../src/modules/shared/account-state.mjs',import.meta.url)));

await writeFile(path.join(pub,'public-shell.mjs'),await readFile(new URL('../src/modules/shared/public-shell.mjs',import.meta.url)));

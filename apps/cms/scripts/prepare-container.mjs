import {mkdir,readFile,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {transformFrontend} from './frontend-shell.mjs'
import {writeInterfaceLocale} from './locale-build.mjs'
const pub=path.resolve(import.meta.dirname,'../public')
await mkdir(pub,{recursive:true})
await writeFile(path.join(pub,'frontend.html'),transformFrontend(await readFile('/legacy-index.html','utf8')))

await writeInterfaceLocale(pub);

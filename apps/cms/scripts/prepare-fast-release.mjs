// Dependency-free public shell assembly inside the existing Node image (network disabled).
import {mergePublicCopy,PUBLIC_COPY_MODULES} from '../src/modules/shared/public-copy.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {transformFrontend} from './frontend-shell.mjs';
await writeFile(new URL('../public/frontend.html',import.meta.url),transformFrontend(await readFile(new URL('../../../index.html',import.meta.url),'utf8')));

mergePublicCopy(await Promise.all(PUBLIC_COPY_MODULES.map(async name=>JSON.parse(await readFile(new URL('../public/content/'+name+'.json',import.meta.url),'utf8')))));

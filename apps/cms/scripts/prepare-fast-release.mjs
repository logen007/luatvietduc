// Dependency-free public shell assembly inside the existing Node image (network disabled).
import {readFile,writeFile} from 'node:fs/promises';
import {transformFrontend} from './frontend-shell.mjs';
await writeFile(new URL('../public/frontend.html',import.meta.url),transformFrontend(await readFile(new URL('../../../index.html',import.meta.url),'utf8')));

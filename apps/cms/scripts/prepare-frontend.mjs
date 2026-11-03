import {cp,mkdir,readFile,writeFile} from 'node:fs/promises'
import path from 'node:path'
const root=path.resolve(import.meta.dirname,'../../..'),pub=path.resolve(import.meta.dirname,'../public')
await mkdir(pub,{recursive:true});await cp(path.join(root,'assets'),path.join(pub,'assets'),{recursive:true})
let html=await readFile(path.join(root,'index.html'),'utf8')
html=html.replace(/<meta http-equiv="Content-Security-Policy"[^>]+>/,'')
html=html.replace(/<div class="lvd-footer-social">.*?<\/div>/,'<div class="lvd-footer-social" id="live-social"></div>')
html=html.replace('<script src="assets/content.js','<script src="/live-bridge.js" defer></script>\n  <script src="assets/content.js')
html=html.replace('<a class="button header-ask"','<a class="text-link" href="/tai-khoan">Tài khoản</a><a class="button header-ask"')
html=html.replace('</head>','<link rel="stylesheet" href="/live.css"></head>')
await writeFile(path.join(pub,'frontend.html'),html)

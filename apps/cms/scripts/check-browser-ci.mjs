// Runs inside the existing required CMS build gate, without changing the
// server-approved workflow. Container builds invoke next directly, not npm build.
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
if(process.env.CI!=='true')process.exit(0);
const db=new URL(process.env.DATABASE_URL||'');
if(!['127.0.0.1','localhost'].includes(db.hostname)||db.pathname!=='/lvd_test')throw new Error('CMS browser checks require the isolated CI database');
// Hosted runners may already provide Chrome. Reuse it rather than downloading
// another browser and installing fonts on every release. Browser tests still run.
const installed=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable'].find(path=>existsSync(path)&&spawnSync(path,['--version'],{timeout:10000,stdio:'ignore'}).status===0);
const env={...process.env,...(installed?{LVD_TEST_BROWSER_EXECUTABLE:installed}:{})};
const commands=installed?[['--import','tsx','scripts/test-browser.mjs']]:[
 ['node_modules/playwright/cli.js','install','--with-deps','chromium'],
 ['--import','tsx','scripts/test-browser.mjs'],
];
console.log(installed?'Browser checks: using installed Chrome.':'Browser checks: installing Chromium.');
for(const args of commands){
 const result=spawnSync(process.execPath,args,{stdio:'inherit',env,timeout:240000});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}

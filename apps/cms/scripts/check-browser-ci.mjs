// Runs inside the existing required CMS build gate, without changing the
// server-approved workflow. Container builds invoke next directly, not npm build.
import {spawnSync} from 'node:child_process';
if(process.env.CI!=='true')process.exit(0);
const db=new URL(process.env.DATABASE_URL||'');
if(!['127.0.0.1','localhost'].includes(db.hostname)||db.pathname!=='/lvd_test')throw new Error('CMS browser checks require the isolated CI database');
for(const args of [
 ['node_modules/playwright/cli.js','install','--with-deps','chromium'],
 ['--import','tsx','scripts/test-browser.mjs'],
]){
 const result=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env,timeout:240000});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}

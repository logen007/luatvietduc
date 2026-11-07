import assert from 'node:assert/strict';
import {getPayload} from 'payload';
import config from '../src/payload.config';
import {pool} from '../src/modules/shared/db';
import {testPublicContent} from './test-public-content';
import {publicLegacyNews} from '../src/modules/public-site/server';
const db=new URL(process.env.DATABASE_URL||''),base=process.env.APP_URL||'';
if(!['localhost','127.0.0.1'].includes(db.hostname)||db.pathname!=='/lvd_test'||!/^http:\/\/(localhost|127\.0\.0\.1):3047$/.test(base))throw new Error('Local isolated public HTTP test only');
const payload=await getPayload({config}),suffix=crypto.randomUUID();
const owner=await payload.create({collection:'users',overrideAccess:true,context:{bootstrapOwner:true},data:{name:'Synthetic public test',email:'public-'+suffix+'@example.invalid',password:crypto.randomUUID(),role:'owner'}});
const previous=await payload.findGlobal({slug:'site-settings',overrideAccess:true});
const headers={'user-agent':'Googlebot'};
const articleIds:number[]=[];
try{
 await testPublicContent(payload,owner);
 const published=await payload.create({collection:'articles',overrideAccess:false,user:owner,data:{title:'Public HTTP '+suffix,slug:'native-http-'+suffix,body:'Synthetic public article',kind:'article',language:'vi',jurisdiction:'BOTH',_status:'published',reviewState:'approved'}});articleIds.push(published.id);
 const draft=await payload.create({collection:'articles',overrideAccess:false,user:owner,data:{title:'Private HTTP '+suffix,slug:'native-private-'+suffix,body:'PRIVATE synthetic draft',kind:'article',language:'vi',jurisdiction:'BOTH',_status:'draft',reviewState:'draft'}});articleIds.push(draft.id);
 const legacy=(await publicLegacyNews())[0];assert.ok(legacy);
 for(const enabled of [false,true]){
  await payload.updateGlobal({slug:'site-settings',overrideAccess:false,user:owner,data:{publicIndexingEnabled:enabled}});
  for(const path of ['/','/thu-vien','/phap-luat/viet-nam','/phap-luat/duc','/chu-de/quoc-tich','/tin-tuc','/gioi-thieu','/lien-he','/quyen-rieng-tu','/dieu-khoan','/bai-viet/'+published.slug,'/tin/'+legacy.id]){
   const response=await fetch(base+path,{headers});assert.equal(response.status,200,path);const html=await response.text();
   assert.match(html,/<main[^>]*id="main"/);assert.match(html,/rel="canonical"/);assert.match(html,enabled?/<meta name="robots" content="index, follow"\/>/:/<meta name="robots" content="noindex, nofollow"\/>/,path);
   assert.ok(!html.includes('src="assets/app.js'),path);
   assert.match(html,/editorial-ui\.css\?v=[a-f0-9]{12}/);assert.match(html,/editorial-ui\.js\?v=[a-f0-9]{12}/);
  }
  const robots=await (await fetch(base+'/robots.txt')).text();assert.equal(robots.includes('Sitemap:'),enabled);if(enabled)assert.ok(robots.includes('/admin')&&robots.includes('/service'));
  const sitemap=await (await fetch(base+'/sitemap.xml')).text();assert.equal(sitemap.includes('<sitemap>'),enabled);
  assert.equal((await fetch(base+'/bai-viet/'+draft.slug)).status,404);
  for(const path of ['/tai-khoan','/hoi-dap']){const html=await (await fetch(base+path,{headers})).text();assert.match(html,/<meta name="robots" content="noindex, nofollow"\/>/,path);}
 }
 const redirect=await fetch(base+'/tra-cuu?q=quoc+tich&trang=2',{redirect:'manual'});assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'/thu-vien?q=quoc+tich&trang=2');
 assert.equal((await fetch(base+'/unknown-public-path')).status,404);assert.equal((await fetch(base+'/chu-de/quoc-tich/99')).status,404);
 console.log('Native public HTTP pages, private noindex, redirects and both indexing modes passed.');
}finally{
 await payload.updateGlobal({slug:'site-settings',overrideAccess:false,user:owner,data:{publicIndexingEnabled:previous.publicIndexingEnabled===true}});
 for(const id of articleIds)await payload.delete({collection:'articles',id,overrideAccess:true});
 await payload.delete({collection:'users',id:owner.id,overrideAccess:true});await pool.end();await payload.destroy();
}

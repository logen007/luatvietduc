import assert from 'node:assert/strict';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import {heroBanner} from '../src/modules/settings/hero-banner';
export async function testHeroBanner(payload:Payload,owner:User){
 const db=new URL(process.env.DATABASE_URL||'');if(db.pathname!=='/lvd_test'||!['127.0.0.1','localhost'].includes(db.hostname))throw new Error('Isolated banner checks only');
 const serverURL=payload.config.serverURL;payload.config.serverURL='https://banner.example.invalid';
 const old=await payload.findGlobal({slug:'site-settings',overrideAccess:true,depth:0});
 const restore={heroVideo:old.heroVideo as number|null,heroMobileVideo:old.heroMobileVideo as number|null,heroPoster:old.heroPoster as number|null},ids:number[]=[];
 const fixture=async(mime:string,visibility='public')=>{const row=(await pool.query('INSERT INTO media(alt,filename,mime_type,visibility) VALUES($1,$2,$3,$4) RETURNING id',['Synthetic banner','banner-'+crypto.randomUUID()+'.'+(mime==='image/webp'?'webp':'mp4'),mime,visibility])).rows[0];ids.push(row.id);return row.id as number;};
 try{
  const main=await fixture('video/mp4'),phone=await fixture('video/webm'),poster=await fixture('image/webp'),privateVideo=await fixture('video/mp4','private');
  const save=(data:Record<string,unknown>,user:User=owner)=>payload.updateGlobal({slug:'site-settings',user,overrideAccess:false,data});
  await save({heroVideo:main,heroMobileVideo:phone,heroPoster:poster});
  const saved=await payload.findGlobal({slug:'site-settings',overrideAccess:true,depth:1}),banner=heroBanner(saved);
  assert.ok(banner.video.includes('banner-'));assert.ok(banner.mobileVideo.includes('banner-'));assert.ok(banner.poster.includes('banner-'));assert.notEqual(banner.video,banner.mobileVideo);
  for(const data of [{heroVideo:privateVideo},{heroVideo:poster},{heroPoster:main},{heroVideo:-1}])await assert.rejects(()=>save(data));
  await assert.rejects(()=>save({heroVideo:main},{...owner,role:'support'}));
  await assert.rejects(()=>save({heroVideo:main},{...owner,role:'member'}));
  await assert.rejects(()=>payload.updateGlobal({slug:'site-settings',overrideAccess:false,data:{heroVideo:main}}));
  await save({heroMobileVideo:null});assert.equal(heroBanner(await payload.findGlobal({slug:'site-settings',overrideAccess:true,depth:1})).mobileVideo,banner.video);
  await pool.query('DELETE FROM media WHERE id=$1',[main]);assert.equal((await payload.findGlobal({slug:'site-settings',overrideAccess:true,depth:0})).heroVideo,null,'Deleting selected media clears the relation instead of breaking the global');
  await save({heroVideo:null,heroMobileVideo:null,heroPoster:null});assert.equal(heroBanner(await payload.findGlobal({slug:'site-settings',overrideAccess:true,depth:1})).video,'/media/legal-hero-stock-v10.mp4');
  console.log('Banner checks passed: persisted settings, typed public media, role isolation, clear/mobile fallback, deletion and rollback-safe relations');
 }finally{
  await payload.updateGlobal({slug:'site-settings',user:owner,overrideAccess:false,data:restore});
  await pool.query('DELETE FROM media WHERE id=ANY($1::int[])',[ids]);
  payload.config.serverURL=serverURL;
 }
}

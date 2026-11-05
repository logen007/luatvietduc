import assert from 'node:assert/strict';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {S3Client} from '@aws-sdk/client-s3';
import {sql} from '@payloadcms/db-postgres';
import {createLocalReq,type Payload} from 'payload';
import type {User} from '../src/payload-types';
import records from '../src/modules/storage/bundled-records.json';
import families from '../src/modules/storage/bundled-families.json';
import {pool} from '../src/modules/shared/db';
import {payloadTransaction} from '../src/modules/shared/payload-transaction';

export async function testMediaFamilies(payload:Payload,owner:User){
 const database=new URL(process.env.DATABASE_URL||'');
 if(!['localhost','127.0.0.1'].includes(database.hostname)||database.pathname!=='/lvd_test')throw new Error('Isolated media-family checks only');
 const names=records.map(record=>record.filename),send=S3Client.prototype.send;let storageCalls=0;
 (S3Client.prototype as any).send=async()=>{storageCalls++;throw new Error('Media-family reads must not call storage');};
 try{
  const raw=(await pool.query('SELECT id,filename,legacy_parent_id FROM media WHERE filename=ANY($1::text[]) ORDER BY id',[names])).rows;
  assert.equal(records.length,43);assert.equal(raw.length,43,'All original media IDs remain in the database');
  const byName=new Map(raw.map(row=>[row.filename,row])),roots=raw.filter(row=>row.legacy_parent_id===null),aliases=raw.filter(row=>row.legacy_parent_id!==null);
  assert.equal(roots.length,26);assert.equal(aliases.length,17);
  const where={filename:{in:names}},listed=await payload.find({collection:'media',user:owner,overrideAccess:false,where,depth:0,limit:100,pagination:false});
  assert.equal(listed.totalDocs,26);assert.equal(listed.docs.length,26);
  assert.deepEqual(listed.docs.map(doc=>doc.id).sort((a,b)=>a-b),roots.map(row=>row.id).sort((a,b)=>a-b));
  assert.equal((await payload.count({collection:'media',user:owner,overrideAccess:false,where})).totalDocs,26);
  const picker=await payload.find({collection:'media',user:owner,overrideAccess:false,where,depth:0,limit:10,page:1});
  assert.equal(picker.totalDocs,26,'Native picker pagination counts families, not aliases');
  assert.equal((await payload.find({collection:'media',user:owner,overrideAccess:false,where:{id:{in:aliases.map(row=>row.id)}},depth:0,limit:100})).totalDocs,0,'A top-level ID list cannot reintroduce aliases');

  const repo=path.resolve(import.meta.dirname,'../../..');
  for(const record of records){
   const row=byName.get(record.filename);assert.ok(row);
   const doc=await payload.findByID({collection:'media',id:row.id,user:owner,overrideAccess:false,depth:0});
   assert.equal(doc.id,row.id);assert.equal(doc.filename,record.filename);assert.equal(doc.url,record.url);
   assert.equal(doc.filesize,record.filesize);assert.equal(doc.mimeType,record.mimeType);
   const source=record.url.startsWith('/assets/')?path.join(repo,record.url.slice(1)):path.join(repo,'apps/cms/public',record.url.slice(1));
   assert.equal((await stat(source)).size,record.filesize,'The original static file remains intact: '+record.url);
  }
  for(const family of families){
   const row=byName.get(family.primary.filename);assert.ok(row);
   const doc=await payload.findByID({collection:'media',id:row.id,user:owner,overrideAccess:false,depth:0});
   for(const key of ['filename','url','width','height','filesize','mimeType'] as const)assert.equal(doc[key],family.primary[key],'Master metadata: '+family.primary.filename+' '+key);
   for(const [name,size] of Object.entries(family.sizes)){
    if(!size)continue;
    assert.equal(byName.get(size.filename)?.legacy_parent_id,row.id);
    for(const key of ['filename','url','width','height','filesize','mimeType'] as const)assert.equal((doc.sizes as any)?.[name]?.[key],size[key],'Size metadata: '+name+' '+key);
   }
  }

  // Simulate an existing Settings.logo reference without publishing a global
  // change. Native population must still resolve an old child ID, then rollback.
  const child=aliases[0],tx=await payload.db.beginTransaction();assert.ok(tx);
  try{
   const req=await createLocalReq({user:owner},payload);req.transactionID=tx;
   const db=await payloadTransaction(req),setting=(await db.execute(sql`SELECT id FROM site_settings ORDER BY id LIMIT 1 FOR UPDATE`)).rows[0];
   if(setting)await db.execute(sql`UPDATE site_settings SET logo_id=${child.id} WHERE id=${Number(setting.id)}`);
   else await db.execute(sql`INSERT INTO site_settings(logo_id) VALUES(${child.id})`);
   const settings=await payload.findGlobal({slug:'site-settings',user:owner,overrideAccess:false,depth:1,req});
   assert.ok(settings.logo&&typeof settings.logo==='object','Settings.logo populates the historical alias instead of leaving a bare ID');
   assert.equal(settings.logo.id,child.id);assert.equal(settings.logo.url,records.find(record=>record.filename===child.filename)?.url);
  }finally{await payload.db.rollbackTransaction(tx);}
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM media WHERE filename=ANY($1::text[])',[names])).rows[0].n,43);
  assert.equal(storageCalls,0,'Family enumeration and relationship population need no storage connection');
  console.log('Media family checks passed: 43 retained IDs/URLs, 26 roots, 17 direct aliases, picker/count filtering, exact master/size metadata and nested Settings.logo alias population; no storage calls');
 }finally{S3Client.prototype.send=send;}
}

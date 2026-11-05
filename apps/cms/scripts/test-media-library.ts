import assert from 'node:assert/strict';
import {S3Client} from '@aws-sdk/client-s3';
import type {Payload} from 'payload';
import type {User} from '../src/payload-types';
import {pool} from '../src/modules/shared/db';
import {seal} from '../src/modules/integrations/crypto';
import {bundledNames} from '../src/modules/storage/bundled';
export async function testMediaLibrary(payload:Payload,owner:User){
 const db=new URL(process.env.DATABASE_URL||'');if(db.pathname!=='/lvd_test'||!['127.0.0.1','localhost'].includes(db.hostname))throw new Error('Isolated media checks only');
 const send=S3Client.prototype.send,ids:number[]=[],suffix=crypto.randomUUID();let uploads=0;
 (S3Client.prototype as any).send=async function(command:any){if(command.constructor.name==='PutObjectCommand')uploads++;return {};};
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#333"/></svg>';
 const file=(name:string,body=svg)=>({name,mimetype:'image/svg+xml',data:Buffer.from(body),size:Buffer.byteLength(body)});
 try{
  await pool.query("INSERT INTO lvd_integrations(provider,encrypted_values,enabled,check_state) VALUES('r2',$1,true,'passed')",[seal('r2',{endpoint:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',bucket:'synthetic-media',accessKeyId:'synthetic-only',secretAccessKey:'synthetic-only'})]);
  for(const index of [1,2]){const doc=await payload.create({collection:'media',user:owner,overrideAccess:false,file:file('synthetic-'+suffix+'-'+index+'.svg'),data:{alt:'Synthetic media '+index,visibility:'private'}});ids.push(doc.id);assert.equal(doc.mimeType,'image/svg+xml');}
  assert.equal(uploads,2,'Safe SVG reaches only the fake storage adapter');
  await assert.rejects(()=>payload.create({collection:'media',user:owner,overrideAccess:false,file:file('unsafe-'+suffix+'.svg','<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),data:{alt:'Rejected active SVG'}}));
  assert.equal(uploads,2,'Active SVG never reaches storage');
  const updated=await payload.update({collection:'media',user:owner,overrideAccess:false,where:{id:{in:ids}},data:{alt:'Bulk synthetic edit',visibility:'public'}});assert.equal(updated.docs.length,2);assert.equal(updated.errors.length,0);
  for(const id of ids){const doc=await payload.findByID({collection:'media',id,user:owner,overrideAccess:false});assert.equal(doc.alt,'Bulk synthetic edit');assert.equal(doc.visibility,'public');}
  const bundled=(await payload.find({collection:'media',user:owner,overrideAccess:false,where:{filename:{in:bundledNames}},limit:1})).docs[0];assert.ok(bundled);
  await assert.rejects(()=>payload.update({collection:'media',id:bundled.id,user:owner,overrideAccess:false,data:{alt:'Cannot overwrite interface asset'}}));
  await assert.rejects(()=>payload.delete({collection:'media',id:bundled.id,user:owner,overrideAccess:false}));
  const deleted=await payload.delete({collection:'media',user:owner,overrideAccess:false,where:{id:{in:ids}}});assert.equal(deleted.docs.length,2);assert.equal(deleted.errors.length,0);ids.length=0;
  console.log('Media library checks passed: safe SVG upload, active SVG rejection before storage, native bulk edit/delete and protected interface assets. No external storage calls.');
 }finally{
  for(const id of ids)await payload.delete({collection:'media',id,user:owner,overrideAccess:false});
  S3Client.prototype.send=send;await pool.query("DELETE FROM lvd_integrations WHERE provider='r2'");
 }
}

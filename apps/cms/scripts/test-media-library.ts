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
  const edited=await payload.update({collection:'media',id:bundled.id,user:owner,overrideAccess:false,data:{title:'Interface metadata test',alt:'Accessible interface asset',caption:'Caption',description:'Description'}});assert.equal(edited.alt,'Accessible interface asset');assert.equal(uploads,2,'Editing bundled metadata never uploads or replaces a file');
  const renamed=await payload.update({collection:'media',id:bundled.id,user:owner,overrideAccess:false,data:{filename:'changed.svg'}});assert.equal(renamed.filename,bundled.filename,'Native upload fields ignore forged filename changes');
  await assert.rejects(()=>payload.update({collection:'media',id:bundled.id,user:owner,overrideAccess:false,data:{visibility:'private'}}));
  await assert.rejects(()=>payload.update({collection:'media',id:bundled.id,user:owner,overrideAccess:false,file:file('replacement.svg'),data:{alt:'Blocked replacement'}}));
  await assert.rejects(()=>payload.update({collection:'media',id:bundled.id,user:owner,overrideAccess:false,data:{title:'Stale',updatedAt:bundled.updatedAt}}));
  await payload.update({collection:'media',id:bundled.id,user:owner,overrideAccess:false,data:{title:bundled.title,alt:bundled.alt||'',caption:bundled.caption||'',description:bundled.description||''}});
  await assert.rejects(()=>payload.delete({collection:'media',id:bundled.id,user:owner,overrideAccess:false}));
  const specialist=await payload.create({collection:'users',user:owner,overrideAccess:false,data:{name:'Synthetic uploader',email:'media-'+suffix+'@example.invalid',password:crypto.randomUUID(),role:'support',jurisdictions:['VN']}});
  try{
   const own=await payload.create({collection:'media',user:specialist,overrideAccess:false,file:file('own-'+suffix+'.svg'),data:{title:'Own media',uploadedBy:owner.id}});ids.push(own.id);assert.equal(typeof own.uploadedBy==='object'?own.uploadedBy?.id:own.uploadedBy,specialist.id,'Uploader identity is server assigned');
   await payload.update({collection:'media',id:own.id,user:specialist,overrideAccess:false,data:{caption:'Own caption'}});
   await assert.rejects(()=>payload.update({collection:'media',id:ids[0],user:specialist,overrideAccess:false,data:{caption:'Forbidden'}}));
   await assert.rejects(()=>payload.delete({collection:'media',id:bundled.id,user:specialist,overrideAccess:false}));
   await payload.delete({collection:'media',id:own.id,user:specialist,overrideAccess:false});ids.pop();
  }finally{await payload.delete({collection:'users',id:specialist.id,user:owner,overrideAccess:false});}
  const deleted=await payload.delete({collection:'media',user:owner,overrideAccess:false,where:{id:{in:ids}}});assert.equal(deleted.docs.length,2);assert.equal(deleted.errors.length,0);ids.length=0;
  console.log('Media library checks passed: safe SVG upload, active SVG rejection before storage, native bulk edit/delete and protected interface assets. No external storage calls.');
 }finally{
  for(const id of ids)await payload.delete({collection:'media',id,user:owner,overrideAccess:false});
  S3Client.prototype.send=send;await pool.query("DELETE FROM lvd_integrations WHERE provider='r2'");
 }
}
